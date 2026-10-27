import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Toast from '../components/Toast.jsx'
import {
  ejecutarValidez, consultarEstadoValidez, cancelarValidez,
  listarArchivosValidez, descargarArchivoValidez, borrarTareaValidez,
} from '../services/validezApi.js'
import {
  soportaSelectorCarpeta, elegirCarpeta, asegurarPermiso,
  guardarBlobEnCarpeta, descargarBlob,
} from '../utils/carpetaPc.js'
import {
  COLUMNAS, CAMPOS, MAX_FILAS_TABLA,
  crearFilasVacias, esFilaVacia, asegurarFilaLibre, normalizarCampo,
  validarFilaCacheada, marcarDuplicados, parsearPortapapeles, aplicarPegado,
  lineaDesdeFila, analizarArchivo,
} from '../utils/validezTabla.js'

// ── Medidas y colores (encabezado y filas usan la MISMA plantilla) ──
const COLUMNAS_GRID = '40px 130px 70px 90px 100px 110px minmax(240px, 1fr) 36px'
const ANCHO_MINIMO_TABLA = 'min-w-[816px]'
const ALTURA_FILA = 'h-9'
const ALTURA_MAXIMA_TABLA = 'max-h-[42vh]'

const FONDO_FILA = { normal: 'bg-white', aviso: 'bg-[#FFF6DB]', error: 'bg-[#FCE9EB]' }
const COLOR_TEXTO_OBS = { normal: 'text-muted', aviso: 'text-[#8A6A00]', error: 'text-rojo-sunat' }

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

function reponerFilas(filas) {
  const faltan = 12 - filas.length
  return asegurarFilaLibre(faltan > 0 ? [...filas, ...crearFilasVacias(faltan)] : filas)
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
            Esta acción necesita pegar datos desde Excel o elegir archivos .txt, y una carpeta de tu PC
            para guardar el reporte. Ábrela desde tu PC con Chrome o Edge.
          </p>
          <button onClick={onVolver} className="w-full bg-azul-dark text-white text-[13px] font-bold py-3 rounded-2xl">
            Volver
          </button>
        </div>
      </div>
    </div>
  )
}

