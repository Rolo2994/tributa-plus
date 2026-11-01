import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Toast from '../components/Toast.jsx'
import TablaResultados from '../components/TablaResultados.jsx'
import ResumenMensual from '../components/ResumenMensual.jsx'
import {
  ejecutarDetracciones, consultarEstadoDetracciones, cancelarDetracciones,
  obtenerResultadoDetracciones, descargarArchivoDetracciones, borrarTareaDetracciones,
} from '../services/detraccionesApi.js'
import { descargarBlob } from '../utils/carpetaPc.js'

// ── Constantes ──────────────────────────────────────────────────────
const INTERVALO_ESTADO_MS = 2500
const MAX_FALLOS_RED = 6
const MAX_DIAS = 400

const TIPOS_CUENTA = [
  { valor: '1', texto: 'Cuenta de Detracciones Convencional' },
  { valor: '2', texto: 'Cuenta de Detracciones Especial IVAP' },
  { valor: '3', texto: 'Cuenta-Ley N° 30737' },
]
const TIPOS_PAGO = [
  { valor: 'pagosIndividuales', texto: 'Pagos individuales' },
  { valor: 'pagosMasivos', texto: 'Pagos masivos' },
  { valor: 'pagosTransPasajeros', texto: 'Pagos transporte de pasajeros' },
]

// ── Fechas (aaaa-mm-dd, como las usa <input type="date">) ───────────
const dos = (n) => String(n).padStart(2, '0')
const aTexto = (d) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
function rangoMes(desfase) {
  const hoy = new Date()
  const ini = new Date(hoy.getFullYear(), hoy.getMonth() + desfase, 1)
  const fin = new Date(hoy.getFullYear(), hoy.getMonth() + desfase + 1, 0)
  return { fi: aTexto(ini), ff: aTexto(fin) }
}
function rangoAnio(desfase) {
  const a = new Date().getFullYear() + desfase
  return { fi: `${a}-01-01`, ff: `${a}-12-31` }
}
function diasEntre(fi, ff) {
  const a = new Date(`${fi}T00:00:00`)
  const b = new Date(`${ff}T00:00:00`)
  return Math.round((b - a) / 86400000) + 1
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
      <div className="font-display font-bold text-[15px]">Consulta de pago de detracciones</div>
    </div>
  )
}

