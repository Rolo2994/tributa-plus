import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Toast from '../components/Toast.jsx'
import Paginador from '../components/Paginador.jsx'
import { usePaginacion } from '../utils/usePaginacion.js'
import {
  ejecutarFichaRuc, consultarEstadoFichaRuc, cancelarFichaRuc, listarFichasRuc,
  descargarFichaRuc, borrarFichaRuc, quitarBloqueoFichaRuc,
} from '../services/fichaRucApi.js'
import { descargarBlob } from '../utils/carpetaPc.js'

// ── Constantes ──────────────────────────────────────────────────────
const INTERVALO_ESTADO_MS = 2500
const MAX_FALLOS_RED = 6
const CLAVE_TAREA = 'tributaplus_ficha_tarea'
const CLAVE_CORREO = 'tributaplus_ficha_correo'
const CLAVE_PAUSA = 'tributaplus_ficha_pausa'
const FILAS_RUC_VISIBLES = 8

const ACCIONES = [
  { valor: 'ficha', texto: 'Ficha RUC', detalle: 'Guarda el PDF' },
  { valor: 'reporte', texto: 'Reporte tributario', detalle: 'Envía al correo' },
  { valor: 'ambos', texto: 'Ambos', detalle: 'Ficha y reporte' },
]
const PAUSAS = [
  { valor: 60, texto: '1 minuto' },
  { valor: 120, texto: '2 minutos (recomendado)' },
  { valor: 180, texto: '3 minutos' },
  { valor: 300, texto: '5 minutos' },
  { valor: 600, texto: '10 minutos' },
]

const ruc11 = (v) => String(v ?? '').replace(/\D/g, '').slice(0, 11)
function leer(clave, porDefecto) {
  try { return localStorage.getItem(clave) || porDefecto } catch { return porDefecto }
}
function guardar(clave, valor) {
  try { localStorage.setItem(clave, valor) } catch { /* sin almacenamiento: no pasa nada */ }
}
function minutosTexto(segundos) {
  const m = Math.max(1, Math.ceil((segundos || 0) / 60))
  return `${m} minuto${m === 1 ? '' : 's'}`
}
function fechaCorta(iso) {
  const [a, m, d] = String(iso || '').split('-')
  return a && m && d ? `${d}/${m}/${a}` : iso
}

// ── Piezas visuales (mismo estilo que las otras pantallas) ──────────
function Encabezado({ onVolver }) {
  return (
    <div className="flex items-center gap-2.5 px-4 md:px-8 pt-3.5 pb-1.5">
      <button onClick={onVolver} className="w-8 h-8 rounded-[9px] bg-white border border-bordersoft flex items-center justify-center flex-shrink-0" aria-label="Volver">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M15 6l-6 6 6 6" stroke="#0B3A60" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
      <div className="font-display font-bold text-[15px]">Ficha RUC y Reporte Tributario</div>
    </div>
  )
}

function Tarjeta({ numero, titulo, children, className = '', derecha = null }) {
  return (
    <div className={`bg-white rounded-xl border border-[#F0F3F7] shadow-card p-3.5 ${className}`}>
      <div className="flex items-center gap-2 mb-2.5">
        {numero && <span className="w-5 h-5 rounded-full bg-azul-inst text-white text-[10.5px] font-bold flex items-center justify-center flex-shrink-0">{numero}</span>}
        <div className="text-[12px] font-bold text-ink flex-1">{titulo}</div>
        {derecha}
      </div>
      {children}
    </div>
  )
}

const CLASE_CAMPO = 'w-full h-10 text-[12.5px] text-ink px-2.5 rounded-lg border border-bordersoft bg-white focus:border-azul-inst disabled:opacity-70'
const CLASE_MINI = 'text-[11px] font-semibold text-azul-inst bg-[#EAF1FA] border border-[#C9D6E4] px-2.5 py-1.5 rounded-lg disabled:opacity-60'