// Una fila de la tabla. memo: al escribir en una celda solo se redibuja esa fila.
const Fila = memo(function Fila({ idx, fila, duplicada, bloqueada, onCambio, onSalir, onTecla, onEliminar }) {
  const v = validarFilaCacheada(fila)
  let estado = 'normal'
  let observacion = ''
  if (v.errores.length) {
    estado = 'error'
    observacion = v.errores.join('; ')
  } else if (duplicada || v.avisos.length) {
    estado = 'aviso'
    observacion = [duplicada ? 'Comprobante repetido en la tabla' : '', ...v.avisos].filter(Boolean).join('; ')
  }

  return (
    <div
      role="row"
      className={`grid items-center ${ALTURA_FILA} border-b border-[#F0F3F7] ${FONDO_FILA[estado]}`}
      style={{ gridTemplateColumns: COLUMNAS_GRID }}
    >
      <div className="text-center text-[10.5px] text-muted">{idx + 1}</div>
      {CAMPOS.map((campo, col) => (
        <div key={campo} className="px-1">
          <input
            data-celda={`${idx}-${col}`}
            data-fila={idx}
            data-col={col}
            value={fila[campo]}
            disabled={bloqueada}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => onCambio(idx, campo, e.target.value)}
            onBlur={() => onSalir(idx, campo)}
            onKeyDown={(e) => onTecla(e, idx, col)}
            className="w-full h-7 text-[12px] text-ink px-2 rounded-md border border-transparent bg-transparent focus:bg-white focus:border-azul-inst disabled:opacity-80"
          />
        </div>
      ))}
      <div className={`px-2 text-[11px] truncate ${COLOR_TEXTO_OBS[estado]}`} title={observacion}>{observacion}</div>
      <div className="flex items-center justify-center">
        {!bloqueada && !esFilaVacia(fila) && (
          <button
            type="button"
            onClick={() => onEliminar(idx)}
            title="Eliminar esta fila (Ctrl + Supr)"
            aria-label={`Eliminar fila ${idx + 1}`}
            className="w-6 h-6 rounded-md text-[12px] leading-none text-muted hover:bg-[#FCE9EB] hover:text-rojo-sunat"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
})

function PestanaModo({ activa, onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 text-[12px] font-semibold py-2 rounded-[9px] disabled:opacity-60 ${activa ? 'bg-white text-azul-inst shadow' : 'text-muted'}`}
    >
      {children}
    </button>
  )
}

// ── Pantalla en PC ──────────────────────────────────────────────────
function ValidezPc() {
  const { activeRuc, goScreen, pushLog } = useApp()
  const inputRef = useRef(null)

  const [modo, setModo] = useState('tabla') // tabla | archivos

  // Modo tabla
  const [filas, setFilas] = useState(() => crearFilasVacias())

  // Modo archivos
  const [archivos, setArchivos] = useState([]) // [{ id, nombre, analisis }]
  const [seleccion, setSeleccion] = useState(null)

  const [carpeta, setCarpeta] = useState(null)

  const [fase, setFase] = useState('edicion') // edicion | ejecutando | guardando | terminado
  const [tarea, setTarea] = useState(null)
  const [errorGeneral, setErrorGeneral] = useState('')
  const [errorGuardado, setErrorGuardado] = useState('')
  const [pendienteGuardar, setPendienteGuardar] = useState(false)
  const [guardado, setGuardado] = useState(null) // { modo, nombres }
  const [cancelando, setCancelando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [toast, setToast] = useState('')
  const cerrarToast = useCallback(() => setToast(''), [])

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

  useEffect(() => {
    if (fase !== 'ejecutando' && fase !== 'guardando') return undefined
    const avisar = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [fase])

  useEffect(() => {
    if (fase !== 'ejecutando') return undefined
    const inicio = Date.now()
    setSegundos(0)
    const t = setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 1000)
    return () => clearInterval(t)
  }, [fase])

  const bloqueada = fase !== 'edicion'
  const soportaCarpeta = soportaSelectorCarpeta()
  const tieneCreds = !!activeRuc?.clientIdVcp

  // ── Resúmenes ─────────────────────────────────────────────────────
  const duplicados = useMemo(() => marcarDuplicados(filas), [filas])
  const resumenTabla = useMemo(() => {
    let listas = 0
    let conError = 0
    let conAviso = 0
    filas.forEach((f, i) => {
      const v = validarFilaCacheada(f)
      if (v.vacia) return
      if (v.errores.length) conError += 1
      else {
        listas += 1
        if (v.avisos.length || duplicados.has(i)) conAviso += 1
      }
    })
    return { listas, conError, conAviso }
  }, [filas, duplicados])

  const resumenArchivos = useMemo(() => {
    const r = { total: 0, correctas: 0, conAviso: 0, conError: 0 }
    archivos.forEach((a) => {
      r.total += a.analisis.total
      r.correctas += a.analisis.correctas
      r.conAviso += a.analisis.conAviso
      r.conError += a.analisis.conError
    })
    return r
  }, [archivos])

  const totalAEnviar = modo === 'tabla' ? resumenTabla.listas + resumenTabla.conError : resumenArchivos.total
  const excede = totalAEnviar > MAX_COMPROBANTES

  // ── Edición de la tabla ───────────────────────────────────────────
  const cambiarCampo = useCallback((idx, campo, valor) => {
    setFilas((prev) => {
      const sig = prev.slice()
      sig[idx] = { ...prev[idx], [campo]: valor }
      return asegurarFilaLibre(sig)
    })
  }, [])

  // Al salir de una celda se arregla solo lo que se puede (tipo "1" -> "01", fecha a dd/mm/aaaa, etc.)
  const normalizarAlSalir = useCallback((idx, campo) => {
    setFilas((prev) => {
      const actual = prev[idx]?.[campo]
      if (actual === undefined) return prev
      const limpio = normalizarCampo(campo, actual)
      if (limpio === actual) return prev
      const sig = prev.slice()
      sig[idx] = { ...prev[idx], [campo]: limpio }
      return sig
    })
  }, [])

  const eliminarFila = useCallback((idx) => {
    setFilas((prev) => reponerFilas(prev.filter((_, i) => i !== idx)))
  }, [])

  const moverConTeclas = useCallback((e, idx, col) => {
    if (e.key === 'Delete' && e.ctrlKey) {
      e.preventDefault()
      eliminarFila(idx)
      return
    }
    const delta = e.key === 'Enter' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
    if (!delta) return
    const siguiente = document.querySelector(`[data-celda="${idx + delta}-${col}"]`)
    if (siguiente) {
      e.preventDefault()
      siguiente.focus()
      siguiente.select?.()
    }
  }, [eliminarFila])

  function posicionActiva() {
    const el = document.activeElement
    const fila = Number(el?.dataset?.fila)
    const col = Number(el?.dataset?.col)
    return { fila: Number.isInteger(fila) ? fila : 0, col: Number.isInteger(col) ? col : 0 }
  }

  function aplicarMatriz(matriz, filaIni, colIni) {
    const r = aplicarPegado(filas, filaIni, colIni, matriz)
    setFilas(r.filas)
    const notas = []
    if (r.omitioEncabezado) notas.push('se omitió la fila de encabezado')
    if (r.columnasIgnoradas) notas.push(`se ignoraron ${r.columnasIgnoradas} columna(s) sobrantes`)
    if (r.filasRecortadas) notas.push(`${r.filasRecortadas} fila(s) no caben (máximo ${MAX_FILAS_TABLA}; para más usa archivos .txt)`)
    setToast(`Se pegaron ${r.filasPegadas} fila(s)`)
    if (notas.length) pushLog(`⚠ Pegado: ${notas.join('; ')}.`)
  }

  // Ctrl+V sobre la tabla: acepta columnas de Excel O líneas con palotes (|) del txt.
  function alPegar(e) {
    if (bloqueada) return
    const matriz = parsearPortapapeles(e.clipboardData?.getData('text') ?? '')
    if (matriz.length === 0) return
    if (matriz.length === 1 && matriz[0].length === 1) return // una sola celda: pegado normal
    e.preventDefault()
    const { fila, col } = posicionActiva()
    aplicarMatriz(matriz, fila, col)
  }

  async function pegarDesdeBoton() {
    try {
      const texto = await navigator.clipboard.readText()
      const matriz = parsearPortapapeles(texto)
      if (matriz.length === 0) {
        setToast('El portapapeles está vacío')
        return
      }
      const primeraLibre = filas.findIndex((f) => esFilaVacia(f))
      aplicarMatriz(matriz, primeraLibre === -1 ? filas.length : primeraLibre, 0)
    } catch {
      pushLog('⚠ El navegador no dejó leer el portapapeles. Haz clic en la primera celda y presiona Ctrl+V.')
      setToast('Haz clic en una celda y presiona Ctrl+V')
    }
  }

  function limpiarTabla() {
    const hayDatos = filas.some((f) => !esFilaVacia(f))
    if (hayDatos && !window.confirm('¿Borrar todos los comprobantes de la tabla?')) return
    setFilas(crearFilasVacias())
  }

  function eliminarFilasConError() {
    setFilas((prev) => reponerFilas(prev.filter((f) => {
      const v = validarFilaCacheada(f)
      return v.vacia || v.errores.length === 0
    })))
  }

  function agregarFila() {
    setFilas((prev) => (prev.length >= MAX_FILAS_TABLA ? prev : [...prev, ...crearFilasVacias(1)]))
  }

  // ── Archivos .txt ─────────────────────────────────────────────────
  async function alElegirArchivos(e) {
    const elegidos = Array.from(e.target.files || [])
    e.target.value = '' // permite volver a elegir el mismo archivo
    if (!elegidos.length) return
    const nuevos = []
    for (const f of elegidos) {
      try {
        const lineas = await leerLineas(f)
        const analisis = analizarArchivo(lineas)
        nuevos.push({ id: `${f.name}-${f.size}-${f.lastModified}-${Math.random().toString(36).slice(2, 6)}`, nombre: f.name, analisis })
      } catch (err) {
        pushLog(`⚠ No se pudo leer ${f.name}: ${err?.message || err}`)
      }
    }
    if (nuevos.length) {
      setArchivos((prev) => [...prev, ...nuevos])
      pushLog(`Archivos agregados: ${nuevos.map((n) => `${n.nombre} (${n.analisis.total})`).join(', ')}`)
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
        setGuardado({ modo: 'nada', nombres: [] })
        await borrarTareaValidez(id).catch(() => {})
        setFase('terminado')
        return
      }

      const destino = carpetaRef.current
      if (destino) {
        // Con carpeta elegida se guardan los dos archivos (Excel y .txt).
        const permiso = await asegurarPermiso(destino, conGesto)
        if (!permiso) {
          setErrorGuardado('El navegador necesita que confirmes el permiso para escribir en la carpeta.')
          setPendienteGuardar(true)
          setFase('terminado')
          return
        }
        const guardados = []
        const fallos = []
        for (const it of items) {
          try {
            const blob = await descargarArchivoValidez(id, it.nombre)
            await guardarBlobEnCarpeta(destino, it.nombre, blob)
            guardados.push(it.nombre)
          } catch {
            fallos.push(it.nombre)
          }
        }
        setGuardado({ modo: 'carpeta', nombres: guardados })
        if (fallos.length) {
          setErrorGuardado(`No se pudieron guardar: ${fallos.join(', ')}. Siguen en el servidor unas horas.`)
          setPendienteGuardar(true)
          setFase('terminado')
          return
        }
        pushLog(`✓ Reporte guardado en tu carpeta: ${guardados.join(', ')}`)
      } else {
        // Sin carpeta: se descarga SOLO el Excel (Chrome bloquea las descargas múltiples automáticas).
        const excel = items.find((i) => i.nombre.toLowerCase().endsWith('.xlsx')) || items[0]
        const blob = await descargarArchivoValidez(id, excel.nombre)
        descargarBlob(blob, excel.nombre)
        setGuardado({ modo: 'descargas', nombres: [excel.nombre] })
        pushLog(`✓ Reporte descargado en tu carpeta de Descargas: ${excel.nombre}`)
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
    if (totalAEnviar === 0) {
      setErrorGeneral(modo === 'tabla' ? 'La tabla está vacía. Pega los comprobantes.' : 'Elige al menos un archivo .txt con comprobantes.')
      return
    }
    if (excede) {
      setErrorGeneral(`Máximo ${MAX_COMPROBANTES} comprobantes por tanda (tienes ${totalAEnviar}).`)
      return
    }
    if (modo === 'tabla' && resumenTabla.conError > 0) {
      setErrorGeneral(`Hay ${resumenTabla.conError} fila(s) con error (en rojo). Corrígelas o quítalas antes de validar.`)
      return
    }

    let archivosPayload
    if (modo === 'tabla') {
      const lineas = filas.filter((f) => !esFilaVacia(f)).map(lineaDesdeFila)
      archivosPayload = [{ nombre: 'tabla', lineas }]
    } else {
      archivosPayload = archivos.map((a) => ({ nombre: a.nombre, lineas: a.analisis.lineasEnviar }))
    }

    setGuardado(null)
    setErrorGuardado('')
    setPendienteGuardar(false)
    setCancelando(false)
    setTarea({ estado: 'en_cola', total: totalAEnviar, procesados: 0, correctos: 0, con_observaciones: 0, errores: 0 })
    setFase('ejecutando')

    try {
      const res = await ejecutarValidez({ ruc: activeRuc.ruc, archivos: archivosPayload })
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
  const archivoSel = archivos.find((a) => a.id === seleccion)

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <Tarjeta numero="1" titulo="Credenciales API">
              <p className="text-[11px] text-muted leading-relaxed">
                {tieneCreds
                  ? 'Se usa el CLIENT_ID_VCP / CLIENT_SECRET_VCP guardado en tu hoja (columnas I y J) para este RUC. No requiere clave SOL.'
                  : 'No se detectaron credenciales de API para este RUC en tu hoja (columnas I y J: CLIENT_ID_VCP / CLIENT_SECRET_VCP). Si ya las tienes, sincroniza la hoja; el servidor las verifica al ejecutar.'}
              </p>
            </Tarjeta>

            <Tarjeta numero="2" titulo="Dónde guardar el reporte">
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
                      Se guardarán el Excel y el .txt en <span className="font-semibold">«{carpeta.name}»</span>.
                    </p>
                  ) : (
                    <p className="text-[10.5px] text-muted mt-2">
                      Sin carpeta, solo el <b>Excel</b> va a tu carpeta de Descargas. Para guardar Excel y .txt juntos
                      (por ejemplo junto a tu archivo), elige aquí la carpeta (si Chrome no deja elegir Descargas o Documentos, crea una subcarpeta).
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[11px] text-[#8A6A00] bg-[#FFF6DB] rounded-lg px-3 py-2">
                  Tu navegador no puede elegir carpetas (solo Chrome y Edge en computadora). El Excel se descargará en tu carpeta de Descargas.
                </p>
              )}
            </Tarjeta>
          </div>

          <div className="bg-white rounded-xl border border-[#F0F3F7] shadow-card p-3.5">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-5 h-5 rounded-full bg-azul-inst text-white text-[10.5px] font-bold flex items-center justify-center flex-shrink-0">3</span>
              <div className="text-[12px] font-bold text-ink">Comprobantes a validar</div>
            </div>

            <div className="flex bg-[#F1F4F8] rounded-[11px] p-[3px] mb-3">
              <PestanaModo activa={modo === 'tabla'} onClick={() => setModo('tabla')} disabled={bloqueada}>Pegar en tabla</PestanaModo>
              <PestanaModo activa={modo === 'archivos'} onClick={() => setModo('archivos')} disabled={bloqueada}>Adjuntar archivos .txt</PestanaModo>
            </div>

            {modo === 'tabla' ? (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                  <div className="text-[10.5px] text-muted">
                    {resumenTabla.listas} listas
                    {resumenTabla.conAviso > 0 && ` (${resumenTabla.conAviso} con aviso)`}
                    {resumenTabla.conError > 0 && <span className="text-rojo-sunat font-semibold"> · {resumenTabla.conError} con error</span>}
                  </div>
                  <div className="flex-1" />
                  <button onClick={pegarDesdeBoton} disabled={bloqueada} className="text-[11.5px] font-bold text-white bg-azul-inst px-3 py-1.5 rounded-lg disabled:opacity-60">
                    Pegar desde Excel o txt
                  </button>
                  <button onClick={agregarFila} disabled={bloqueada} className="text-[11.5px] font-semibold text-ink bg-white border border-bordersoft px-3 py-1.5 rounded-lg disabled:opacity-60">
                    + Fila
                  </button>
                  {resumenTabla.conError > 0 && (
                    <button onClick={eliminarFilasConError} disabled={bloqueada} className="text-[11.5px] font-semibold text-rojo-sunat bg-white border border-bordersoft px-3 py-1.5 rounded-lg disabled:opacity-60">
                      Quitar filas con error
                    </button>
                  )}
                  <button onClick={limpiarTabla} disabled={bloqueada} className="text-[11.5px] font-semibold text-rojo-sunat bg-white border border-bordersoft px-3 py-1.5 rounded-lg disabled:opacity-60">
                    Limpiar
                  </button>
                </div>
                <p className="text-[10.5px] text-muted mb-2">
                  Dos formas de pegar (haz clic en la primera celda y presiona <span className="font-semibold">Ctrl+V</span>):
                  <br />· <b>Desde Excel:</b> copia las columnas RUC emisor, Tipo, Serie, Número, Fecha y Monto, en ese orden.
                  <br />· <b>Desde un txt:</b> copia las líneas con palotes, tal como <span className="font-mono">20123456789|01|F001|123|16/10/2026|118.00</span>.
                  <br />Se corrigen solas cosas como tipo «1» → «01», fechas a dd/mm/aaaa o montos con «S/». Máximo {MAX_FILAS_TABLA} filas
                  (para más, usa archivos .txt). Con la ✕ de cada fila (o Ctrl + Supr) la eliminas.
                </p>

                <div className={`overflow-auto ${ALTURA_MAXIMA_TABLA} border border-bordersoft rounded-xl`} onPaste={alPegar}>
                  <div className={ANCHO_MINIMO_TABLA} role="table">
                    <div
                      role="row"
                      className={`grid items-center ${ALTURA_FILA} sticky top-0 z-[5] bg-[#F7F9FB] border-b border-bordersoft`}
                      style={{ gridTemplateColumns: COLUMNAS_GRID }}
                    >
                      <div className="text-center text-[10px] font-bold uppercase tracking-wide text-muted">#</div>
                      {COLUMNAS.map((c) => (
                        <div key={c.campo} className="px-2 text-[10px] font-bold uppercase tracking-wide text-muted truncate">{c.titulo}</div>
                      ))}
                      <div className="px-2 text-[10px] font-bold uppercase tracking-wide text-muted">Observación</div>
                      <div />
                    </div>
                    {filas.map((f, i) => (
                      <Fila
                        key={i}
                        idx={i}
                        fila={f}
                        duplicada={duplicados.has(i)}
                        bloqueada={bloqueada}
                        onCambio={cambiarCampo}
                        onSalir={normalizarAlSalir}
                        onTecla={moverConTeclas}
                        onEliminar={eliminarFila}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
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
                    {archivos.length} archivo(s) · {resumenArchivos.total} línea(s)
                  </div>
                </div>

                <div className="border border-bordersoft rounded-xl overflow-hidden">
                  {archivos.length === 0 ? (
                    <div className="text-center text-muted text-[11.5px] py-6">Sin archivos. Formato de cada línea: RUC|Tipo|Serie|Número|Fecha|Monto</div>
                  ) : (
                    archivos.map((a, i) => {
                      const marcado = a.id === seleccion
                      const an = a.analisis
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => !bloqueada && setSeleccion(marcado ? null : a.id)}
                          className={`w-full grid items-center h-9 text-left border-b border-[#F0F3F7] last:border-b-0 ${marcado ? 'bg-[#D6E8FF]' : i % 2 === 0 ? 'bg-white' : 'bg-[#F7FAFF]'}`}
                          style={{ gridTemplateColumns: '40px minmax(0,1fr) 90px minmax(0,300px)' }}
                        >
                          <span className="text-center text-[10.5px] text-muted">{i + 1}</span>
                          <span className="px-2 text-[12px] text-ink truncate" title={a.nombre}>{a.nombre}</span>
                          <span className="px-2 text-[11px] text-muted">{an.total} líneas</span>
                          <span className="px-2 text-[11px] truncate">
                            <span className="text-verde">✓ {an.correctas}</span>
                            {an.conAviso > 0 && <span className="text-[#8A6A00]"> · ⚠ {an.conAviso}</span>}
                            {an.conError > 0 && <span className="text-rojo-sunat font-semibold"> · ✗ {an.conError}</span>}
                            {an.ajustadas > 0 && <span className="text-muted"> · {an.ajustadas} ajustada(s)</span>}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>

                {resumenArchivos.conError > 0 && (
                  <p className="text-[10.5px] text-[#8A6A00] mt-2">
                    Las {resumenArchivos.conError} línea(s) con error <b>no se consultan a SUNAT</b>: aparecerán en el reporte como
                    «ERROR FORMATO» con el motivo. Haz clic en un archivo para ver sus primeras líneas con problema.
                  </p>
                )}

                {archivoSel && archivoSel.analisis.problemas.length > 0 && (
                  <div className="mt-2 border border-bordersoft rounded-xl max-h-[200px] overflow-auto">
                    <div className="sticky top-0 bg-[#F7F9FB] border-b border-bordersoft px-3 py-1.5 text-[10.5px] font-bold text-muted">
                      Problemas en «{archivoSel.nombre}» (primeras {Math.min(archivoSel.analisis.problemas.length, 50)} de {archivoSel.analisis.problemas.length})
                    </div>
                    {archivoSel.analisis.problemas.slice(0, 50).map((p) => (
                      <div key={p.n} className="px-3 py-1.5 border-b border-[#F0F3F7] last:border-b-0 text-[11px]">
                        <span className="text-muted">Línea {p.n}: </span>
                        <span className={p.errores.length ? 'text-rojo-sunat' : 'text-[#8A6A00]'}>
                          {[...p.errores, ...p.avisos].join('; ')}
                        </span>
                        <div className="font-mono text-[10px] text-muted truncate" title={p.linea}>{p.linea}</div>
                      </div>
                    ))}
                  </div>
                )}
                {excede && (
                  <p className="text-[10.5px] text-rojo-sunat mt-2 font-semibold">
                    Superas el máximo de {MAX_COMPROBANTES} comprobantes por tanda. Quita algún archivo.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Barra de acción / progreso */}
      <div className="border-t border-bordersoft bg-white px-4 md:px-8 py-3">
        <div className="max-w-[1000px] mx-auto">
          {fase === 'edicion' ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 text-[11.5px] text-muted">
                {totalAEnviar === 0
                  ? (modo === 'tabla' ? 'Pega los comprobantes para empezar.' : 'Agrega uno o más archivos .txt para empezar.')
                  : modo === 'tabla'
                    ? `${resumenTabla.listas} comprobante(s) listos${resumenTabla.conError ? ` · corrige ${resumenTabla.conError} con error` : ''}`
                    : `${resumenArchivos.correctas + resumenArchivos.conAviso} comprobante(s) válidos de ${resumenArchivos.total} línea(s)`}
              </div>
              <button
                onClick={ejecutar}
                disabled={totalAEnviar === 0 || excede}
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
                  {guardado?.modo === 'carpeta' && guardado.nombres.length > 0 && (
                    <span className="text-[11.5px] text-verde font-semibold">
                      Guardado en «{carpeta?.name}»: {guardado.nombres.join(', ')}
                    </span>
                  )}
                  {guardado?.modo === 'descargas' && (
                    <span className="text-[11.5px] text-verde font-semibold">
                      Descargado en tu carpeta de Descargas: {guardado.nombres.join(', ')}
                    </span>
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