function Tarjeta({ numero, titulo, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-[#F0F3F7] shadow-card p-3.5 ${className}`}>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="w-5 h-5 rounded-full bg-azul-inst text-white text-[10.5px] font-bold flex items-center justify-center flex-shrink-0">{numero}</span>
        <div className="text-[12px] font-bold text-ink">{titulo}</div>
      </div>
      {children}
    </div>
  )
}

const CLASE_CAMPO = 'w-full h-10 text-[12.5px] text-ink px-2.5 rounded-lg border border-bordersoft bg-white focus:border-azul-inst disabled:opacity-70'
const CLASE_ATAJO = 'text-[11px] font-semibold text-azul-inst bg-[#EAF1FA] border border-[#C9D6E4] px-2.5 py-1.5 rounded-lg disabled:opacity-60'

// ── Pantalla ────────────────────────────────────────────────────────
export default function DetraccionesScreen() {
  const { activeRuc, goScreen, pushLog } = useApp()

  const [cuenta, setCuenta] = useState('1')
  const [pago, setPago] = useState('pagosIndividuales')
  const [rango, setRango] = useState(() => rangoMes(-1))

  const [fase, setFase] = useState('edicion') // edicion | ejecutando | terminado
  const [tarea, setTarea] = useState(null)
  const [resultado, setResultado] = useState(null) // { columnas, filas }
  const [mesFiltro, setMesFiltro] = useState(null) // { anio, mes } elegido en el resumen
  const [errorGeneral, setErrorGeneral] = useState('')
  const [cancelando, setCancelando] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [toast, setToast] = useState('')
  const cerrarToast = useCallback(() => setToast(''), [])

  const tareaIdRef = useRef(null)
  const timerRef = useRef(null)
  const vivoRef = useRef(true)
  const fallosRedRef = useRef(0)
  const ultimoLogRef = useRef(0)

  // Al salir de la pantalla: se deja de preguntar y se borran los temporales del servidor.
  useEffect(() => {
    vivoRef.current = true
    return () => {
      vivoRef.current = false
      clearTimeout(timerRef.current)
      if (tareaIdRef.current) borrarTareaDetracciones(tareaIdRef.current).catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (fase !== 'ejecutando') return undefined
    const avisar = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', avisar)
    const inicio = Date.now()
    setSegundos(0)
    const t = setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 1000)
    return () => {
      window.removeEventListener('beforeunload', avisar)
      clearInterval(t)
    }
  }, [fase])

  const bloqueada = fase !== 'edicion'
  const dias = rango.fi && rango.ff ? diasEntre(rango.fi, rango.ff) : 0
  const bloques = dias > 0 ? Math.ceil(dias / 30) : 0
  const rangoValido = dias > 0 && dias <= MAX_DIAS

  // Pasa al log de la app solo las líneas nuevas del servidor.
  function pasarLog(lineas) {
    const nuevas = (lineas || []).slice(ultimoLogRef.current)
    ultimoLogRef.current = (lineas || []).length
    nuevas.forEach((l) => pushLog(`Detracciones: ${l}`))
  }

  async function terminarConResultado(id, est) {
    try {
      const r = await obtenerResultadoDetracciones(id)
      if (!vivoRef.current) return
      if (!r.ok) throw new Error(r.error || 'No se pudo leer la tabla')
      setResultado({ columnas: r.columnas || [], filas: r.filas || [] })
    } catch (err) {
      setErrorGeneral(`La consulta terminó, pero no se pudo traer la tabla: ${err?.message || err}`)
    }
    if ((est.dudosos || []).length) {
      pushLog(`⚠ Detracciones: rangos sin confirmar (vuelve a consultarlos): ${est.dudosos.join('; ')}`)
    }
    setFase('terminado')
  }

  async function vigilar(id) {
    if (!vivoRef.current) return
    try {
      const est = await consultarEstadoDetracciones(id)
      if (!vivoRef.current) return
      fallosRedRef.current = 0
      if (!est.ok) {
        setErrorGeneral(est.error || 'El servidor ya no recuerda esta consulta. Vuelve a ejecutarla.')
        setFase('terminado')
        return
      }
      setTarea(est)
      pasarLog(est.log)
      if (est.estado === 'completado') {
        await terminarConResultado(id, est)
        return
      }
      if (est.estado === 'error') {
        setErrorGeneral(est.mensaje || 'La consulta falló.')
        setFase('terminado')
        return
      }
    } catch {
      fallosRedRef.current += 1
      if (fallosRedRef.current >= MAX_FALLOS_RED) {
        setErrorGeneral('Se perdió la conexión con el servidor. Revisa tu internet; la consulta puede seguir en el servidor.')
        setFase('terminado')
        return
      }
    }
    timerRef.current = setTimeout(() => vigilar(id), INTERVALO_ESTADO_MS)
  }

  async function ejecutar() {
    setErrorGeneral('')
    if (!activeRuc?.ruc) {
      setErrorGeneral('Elige un RUC activo en la lista de RUCs.')
      return
    }
    if (!rangoValido) {
      setErrorGeneral(dias > MAX_DIAS
        ? `Máximo ${MAX_DIAS} días por consulta (elegiste ${dias}).`
        : 'Revisa las fechas: la inicial debe ser menor o igual a la final.')
      return
    }
    setResultado(null)
    setMesFiltro(null)
    setCancelando(false)
    ultimoLogRef.current = 0
    setTarea({ estado: 'en_cola', total: bloques, procesados: 0, fase_texto: 'En cola' })
    setFase('ejecutando')
    try {
      const res = await ejecutarDetracciones({
        ruc: activeRuc.ruc, cuenta, pago, fecha_inicio: rango.fi, fecha_fin: rango.ff,
      })
      if (!res.ok) {
        setErrorGeneral(res.error || 'No se pudo iniciar la consulta.')
        setTarea(null)
        setFase('edicion')
        return
      }
      tareaIdRef.current = res.tarea_id
      fallosRedRef.current = 0
      pushLog(`Detracciones: consultando ${res.total} bloque(s) de hasta 30 días…`)
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
      await cancelarDetracciones(tareaIdRef.current)
      pushLog('⚠ Detracciones: cancelación solicitada. Se mostrará lo que ya se alcanzó a consultar.')
    } catch {
      setCancelando(false)
    }
  }

  async function descargarExcel() {
    const nombre = tarea?.archivos?.[0]
    if (!nombre || !tareaIdRef.current) {
      setToast('No hay Excel para descargar')
      return
    }
    setDescargando(true)
    try {
      const blob = await descargarArchivoDetracciones(tareaIdRef.current, nombre)
      descargarBlob(blob, nombre)
      setToast(`Descargado: ${nombre}`)
    } catch (err) {
      setToast(`No se pudo descargar: ${err?.message || err}`)
    } finally {
      setDescargando(false)
    }
  }

  function nuevaConsulta() {
    if (tareaIdRef.current) borrarTareaDetracciones(tareaIdRef.current).catch(() => {})
    tareaIdRef.current = null
    setFase('edicion')
    setTarea(null)
    setResultado(null)
    setMesFiltro(null)
    setErrorGeneral('')
    setCancelando(false)
  }

  const total = tarea?.total || 0
  const procesados = tarea?.procesados || 0
  const porcentaje = fase === 'terminado' ? 100 : total ? Math.round((procesados / total) * 100) : 0
  const hayDudosos = (tarea?.dudosos || []).length > 0

  // Filtro por mes (viene del resumen): usa las columnas AÑO y MES de la tabla.
  const filtroMes = useMemo(() => {
    if (!mesFiltro || !resultado) return undefined
    const iAnio = resultado.columnas.indexOf('A\u00d1O')
    const iMes = resultado.columnas.indexOf('MES')
    if (iAnio < 0 || iMes < 0) return undefined
    return {
      condiciones: [{ col: iAnio, valor: String(mesFiltro.anio) }, { col: iMes, valor: String(mesFiltro.mes) }],
      etiqueta: `Mes de pago: ${String(mesFiltro.mes).padStart(2, '0')}/${mesFiltro.anio}`,
    }
  }, [mesFiltro, resultado])

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <Toast message={toast} onDone={cerrarToast} />
      <Encabezado onVolver={() => goScreen('inicio')} />
      <div className="text-[11px] text-muted ml-[42px] md:ml-[62px] -mt-1 mb-1">RUC activo: {activeRuc?.razonSocial || '—'} · {activeRuc?.ruc || ''}</div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-2 pb-6">
        <div className="max-w-[1000px] mx-auto">
          {errorGeneral && (
            <div className="mb-3 bg-[#FCE9EB] text-rojo-sunat text-[11.5px] rounded-xl px-3 py-2.5 font-semibold">{errorGeneral}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <Tarjeta numero="1" titulo="Tipo de cuenta y de pago">
              <label className="block text-[10.5px] font-semibold text-muted mb-1">Tipo de cuenta de detracciones</label>
              <select value={cuenta} onChange={(e) => setCuenta(e.target.value)} disabled={bloqueada} className={`${CLASE_CAMPO} mb-2.5`}>
                {TIPOS_CUENTA.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
              </select>
              <label className="block text-[10.5px] font-semibold text-muted mb-1">Tipo de pago</label>
              <select value={pago} onChange={(e) => setPago(e.target.value)} disabled={bloqueada} className={CLASE_CAMPO}>
                {TIPOS_PAGO.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
              </select>
            </Tarjeta>

            <Tarjeta numero="2" titulo="Rango de fechas">
              <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                <div>
                  <label className="block text-[10.5px] font-semibold text-muted mb-1">Desde</label>
                  <input type="date" value={rango.fi} onChange={(e) => setRango((r) => ({ ...r, fi: e.target.value }))} disabled={bloqueada} className={CLASE_CAMPO} />
                </div>
                <div>
                  <label className="block text-[10.5px] font-semibold text-muted mb-1">Hasta</label>
                  <input type="date" value={rango.ff} onChange={(e) => setRango((r) => ({ ...r, ff: e.target.value }))} disabled={bloqueada} className={CLASE_CAMPO} />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <button type="button" disabled={bloqueada} onClick={() => setRango(rangoMes(-1))} className={CLASE_ATAJO}>Mes anterior</button>
                <button type="button" disabled={bloqueada} onClick={() => setRango(rangoMes(0))} className={CLASE_ATAJO}>Este mes</button>
                <button type="button" disabled={bloqueada} onClick={() => setRango(rangoAnio(0))} className={CLASE_ATAJO}>Este año</button>
                <button type="button" disabled={bloqueada} onClick={() => setRango(rangoAnio(-1))} className={CLASE_ATAJO}>Año anterior</button>
              </div>
              <p className={`text-[10.5px] ${rangoValido || dias === 0 ? 'text-muted' : 'text-rojo-sunat font-semibold'}`}>
                {dias <= 0
                  ? 'La fecha inicial debe ser menor o igual a la final.'
                  : dias > MAX_DIAS
                    ? `Máximo ${MAX_DIAS} días por consulta (elegiste ${dias}).`
                    : `${dias} día(s) → SUNAT permite 30 días por consulta, así que se harán ${bloques} consulta(s) seguidas y se unirán en una sola tabla.`}
              </p>
            </Tarjeta>
          </div>

          {fase === 'edicion' && (
            <p className="text-[10.5px] text-muted mb-3">
              Usa la clave SOL de tu hoja (RUC, USUARIO y CLAVE). Puede tardar varios minutos según los meses elegidos; mantén esta pantalla abierta.
              Al terminar verás la tabla aquí mismo para copiarla a tu Excel, y también podrás descargarla.
            </p>
          )}

          {fase === 'terminado' && resultado && (
            resultado.filas.length > 0 ? (
              <div className="flex flex-col gap-3">
                <ResumenMensual
                  columnas={resultado.columnas}
                  filas={resultado.filas}
                  fi={rango.fi}
                  ff={rango.ff}
                  activo={mesFiltro}
                  onElegir={setMesFiltro}
                />
                <TablaResultados
                  titulo="Pagos de detracciones"
                  columnas={resultado.columnas}
                  filas={resultado.filas}
                  onDescargar={tarea?.archivos?.length ? descargarExcel : undefined}
                  descargando={descargando}
                  onCopiado={setToast}
                  filtroExterno={filtroMes}
                  onQuitarFiltroExterno={() => setMesFiltro(null)}
                  claveTabla="detracciones"
                />
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#F0F3F7] shadow-card p-5 text-center text-[12px] text-muted">
                SUNAT no devolvió pagos de detracciones en ese rango de fechas.
              </div>
            )
          )}

          {fase === 'terminado' && hayDudosos && (
            <div className="mt-3 bg-[#FFF6DB] text-[#8A6A00] text-[11.5px] rounded-xl px-3 py-2.5">
              <b>Atención:</b> estos rangos no se pudieron confirmar (ni datos ni «sin registros»). Vuelve a consultarlos:
              <div className="mt-1 font-mono text-[10.5px]">{tarea.dudosos.join(' · ')}</div>
            </div>
          )}
        </div>
      </div>

      {/* Barra de acción / progreso */}
      <div className="border-t border-bordersoft bg-white px-4 md:px-8 py-3">
        <div className="max-w-[1000px] mx-auto">
          {fase === 'edicion' ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 text-[11.5px] text-muted">
                {rangoValido ? `Listo para consultar ${bloques} bloque(s).` : 'Elige un rango de fechas válido.'}
              </div>
              <button onClick={ejecutar} disabled={!rangoValido} className="bg-azul-dark disabled:opacity-60 text-white text-[13px] font-bold px-8 py-3 rounded-2xl shadow-float">
                🔎 Consultar detracciones
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="text-[12px] font-bold text-ink">
                  {fase === 'terminado'
                    ? (errorGeneral ? 'La consulta se detuvo' : tarea?.cancelado ? 'Consulta cancelada (resultado parcial)' : 'Consulta terminada')
                    : (tarea?.fase_texto || 'Trabajando…')}
                  {fase === 'ejecutando' && <span className="font-normal text-muted"> · {segundos} s</span>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-[11px] text-muted">
                    {procesados}/{total} bloque(s) · ✓ {tarea?.bloques_ok || 0} · vacíos {tarea?.bloques_vacios || 0}
                  </div>
                  {fase === 'ejecutando' && (
                    <button onClick={cancelar} disabled={cancelando} className="text-[11.5px] font-bold text-white bg-rojo-sunat px-3 py-1.5 rounded-lg disabled:opacity-60">
                      {cancelando ? 'Cancelando…' : '✕ Cancelar'}
                    </button>
                  )}
                </div>
              </div>
              <div className="h-2 rounded-full bg-[#EAF1FA] overflow-hidden mb-2">
                <div
                  className={`h-2 rounded-full transition-all ${fase === 'terminado' && (hayDudosos || errorGeneral) ? 'bg-ambar' : 'bg-azul-inst'}`}
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
              {fase === 'terminado' && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-[11.5px] text-muted">{resultado ? `${resultado.filas.length} fila(s) en la tabla` : ''}</div>
                  <button onClick={nuevaConsulta} className="text-[11.5px] font-bold text-white bg-azul-dark px-4 py-1.5 rounded-lg">Nueva consulta</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