// Estado de una acción (ficha o reporte) de un RUC → etiqueta de color.
function Etiqueta({ valor }) {
  const v = String(valor || '')
  let clase = 'bg-[#F1F4F8] text-muted'
  let texto = '—'
  if (v === 'OK') { clase = 'bg-[#EAF6EF] text-verde'; texto = 'Listo' }
  else if (v === 'pendiente') { clase = 'bg-[#EAF1FA] text-azul-inst'; texto = 'Pendiente' }
  else if (v.startsWith('OMITIDO')) { clase = 'bg-[#FFF6DB] text-[#8A6A00]'; texto = 'Omitido' }
  else if (v.startsWith('BLOQUEO')) { clase = 'bg-[#FCE9EB] text-rojo-sunat'; texto = 'Bloqueo SUNAT' }
  else if (v.startsWith('ERROR')) { clase = 'bg-[#FCE9EB] text-rojo-sunat'; texto = 'Error' }
  else if (v === 'CANCELADO') { texto = 'Cancelado' }
  return <span className={`inline-block text-[10.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${clase}`}>{texto}</span>
}

// Texto explicativo de una fila (solo si hay algo que explicar).
function notaFila(f) {
  const partes = []
  if (String(f.ficha).startsWith('ERROR') || String(f.ficha).startsWith('OMITIDO')) partes.push(`Ficha: ${f.ficha}`)
  if (String(f.reporte).startsWith('ERROR') || String(f.reporte).startsWith('OMITIDO') || String(f.reporte).startsWith('BLOQUEO')) partes.push(`Reporte: ${f.reporte}`)
  if (f.reporte === 'OK' && f.intentos > 1) partes.push(`Reporte enviado al intento ${f.intentos} (el captcha se colgó antes)`)
  if (f.reporte === 'OK' && f.nota) partes.push(f.nota)
  return partes.join(' · ')
}

