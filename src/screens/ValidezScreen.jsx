import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import {
  ejecutarValidez, consultarEstadoValidez, cancelarValidez,
  listarArchivosValidez, descargarArchivoValidez, borrarTareaValidez,
} from '../services/validezApi.js'
import {
  soportaSelectorCarpeta, elegirCarpeta, asegurarPermiso,
  guardarBlobEnCarpeta, descargarBlob,
} from '../utils/carpetaPc.js'

const INTERVALO_ESTADO_MS = 2000
const MAX_FALLOS_RED = 6
const MAX_COMPROBANTES = 10000

const TEXTO_ESTADO = {
  en_cola: 'En cola…',
  validando: 'Validando comprobantes…',
  completado: 'Validación terminada',
  error: 'La validación se detuvo con un error',
}

// ── ¿Celular? Esta acción se usa desde computadora ──────────────────
function detectarCelular() {
  const angosto = window.matchMedia('(max-width: 767px)').matches
  const movil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  return angosto || movil
}
function useEsCelular() {
  const [esCelular, setEsCelular] = useState(detectarCelular)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const alCambiar = () => setEsCelular(detectarCelular())
    mq.addEventListener('change', alCambiar)
    return () => mq.removeEventListener('change', alCambiar)
  }, [])
  return esCelular
}

// Lee un .txt/.csv y devuelve sus líneas no vacías (sin la marca BOM del inicio).
async function leerLineas(file) {
  const texto = (await file.text()).replace(/^\uFEFF/, '')
  return texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
}

function contarInvalidas(lineas) {
  return lineas.filter((l) => l.split('|').length < 5).length
}