// ── Pantalla ────────────────────────────────────────────────────────
export default function FichaRucScreen() {
  const { rucs, activeRuc, goScreen, pushLog } = useApp()

  const [seleccion, setSeleccion] = useState(() => new Set(activeRuc?.ruc ? [activeRuc.ruc] : []))
  const [buscar, setBuscar] = useState('')
  const [accion, setAccion] = useState('ficha')
  const [correo, setCorreo] = useState(() => leer(CLAVE_CORREO, ''))
  const [pausa, setPausa] = useState(() => Number(leer(CLAVE_PAUSA, '120')) || 120)

  const [fase, setFase] = useState('edicion') // edicion | ejecutando | terminado
  const [tarea, setTarea] = useState(null)
  const [errorGeneral, setErrorGeneral] = useState('')
  const [cancelando, setCancelando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [toast, setToast] = useState('')
  const cerrarToast = useCallback(() => setToast(''), [])

  const [info, setInfo] = useState(null) // respuesta de /ficha-ruc/archivos
  const [filtroFichas, setFiltroFichas] = useState('')
  const [accionArchivo, setAccionArchivo] = useState('') // nombre del archivo en descarga/borrado

  const tareaIdRef = useRef(null)
  const timerRef = useRef(null)
  const vivoRef = useRef(true)
  const fallosRedRef = useRef(0)
  const ultimoLogRef = useRef(0)

  const recargarFichas = useCallback(async () => {
    try {
      const r = await listarFichasRuc()
      if (vivoRef.current && r.ok) setInfo(r)
    } catch { /* se reintenta al volver a entrar */ }
  }, [])

  useEffect(() => {
    vivoRef.current = true
    recargarFichas()
    return () => {
      vivoRef.current = false
      clearTimeout(timerRef.current)
    }
  }, [recargarFichas])

  useEffect(() => {
    if (fase !== 'ejecutando') return undefined
    const inicio = Date.now()
    setSegundos(0)
    const t = setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 1000)
    return () => clearInterval(t)
  }, [fase])

  const reporteDisponible = info ? info.reporte_disponible : true
  const bloqueo = info?.bloqueo || null
  const reportesHoy = info?.reportes_hoy || {}
  const limiteDia = info?.limite_dia || 3
  const bloqueada = fase !== 'edicion'
  const usaReporte = accion === 'reporte' || accion === 'ambos'
  const correoValido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo.trim())

  // Pasa al log de la app solo las líneas nuevas del servidor.
  function pasarLog(lineas, totalLog) {
    const lista = lineas || []
    const total = totalLog ?? lista.length
    const nuevas = total > ultimoLogRef.current ? lista.slice(Math.max(0, lista.length - (total - ultimoLogRef.current))) : []
    ultimoLogRef.current = total
    nuevas.forEach((l) => pushLog(`Ficha RUC: ${l}`))
  }

  async function vigilar(id) {
    if (!vivoRef.current) return
    try {
      const est = await consultarEstadoFichaRuc(id)
      if (!vivoRef.current) return
      fallosRedRef.current = 0
      if (!est.ok) {
        try { sessionStorage.removeItem(CLAVE_TAREA) } catch { /* nada */ }
        setErrorGeneral(est.error || 'El servidor ya no recuerda esta tarea. Vuelve a ejecutarla.')
        setFase(tarea ? 'terminado' : 'edicion')
        return
      }
      setTarea(est)
      setFase('ejecutando')
      pasarLog(est.log, est.log_total)
      if (est.estado === 'completado' || est.estado === 'error') {
        try { sessionStorage.removeItem(CLAVE_TAREA) } catch { /* nada */ }
        if (est.estado === 'error') setErrorGeneral(est.mensaje || 'El proceso falló.')
        setFase('terminado')
        recargarFichas()
        return
      }
    } catch {
      fallosRedRef.current += 1
      if (fallosRedRef.current >= MAX_FALLOS_RED) {
        setErrorGeneral('Se perdió la conexión con el servidor. Revisa tu internet; el proceso puede seguir en el servidor (vuelve a entrar a esta pantalla para retomarlo).')
        setFase('terminado')
        return
      }
    }
    timerRef.current = setTimeout(() => vigilar(id), INTERVALO_ESTADO_MS)
  }

  // Si la pantalla se cerró con un lote en marcha (las pausas duran minutos), se retoma.
  useEffect(() => {
    let id = ''
    try { id = sessionStorage.getItem(CLAVE_TAREA) || '' } catch { /* nada */ }
    if (id) {
      tareaIdRef.current = id
      vigilar(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const listaRucs = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    return (rucs || []).filter((r) => !q || String(r.ruc).toLowerCase().includes(q) || String(r.razonSocial || '').toLowerCase().includes(q))
  }, [rucs, buscar])

  function alternar(ruc) {
    setSeleccion((prev) => {
      const n = new Set(prev)
      if (n.has(ruc)) n.delete(ruc)
      else n.add(ruc)
      return n
    })
  }
  const elegirVisibles = () => setSeleccion((prev) => new Set([...prev, ...listaRucs.map((r) => r.ruc)]))
  const quitarTodos = () => setSeleccion(new Set())

  async function ejecutar() {
    setErrorGeneral('')
    if (seleccion.size === 0) { setErrorGeneral('Elige al menos un RUC.'); return }
    if (usaReporte && !correoValido) { setErrorGeneral('Escribe un correo válido para el Reporte.'); return }
    guardar(CLAVE_CORREO, correo.trim())
    guardar(CLAVE_PAUSA, String(pausa))
    setCancelando(false)
    ultimoLogRef.current = 0
    setTarea({ estado: 'en_cola', total: seleccion.size, procesados: 0, fase_texto: 'En cola', resultados: [] })
    setFase('ejecutando')
    try {
      const res = await ejecutarFichaRuc({ rucs: [...seleccion], accion, correo: correo.trim(), pausa_s: pausa })
      if (!res.ok) {
        setErrorGeneral(res.error || 'No se pudo iniciar.')
        setTarea(null)
        setFase('edicion')
        recargarFichas()
        return
      }
      tareaIdRef.current = res.tarea_id
      try { sessionStorage.setItem(CLAVE_TAREA, res.tarea_id) } catch { /* nada */ }
      fallosRedRef.current = 0
      pushLog(`Ficha RUC: procesando ${res.total} RUC(s)…`)
      vigilar(res.tarea_id)
    } catch (err) {
      setErrorGeneral(`No se pudo conectar con el servidor: ${err?.message || err}`)
      setTarea(null)
      setFase('edicion')
    }
  }

  async function cancelar() {
    if (!tareaIdRef.current) return
    setCancelando(true)
    try {
      await cancelarFichaRuc(tareaIdRef.current)
      pushLog('⚠ Ficha RUC: cancelación solicitada. Termina el paso en curso.')
    } catch {
      setCancelando(false)
    }
  }

  function nuevoProceso() {
    tareaIdRef.current = null
    try { sessionStorage.removeItem(CLAVE_TAREA) } catch { /* nada */ }
    setFase('edicion')
    setTarea(null)
    setErrorGeneral('')
    setCancelando(false)
    recargarFichas()
  }

  async function bajar(nombre) {
    setAccionArchivo(nombre)
    try {
      const blob = await descargarFichaRuc(nombre)
      descargarBlob(blob, nombre)
      setToast(`Descargado: ${nombre}`)
    } catch (err) {
      setToast(`No se pudo descargar: ${err?.message || err}`)
    } finally {
      setAccionArchivo('')
    }
  }

  async function borrar(nombre) {
    if (!window.confirm(`¿Borrar "${nombre}" del servidor?`)) return
    setAccionArchivo(nombre)
    try {
      const r = await borrarFichaRuc(nombre)
      setToast(r.ok ? 'Ficha borrada' : (r.error || 'No se pudo borrar'))
      recargarFichas()
    } catch (err) {
      setToast(`No se pudo borrar: ${err?.message || err}`)
    } finally {
      setAccionArchivo('')
    }
  }

  async function quitarBloqueo() {
    try {
      await quitarBloqueoFichaRuc()
      recargarFichas()
    } catch (err) {
      setToast(`No se pudo quitar el aviso: ${err?.message || err}`)
    }
  }

  // Fichas guardadas: filtro + paginación
  const fichasFiltradas = useMemo(() => {
    const q = filtroFichas.trim().toLowerCase()
    return (info?.archivos || []).filter((a) => !q || a.nombre.toLowerCase().includes(q))
  }, [info, filtroFichas])
  const pag = usePaginacion(fichasFiltradas.length, 20, 'fichas_ruc')
  const fichasPagina = fichasFiltradas.slice(pag.desde, pag.hasta)

  const total = tarea?.total || 0
  const procesados = tarea?.procesados || 0
  const porcentaje = fase === 'terminado' ? 100 : total ? Math.round((procesados / total) * 100) : 0
  const filas = tarea?.resultados || []
  const hayProblemas = filas.some((f) => /^(ERROR|BLOQUEO)/.test(String(f.ficha)) || /^(ERROR|BLOQUEO)/.test(String(f.reporte)))

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <Toast message={toast} onDone={cerrarToast} />
      <Encabezado onVolver={() => goScreen('inicio')} />

      <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-2 pb-6">
        <div className="max-w-[1000px] mx-auto">
          {errorGeneral && (
            <div className="mb-3 bg-[#FCE9EB] text-rojo-sunat text-[11.5px] rounded-xl px-3 py-2.5 font-semibold">{errorGeneral}</div>
          )}

          {bloqueo && (
            <div className="mb-3 bg-[#FFF6DB] text-[#8A6A00] text-[11.5px] rounded-xl px-3 py-2.5 flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[200px]">
                <span className="font-bold">SUNAT bloqueó los envíos hace poco.</span> No se enviarán reportes durante {minutosTexto(bloqueo.restante_s)} más
                (la Ficha RUC sí se puede bajar). Motivo: {bloqueo.motivo || 'sin detalle'}
              </div>
              <button onClick={quitarBloqueo} className="text-[11px] font-bold text-[#8A6A00] bg-white border border-[#E8D9A0] px-2.5 py-1.5 rounded-lg">Quitar aviso</button>
            </div>
          )}

          {info && !reporteDisponible && (
            <div className="mb-3 bg-[#FFF6DB] text-[#8A6A00] text-[11.5px] rounded-xl px-3 py-2.5">
              <span className="font-bold">El Reporte Tributario aún no está activo en el servidor.</span> {info.reporte_motivo} La Ficha RUC funciona normal.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <Tarjeta
              numero="1"
              titulo={`RUCs (${seleccion.size} elegido${seleccion.size === 1 ? '' : 's'})`}
              derecha={(
                <div className="flex gap-1.5">
                  <button type="button" disabled={bloqueada} onClick={elegirVisibles} className={CLASE_MINI}>Todos</button>
                  <button type="button" disabled={bloqueada} onClick={quitarTodos} className={CLASE_MINI}>Ninguno</button>
                </div>
              )}
            >
              <input
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                placeholder="Buscar por RUC o razón social…"
                disabled={bloqueada}
                className={`${CLASE_CAMPO} mb-2`}
              />
              <div className="border border-bordersoft rounded-lg overflow-y-auto" style={{ maxHeight: FILAS_RUC_VISIBLES * 38 }}>
                {listaRucs.length === 0 && <div className="text-[11.5px] text-muted text-center py-4">Ningún RUC coincide.</div>}
                {listaRucs.map((r) => {
                  const marcado = seleccion.has(r.ruc)
                  const hoy = reportesHoy[ruc11(r.ruc)] || 0
                  return (
                    <label key={r.id ?? r.ruc} className={`flex items-center gap-2.5 px-2.5 h-[38px] border-b border-[#F4F6F9] last:border-b-0 cursor-pointer ${marcado ? 'bg-[#EAF1FA]' : 'bg-white'}`}>
                      <input type="checkbox" checked={marcado} disabled={bloqueada} onChange={() => alternar(r.ruc)} className="w-4 h-4 flex-shrink-0" />
                      <span className="font-mono text-[11px] text-muted flex-shrink-0">{r.ruc}</span>
                      <span className="text-[11.5px] text-ink truncate flex-1">{r.razonSocial}</span>
                      {hoy > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${hoy >= limiteDia ? 'bg-[#FCE9EB] text-rojo-sunat' : 'bg-[#F1F4F8] text-muted'}`} title="Reportes enviados hoy a este RUC">
                          {hoy}/{limiteDia}
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
              <p className="text-[10.5px] text-muted mt-2">Usa la clave SOL de tu hoja de cálculo (USUARIO y CLAVE de cada RUC).</p>
            </Tarjeta>

            <Tarjeta numero="2" titulo="Qué hacer">
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {ACCIONES.map((a) => {
                  const activo = accion === a.valor
                  return (
                    <button
                      key={a.valor}
                      type="button"
                      disabled={bloqueada}
                      onClick={() => setAccion(a.valor)}
                      className={`h-[52px] rounded-lg border text-center px-1 disabled:opacity-70 ${activo ? 'bg-azul-dark text-white border-azul-dark' : 'bg-white text-ink border-bordersoft'}`}
                    >
                      <div className="text-[11.5px] font-bold leading-tight">{a.texto}</div>
                      <div className={`text-[9.5px] leading-tight ${activo ? 'opacity-90' : 'text-muted'}`}>{a.detalle}</div>
                    </button>
                  )
                })}
              </div>

              {usaReporte ? (
                <>
                  <label className="block text-[10.5px] font-semibold text-muted mb-1">Correo donde SUNAT enviará el reporte</label>
                  <input
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    disabled={bloqueada}
                    className={`${CLASE_CAMPO} mb-2.5`}
                  />
                  <label className="block text-[10.5px] font-semibold text-muted mb-1">Pausa entre un RUC y el siguiente</label>
                  <select value={pausa} onChange={(e) => setPausa(Number(e.target.value))} disabled={bloqueada} className={CLASE_CAMPO}>
                    {PAUSAS.map((p) => <option key={p.valor} value={p.valor}>{p.texto}</option>)}
                  </select>
                  <p className="text-[10.5px] text-muted mt-2">
                    SUNAT limita a {limiteDia} reportes por día por RUC y bloquea de forma temporal si se piden muchos seguidos.
                    La pausa se varía un poco al azar. Si el captcha se cuelga, el envío se reinicia solo (hasta 3 intentos).
                  </p>
                </>
              ) : (
                <p className="text-[10.5px] text-muted">
                  Se guarda un PDF por RUC en la carpeta de fichas del servidor. Si ya existe la ficha de hoy, se reemplaza; las de otros días se conservan.
                </p>
              )}
            </Tarjeta>
          </div>

          {fase !== 'edicion' && filas.length > 0 && (
            <Tarjeta titulo={`Avance por RUC (${procesados} de ${total})`} className="mb-3">
              <div className="overflow-x-auto border border-bordersoft rounded-xl">
                <table className="w-full border-collapse text-[11.5px]">
                  <thead>
                    <tr className="bg-[#F7F9FB]">
                      <th className="h-8 px-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted">RUC</th>
                      <th className="h-8 px-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted">Razón social</th>
                      <th className="h-8 px-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted">Ficha</th>
                      <th className="h-8 px-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted">Reporte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f) => {
                      const nota = notaFila(f)
                      return (
                        <React.Fragment key={f.ruc}>
                          <tr className="h-9 border-t border-[#F0F3F7]">
                            <td className="px-2.5 font-mono text-muted whitespace-nowrap">{f.ruc}</td>
                            <td className="px-2.5 text-ink">{f.razon}</td>
                            <td className="px-2.5"><Etiqueta valor={f.ficha} /></td>
                            <td className="px-2.5"><Etiqueta valor={f.reporte} /></td>
                          </tr>
                          {nota && (
                            <tr>
                              <td colSpan={4} className="px-2.5 pb-2 text-[10.5px] text-muted">{nota}</td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {tarea?.log?.length > 0 && (
                <details className="mt-2.5">
                  <summary className="text-[11px] font-semibold text-azul-inst cursor-pointer">Ver registro técnico (lo que hizo el servidor)</summary>
                  <pre className="mt-2 max-h-[220px] overflow-auto text-[10.5px] leading-snug bg-[#F7F9FB] border border-bordersoft rounded-lg p-2.5 whitespace-pre-wrap">{tarea.log.join('\n')}</pre>
                </details>
              )}
            </Tarjeta>
          )}

          <Tarjeta
            titulo={`Fichas guardadas en el servidor (${info?.archivos?.length ?? 0})`}
            derecha={<button type="button" onClick={recargarFichas} className={CLASE_MINI}>Actualizar</button>}
          >
            <input
              value={filtroFichas}
              onChange={(e) => setFiltroFichas(e.target.value)}
              placeholder="Filtrar por nombre…"
              className={`${CLASE_CAMPO} mb-2`}
            />
            {fichasFiltradas.length === 0 ? (
              <div className="text-[11.5px] text-muted text-center py-4">
                {info ? 'Todavía no hay fichas guardadas.' : 'Cargando…'}
              </div>
            ) : (
              <div className="border border-bordersoft rounded-xl overflow-hidden">
                {fichasPagina.map((a) => (
                  <div key={a.nombre} className="flex items-center gap-2 px-2.5 min-h-[44px] py-1.5 border-b border-[#F4F6F9] last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-[11.5px] text-ink truncate" title={a.nombre}>{a.razon}</div>
                      <div className="text-[10px] text-muted">
                        {fechaCorta(a.fecha)} · {a.kb} KB {a.hoy && <span className="font-bold text-verde">· de hoy</span>}
                      </div>
                    </div>
                    <button type="button" disabled={accionArchivo === a.nombre} onClick={() => bajar(a.nombre)} className="text-[11px] font-bold text-white bg-azul-dark px-3 py-1.5 rounded-lg disabled:opacity-60">
                      {accionArchivo === a.nombre ? '…' : 'Descargar'}
                    </button>
                    <button type="button" disabled={accionArchivo === a.nombre} onClick={() => borrar(a.nombre)} className="text-[11px] font-bold text-rojo-sunat bg-[#FCE9EB] px-2.5 py-1.5 rounded-lg disabled:opacity-60" aria-label="Borrar ficha">
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}
            {fichasFiltradas.length > 0 && <Paginador total={fichasFiltradas.length} pag={pag} />}
          </Tarjeta>

          {info?.historial?.length > 0 && (
            <details className="bg-white rounded-xl border border-[#F0F3F7] shadow-card px-3.5 py-3 mt-3">
              <summary className="text-[12px] font-bold text-ink cursor-pointer">Últimos envíos de reporte ({info.historial.length})</summary>
              <div className="mt-2 border border-bordersoft rounded-xl overflow-x-auto">
                <table className="w-full border-collapse text-[11px]">
                  <tbody>
                    {info.historial.map((h, i) => (
                      <tr key={`${h.fecha}-${h.ruc}-${i}`} className="border-b border-[#F4F6F9] last:border-b-0 align-top">
                        <td className="px-2.5 py-1.5 whitespace-nowrap text-muted">{h.fecha}</td>
                        <td className="px-2.5 py-1.5 text-ink">{h.razon}</td>
                        <td className="px-2.5 py-1.5"><span className={`font-bold ${h.ok ? 'text-verde' : 'text-rojo-sunat'}`}>{h.ok ? 'Enviado' : 'No enviado'}</span></td>
                        <td className="px-2.5 py-1.5 text-muted">{h.detalle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>
      </div>

      {/* Barra de acción / progreso */}
      <div className="border-t border-bordersoft bg-white px-4 md:px-8 py-3">
        <div className="max-w-[1000px] mx-auto">
          {fase === 'edicion' ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 text-[11.5px] text-muted">
                {seleccion.size === 0 ? 'Elige al menos un RUC.' : `Listo para procesar ${seleccion.size} RUC(s).`}
              </div>
              <button
                onClick={ejecutar}
                disabled={seleccion.size === 0 || (usaReporte && (!reporteDisponible || !!bloqueo))}
                className="bg-azul-dark disabled:opacity-60 text-white text-[13px] font-bold px-8 py-3 rounded-2xl shadow-float"
              >
                ▶ Ejecutar
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="text-[12px] font-bold text-ink">
                  {fase === 'terminado'
                    ? (errorGeneral ? 'El proceso se detuvo' : tarea?.cancelado ? 'Proceso cancelado' : hayProblemas ? 'Terminado, con avisos' : 'Terminado')
                    : (tarea?.fase_texto || 'Trabajando…')}
                  {fase === 'ejecutando' && <span className="font-normal text-muted"> · {segundos} s</span>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-[11px] text-muted">{procesados}/{total} RUC(s)</div>
                  {fase === 'ejecutando' && (
                    <button onClick={cancelar} disabled={cancelando} className="text-[11.5px] font-bold text-white bg-rojo-sunat px-3 py-1.5 rounded-lg disabled:opacity-60">
                      {cancelando ? 'Cancelando…' : '✕ Cancelar'}
                    </button>
                  )}
                </div>
              </div>
              <div className="h-2 rounded-full bg-[#EAF1FA] overflow-hidden mb-2">
                <div
                  className={`h-2 rounded-full transition-all ${fase === 'terminado' && (hayProblemas || errorGeneral) ? 'bg-ambar' : 'bg-azul-inst'}`}
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
              {fase === 'terminado' && (
                <div className="flex items-center gap-2">
                  <div className="flex-1" />
                  <button onClick={nuevoProceso} className="text-[11.5px] font-bold text-white bg-azul-dark px-4 py-1.5 rounded-lg">Nuevo proceso</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