// ── Piezas visuales ─────────────────────────────────────────────────
function Encabezado({ onVolver }) {
  return (
    <div className="flex items-center gap-2.5 px-4 md:px-8 pt-3.5 pb-1.5">
      <button onClick={onVolver} className="w-8 h-8 rounded-[9px] bg-white border border-bordersoft flex items-center justify-center flex-shrink-0" aria-label="Volver">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M15 6l-6 6 6 6" stroke="#0B3A60" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
      <div className="font-display font-bold text-[15px]">Validez de comprobantes (API SUNAT)</div>
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

function AvisoSoloPc({ onVolver }) {
  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <Encabezado onVolver={onVolver} />
      <div className="flex-1 overflow-y-auto px-4 pt-6">
        <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-5 text-center">
          <div className="text-[34px] leading-none mb-2">💻</div>
          <div className="font-display font-bold text-[15px] mb-1.5">Disponible en computadora</div>
          <p className="text-[12px] text-muted leading-relaxed mb-4">
            Esta acción necesita elegir archivos .txt y una carpeta de tu PC para guardar el reporte,
            algo que se hace mejor en una computadora. Ábrela desde tu PC con Chrome o Edge.
          </p>
          <button onClick={onVolver} className="w-full bg-azul-dark text-white text-[13px] font-bold py-3 rounded-2xl">
            Volver
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Pantalla en PC ──────────────────────────────────────────────────
function ValidezPc() {
  const { activeRuc, goScreen, pushLog } = useApp()
  const inputRef = useRef(null)

  const [archivos, setArchivos] = useState([]) // [{ id, nombre, lineas }]
  const [seleccion, setSeleccion] = useState(null) // id del archivo marcado en la lista
  const [carpeta, setCarpeta] = useState(null)

  const [fase, setFase] = useState('edicion') // edicion | ejecutando | guardando | terminado
  const [tarea, setTarea] = useState(null)
  const [errorGeneral, setErrorGeneral] = useState('')
  const [errorGuardado, setErrorGuardado] = useState('')
  const [pendienteGuardar, setPendienteGuardar] = useState(false)
  const [guardado, setGuardado] = useState(null) // { modo, total }
  const [cancelando, setCancelando] = useState(false)
  const [segundos, setSegundos] = useState(0)

  const tareaIdRef = useRef(null)
  const carpetaRef = useRef(null)
  const timerRef = useRef(null)
  const vivoRef = useRef(true)
  const fallosRedRef = useRef(0)
  carpetaRef.current = carpeta

  useEffect(() => {
    vivoRef.current = true
    return () => {
      vivoRef.current = false
      clearTimeout(timerRef.current)
    }
  }, [])

  // Avisar si intenta cerrar la pestaña mientras se valida o se guarda.
  useEffect(() => {
    if (fase !== 'ejecutando' && fase !== 'guardando') return undefined
    const avisar = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [fase])

  // Cronómetro
  useEffect(() => {
    if (fase !== 'ejecutando') return undefined
    const inicio = Date.now()
    setSegundos(0)
    const t = setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 1000)
    return () => clearInterval(t)
  }, [fase])

  const bloqueada = fase !== 'edicion'
  const soportaCarpeta = soportaSelectorCarpeta()
  const totalComprobantes = archivos.reduce((s, a) => s + a.lineas.length, 0)
  const totalInvalidas = archivos.reduce((s, a) => s + contarInvalidas(a.lineas), 0)
  const excede = totalComprobantes > MAX_COMPROBANTES
  const tieneCreds = !!activeRuc?.clientIdVcp

  // ── Archivos ──────────────────────────────────────────────────────
  async function alElegirArchivos(e) {
    const elegidos = Array.from(e.target.files || [])
    e.target.value = '' // permite volver a elegir el mismo archivo
    if (!elegidos.length) return
    const nuevos = []
    for (const f of elegidos) {
      try {
        const lineas = await leerLineas(f)
        nuevos.push({ id: `${f.name}-${f.size}-${f.lastModified}-${Math.random().toString(36).slice(2, 6)}`, nombre: f.name, lineas })
      } catch (err) {
        pushLog(`⚠ No se pudo leer ${f.name}: ${err?.message || err}`)
      }
    }
    if (nuevos.length) {
      setArchivos((prev) => [...prev, ...nuevos])
      pushLog(`Archivos agregados: ${nuevos.map((n) => `${n.nombre} (${n.lineas.length})`).join(', ')}`)
    }
  }

  function quitarSeleccionado() {
    if (!seleccion) return
    setArchivos((prev) => prev.filter((a) => a.id !== seleccion))
    setSeleccion(null)
  }

  function mover(delta) {
    if (!seleccion) return
    setArchivos((prev) => {
      const i = prev.findIndex((a) => a.id === seleccion)
      const j = i + delta
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const sig = prev.slice()
      ;[sig[i], sig[j]] = [sig[j], sig[i]]
      return sig
    })
  }

  async function elegirCarpetaDestino() {
    try {
      setCarpeta(await elegirCarpeta())
    } catch (err) {
      if (err?.name !== 'AbortError') {
        pushLog(`⚠ No se pudo elegir esa carpeta: ${err?.message || err}. Prueba con otra (por ejemplo, una subcarpeta nueva).`)
      }
    }
  }

  // ── Guardar el reporte ────────────────────────────────────────────
  const guardarReporte = useCallback(async (id, conGesto) => {
    setFase('guardando')
    setErrorGuardado('')
    setPendienteGuardar(false)
    try {
      const lista = await listarArchivosValidez(id)
      if (!lista.ok) throw new Error(lista.error || 'No se pudo leer la lista de archivos')
      const items = lista.archivos || []
      if (items.length === 0) {
        setGuardado({ modo: 'nada', total: 0 })
        await borrarTareaValidez(id).catch(() => {})
        setFase('terminado')
        return
      }

      const destino = carpetaRef.current
      if (destino) {
        const permiso = await asegurarPermiso(destino, conGesto)
        if (!permiso) {
          setErrorGuardado('El navegador necesita que confirmes el permiso para escribir en la carpeta.')
          setPendienteGuardar(true)
          setFase('terminado')
          return
        }
        for (const it of items) {
          const blob = await descargarArchivoValidez(id, it.nombre)
          await guardarBlobEnCarpeta(destino, it.nombre, blob)
        }
        setGuardado({ modo: 'carpeta', total: items.length })
        pushLog(`✓ Reporte guardado en tu carpeta (${items.map((i) => i.nombre).join(', ')})`)
      } else {
        for (const it of items) {
          const blob = await descargarArchivoValidez(id, it.nombre)
          descargarBlob(blob, it.nombre)
        }
        setGuardado({ modo: 'descargas', total: items.length })
        pushLog(`✓ Reporte descargado en tu carpeta de Descargas (${items.map((i) => i.nombre).join(', ')})`)
      }
      await borrarTareaValidez(id).catch(() => {})
      setFase('terminado')
    } catch (err) {
      setErrorGuardado(`No se pudo guardar el reporte: ${err?.message || err}. Sigue en el servidor unas horas.`)
      setPendienteGuardar(true)
      setFase('terminado')
    }
  }, [pushLog])

  // ── Seguimiento de la tarea ───────────────────────────────────────
  async function vigilar(id) {
    if (!vivoRef.current) return
    try {
      const est = await consultarEstadoValidez(id)
      if (!vivoRef.current) return
      fallosRedRef.current = 0
      if (!est.ok) {
        setErrorGeneral('El servidor ya no recuerda esta tarea (¿se reinició?). Vuelve a ejecutar la validación.')
        setFase('terminado')
        return
      }
      setTarea(est)
      if (est.estado === 'completado') {
        await guardarReporte(id, false)
        return
      }
      if (est.estado === 'error') {
        setErrorGeneral(est.mensaje || 'La validación falló.')
        pushLog(`✗ Validez CP: ${est.mensaje || 'error'}`)
        setFase('terminado')
        return
      }
    } catch {
      fallosRedRef.current += 1
      if (fallosRedRef.current >= MAX_FALLOS_RED) {
        setErrorGeneral('Se perdió la conexión con el servidor. Revisa tu internet; la validación puede seguir en el servidor.')
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
    if (archivos.length === 0 || totalComprobantes === 0) {
      setErrorGeneral('Elige al menos un archivo .txt con comprobantes.')
      return
    }
    if (excede) {
      setErrorGeneral(`Máximo ${MAX_COMPROBANTES} comprobantes por tanda (tienes ${totalComprobantes}). Quita algún archivo.`)
      return
    }

    setGuardado(null)
    setErrorGuardado('')
    setPendienteGuardar(false)
    setCancelando(false)
    setTarea({ estado: 'en_cola', total: totalComprobantes, procesados: 0, correctos: 0, con_observaciones: 0, errores: 0 })
    setFase('ejecutando')

    try {
      const res = await ejecutarValidez({
        ruc: activeRuc.ruc,
        archivos: archivos.map((a) => ({ nombre: a.nombre, lineas: a.lineas })),
      })
      if (!res.ok) {
        setErrorGeneral(res.error || 'No se pudo iniciar la validación.')
        setTarea(null)
        setFase('edicion')
        return
      }
      tareaIdRef.current = res.tarea_id
      fallosRedRef.current = 0
      pushLog(`Validando ${res.total} comprobante(s) vía API SUNAT…`)
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
      await cancelarValidez(tareaIdRef.current)
      pushLog('⚠ Cancelación solicitada — terminan los comprobantes ya en curso.')
    } catch {
      setCancelando(false)
    }
  }

  function nuevaValidacion() {
    setFase('edicion')
    setTarea(null)
    setErrorGeneral('')
    setErrorGuardado('')
    setPendienteGuardar(false)
    setGuardado(null)
    setCancelando(false)
    tareaIdRef.current = null
  }

  const total = tarea?.total || 0
  const procesados = tarea?.procesados || 0
  const porcentaje = fase === 'terminado' ? 100 : total ? Math.round((procesados / total) * 100) : 0
  const textoEstado = fase === 'guardando' ? 'Guardando el reporte…' : TEXTO_ESTADO[tarea?.estado] || ''

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <Encabezado onVolver={() => goScreen('inicio')} />
      <div className="text-[11px] text-muted ml-[42px] md:ml-[62px] -mt-1 mb-1">RUC activo: {activeRuc?.razonSocial || '—'} · {activeRuc?.ruc || ''}</div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-2 pb-6">
        <div className="max-w-[900px] mx-auto">
          {errorGeneral && (
            <div className="mb-3 bg-[#FCE9EB] text-rojo-sunat text-[11.5px] rounded-xl px-3 py-2.5 font-semibold">{errorGeneral}</div>
          )}

          {pendienteGuardar && (
            <div className="mb-3 bg-[#FFF6DB] text-[#8A6A00] text-[11.5px] rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
              <span>{errorGuardado || 'El reporte sigue en el servidor. Puedes guardarlo ahora.'}</span>
              <button
                onClick={() => guardarReporte(tareaIdRef.current, true)}
                disabled={!tareaIdRef.current}
                className="font-bold underline whitespace-nowrap disabled:opacity-50"
              >
                Guardar reporte ahora
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            <Tarjeta numero="1" titulo="Archivos de comprobantes (.txt)">
              <input ref={inputRef} type="file" multiple accept=".txt,.csv,text/plain" className="hidden" onChange={alElegirArchivos} />
              <div className="flex flex-wrap items-center gap-2 mb-2.5">
                <button
                  onClick={() => inputRef.current?.click()}
                  disabled={bloqueada}
                  className="text-[11.5px] font-bold text-white bg-azul-inst px-3 py-1.5 rounded-lg disabled:opacity-60"
                >
                  📎 Agregar archivos…
                </button>
                <button onClick={() => mover(-1)} disabled={bloqueada || !seleccion} className="text-[11.5px] font-semibold text-ink bg-white border border-bordersoft px-3 py-1.5 rounded-lg disabled:opacity-50">▲ Subir</button>
                <button onClick={() => mover(1)} disabled={bloqueada || !seleccion} className="text-[11.5px] font-semibold text-ink bg-white border border-bordersoft px-3 py-1.5 rounded-lg disabled:opacity-50">▼ Bajar</button>
                <button onClick={quitarSeleccionado} disabled={bloqueada || !seleccion} className="text-[11.5px] font-semibold text-rojo-sunat bg-white border border-bordersoft px-3 py-1.5 rounded-lg disabled:opacity-50">Quitar</button>
                <div className="flex-1" />
                <div className="text-[10.5px] text-muted">
                  {archivos.length} archivo(s) · {totalComprobantes} comprobante(s)
                </div>
              </div>

              <div className="border border-bordersoft rounded-xl overflow-hidden">
                {archivos.length === 0 ? (
                  <div className="text-center text-muted text-[11.5px] py-6">Sin archivos. Formato de cada línea: RUC|Tipo|Serie|Número|Fecha|Monto</div>
                ) : (
                  archivos.map((a, i) => {
                    const marcado = a.id === seleccion
                    const inval = contarInvalidas(a.lineas)
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => !bloqueada && setSeleccion(marcado ? null : a.id)}
                        className={`w-full grid items-center h-9 text-left border-b border-[#F0F3F7] last:border-b-0 ${marcado ? 'bg-[#D6E8FF]' : i % 2 === 0 ? 'bg-white' : 'bg-[#F7FAFF]'}`}
                        style={{ gridTemplateColumns: '40px minmax(0,1fr) 110px 150px' }}
                      >
                        <span className="text-center text-[10.5px] text-muted">{i + 1}</span>
                        <span className="px-2 text-[12px] text-ink truncate" title={a.nombre}>{a.nombre}</span>
                        <span className="px-2 text-[11px] text-muted">{a.lineas.length} líneas</span>
                        <span className={`px-2 text-[11px] truncate ${inval ? 'text-rojo-sunat font-semibold' : 'text-verde'}`}>
                          {inval ? `${inval} con formato inválido` : '✓ formato correcto'}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
              {totalInvalidas > 0 && (
                <p className="text-[10.5px] text-[#8A6A00] mt-2">
                  Las líneas con formato inválido se incluirán en el reporte marcadas como «ERROR FORMATO».
                </p>
              )}
              {excede && (
                <p className="text-[10.5px] text-rojo-sunat mt-2 font-semibold">
                  Superas el máximo de {MAX_COMPROBANTES} comprobantes por tanda. Quita algún archivo.
                </p>
              )}
            </Tarjeta>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Tarjeta numero="2" titulo="Credenciales API">
                <p className="text-[11px] text-muted leading-relaxed">
                  {tieneCreds
                    ? 'Se usa el CLIENT_ID_VCP / CLIENT_SECRET_VCP guardado en tu hoja (columnas I y J) para este RUC. No requiere clave SOL.'
                    : 'No se detectaron credenciales de API para este RUC en tu hoja (columnas I y J: CLIENT_ID_VCP / CLIENT_SECRET_VCP). Si ya las tienes, sincroniza la hoja; el servidor las verifica al ejecutar.'}
                </p>
              </Tarjeta>

              <Tarjeta numero="3" titulo="Dónde guardar el reporte">
                {soportaCarpeta ? (
                  <>
                    <button
                      onClick={elegirCarpetaDestino}
                      disabled={bloqueada}
                      className="w-full text-[12px] font-bold text-azul-inst bg-[#EAF1FA] border border-[#C9D6E4] py-2.5 rounded-xl disabled:opacity-60"
                    >
                      📁 {carpeta ? 'Cambiar carpeta…' : 'Elegir carpeta…'}
                    </button>
                    {carpeta ? (
                      <p className="text-[10.5px] text-ink mt-2">
                        Se guardará en <span className="font-semibold">«{carpeta.name}»</span> (Excel y .txt).
                      </p>
                    ) : (
                      <p className="text-[10.5px] text-muted mt-2">
                        Sin carpeta elegida, el reporte va a tu carpeta de <b>Descargas</b>. Para dejarlo junto a tu .txt,
                        elige aquí esa misma carpeta (si Chrome no deja elegir Descargas o Documentos, crea una subcarpeta).
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[11px] text-[#8A6A00] bg-[#FFF6DB] rounded-lg px-3 py-2">
                    Tu navegador no puede elegir carpetas (solo Chrome y Edge en computadora). El reporte se descargará en tu carpeta de Descargas.
                  </p>
                )}
              </Tarjeta>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de acción / progreso */}
      <div className="border-t border-bordersoft bg-white px-4 md:px-8 py-3">
        <div className="max-w-[900px] mx-auto">
          {fase === 'edicion' ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 text-[11.5px] text-muted">
                {totalComprobantes === 0 ? 'Agrega uno o más archivos .txt para empezar.' : `${totalComprobantes} comprobante(s) listos para validar`}
              </div>
              <button
                onClick={ejecutar}
                disabled={totalComprobantes === 0 || excede}
                className="bg-azul-dark disabled:opacity-60 text-white text-[13px] font-bold px-8 py-3 rounded-2xl shadow-float"
              >
                🔎 Ejecutar validación
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="text-[12px] font-bold text-ink">
                  {textoEstado}
                  {tarea?.estado === 'validando' && fase === 'ejecutando' && ` (${procesados}/${total})`}
                  {fase === 'ejecutando' && <span className="font-normal text-muted"> · {segundos} s</span>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-[11px] text-muted">
                    ✓ {tarea?.correctos || 0} · ⚠ {tarea?.con_observaciones || 0} con observación · ✗ {tarea?.errores || 0}
                  </div>
                  {fase === 'ejecutando' && (
                    <button
                      onClick={cancelar}
                      disabled={cancelando}
                      className="text-[11.5px] font-bold text-white bg-rojo-sunat px-3 py-1.5 rounded-lg disabled:opacity-60"
                    >
                      {cancelando ? 'Cancelando…' : '✕ Cancelar'}
                    </button>
                  )}
                </div>
              </div>
              <div className="h-2 rounded-full bg-[#EAF1FA] overflow-hidden mb-2">
                <div
                  className={`h-2 rounded-full transition-all ${fase === 'terminado' && ((tarea?.errores || 0) > 0 || errorGeneral) ? 'bg-ambar' : 'bg-azul-inst'}`}
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
              {fase === 'terminado' && (
                <div className="flex flex-wrap items-center gap-2">
                  {guardado?.modo === 'carpeta' && (
                    <span className="text-[11.5px] text-verde font-semibold">Reporte guardado en «{carpeta?.name}» ({guardado.total} archivos)</span>
                  )}
                  {guardado?.modo === 'descargas' && (
                    <span className="text-[11.5px] text-verde font-semibold">Reporte descargado en tu carpeta de Descargas ({guardado.total} archivos)</span>
                  )}
                  {guardado?.modo === 'nada' && (
                    <span className="text-[11.5px] text-[#8A6A00] font-semibold">No se generó ningún archivo</span>
                  )}
                  <div className="flex-1" />
                  <button onClick={nuevaValidacion} className="text-[11.5px] font-bold text-white bg-azul-dark px-4 py-1.5 rounded-lg">Nueva validación</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ValidezScreen() {
  const { goScreen } = useApp()
  const esCelular = useEsCelular()
  return esCelular ? <AvisoSoloPc onVolver={() => goScreen('inicio')} /> : <ValidezPc />
}