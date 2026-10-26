import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import CustomSelect from '../components/CustomSelect.jsx'
import Toast from '../components/Toast.jsx'
import {
  ejecutarCpe, consultarEstadoCpe, listarArchivosCpe,
  descargarArchivoCpe, descargarZipCpe, borrarTareaCpe,
} from '../services/cpeApi.js'
import {
  COLUMNAS, CAMPOS, MAX_FILAS, PLANTILLA_DEFECTO, PLACEHOLDERS,
  crearFilasVacias, esFilaVacia, asegurarFilaLibre, normalizarCampo,
  validarFilaCacheada, validarPlantilla, nombreEjemplo,
  parsearPortapapeles, aplicarPegado, filaExitosa, textoFallidos,
} from '../utils/cpeTabla.js'
import {
  soportaSelectorCarpeta, elegirCarpeta, asegurarPermiso,
  guardarBlobEnCarpeta, descargarBlob,
} from '../utils/carpetaPc.js'

// ── Medidas y colores (una sola fuente para encabezado Y filas) ─────
// El encabezado y cada fila usan EXACTAMENTE la misma plantilla de columnas,
// todas en píxeles, así nunca se desalinean. La última columna se estira.
const COLUMNAS_GRID = '40px 130px 140px 72px 104px 130px minmax(260px, 1fr)'
const ANCHO_MINIMO_TABLA = 'min-w-[880px]' // suma de las columnas fijas + el mínimo de la última
const ALTURA_FILA = 'h-9'
const ALTURA_MAXIMA_TABLA = 'max-h-[46vh]'

const FONDO_FILA = {
  normal: 'bg-white',
  aviso: 'bg-[#FFF6DB]',
  error: 'bg-[#FCE9EB]',
  ok: 'bg-[#EAF6EF]',
}
const COLOR_TEXTO_OBS = {
  normal: 'text-muted',
  aviso: 'text-[#8A6A00]',
  error: 'text-rojo-sunat',
  ok: 'text-verde',
}

const INTERVALO_ESTADO_MS = 3000
const MAX_FALLOS_RED = 6
const CLAVE_PREFS = 'tributaplus_cpe_prefs'

const TEXTO_ESTADO = {
  en_cola: 'En cola…',
  iniciando_sesion: 'Iniciando sesión en SUNAT (puede tardar unos 30 s)…',
  descargando: 'Descargando comprobantes…',
  completado: 'Descarga terminada en el servidor',
  error: 'La descarga se detuvo con un error',
}

// ── Preferencias recordadas en este navegador (no son datos sensibles) ──
function leerPrefs() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_PREFS) || '{}') || {}
  } catch {
    return {}
  }
}
function guardarPrefs(prefs) {
  try {
    localStorage.setItem(CLAVE_PREFS, JSON.stringify(prefs))
  } catch {
    // sin almacenamiento disponible: no pasa nada
  }
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

// ── Piezas visuales ─────────────────────────────────────────────────
function Encabezado({ onVolver }) {
  return (
    <div className="flex items-center gap-2.5 px-4 md:px-8 pt-3.5 pb-1.5">
      <button onClick={onVolver} className="w-8 h-8 rounded-[9px] bg-white border border-bordersoft flex items-center justify-center flex-shrink-0" aria-label="Volver">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M15 6l-6 6 6 6" stroke="#0B3A60" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
      <div className="font-display font-bold text-[15px]">Descarga de comprobantes SUNAT</div>
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

function Pildora({ activa, onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={activa}
      className={`flex-1 text-[12px] font-semibold py-2 rounded-xl border disabled:opacity-60 ${
        activa ? 'bg-azul-inst text-white border-azul-inst' : 'bg-white text-ink border-bordersoft'
      }`}
    >
      {activa ? '✓ ' : ''}{children}
    </button>
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
            Esta acción necesita pegar datos desde Excel y elegir una carpeta de tu PC para guardar los
            archivos, algo que se hace mejor en una computadora. Ábrela desde tu PC con Chrome o Edge.
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
const Fila = memo(function Fila({ idx, fila, resultado, pedido, bloqueada, onCambio, onSalir, onTecla }) {
  const validacion = validarFilaCacheada(fila)

  let estado = 'normal'
  let observacion = ''
  if (resultado) {
    const exito = filaExitosa(resultado, pedido)
    const logros = []
    if (resultado.pdf_ok) logros.push('PDF')
    if (resultado.xml_ok) logros.push('XML')
    if (pedido.cdr && resultado.cdr_ok && String(fila.serie).toUpperCase() !== 'E001') logros.push('CDR')
    estado = exito ? 'ok' : 'error'
    observacion = exito
      ? `✓ ${logros.join(' · ') || 'Listo'}`
      : `${logros.length ? `Parcial (${logros.join(' · ')}): ` : ''}${resultado.error || 'Sin datos'}`
  } else if (validacion.errores.length) {
    estado = 'error'
    observacion = validacion.errores.join('; ')
  } else if (validacion.avisos.length) {
    estado = 'aviso'
    observacion = validacion.avisos.join('; ')
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
    </div>
  )
})

// ── Pantalla en PC ──────────────────────────────────────────────────
function DescargaCpePc() {
  const { rucs, activeRuc, goScreen, pushLog } = useApp()
  const prefs = useRef(leerPrefs()).current

  // Opciones
  const [rucLogin, setRucLogin] = useState(prefs.ruc || '')
  const [incluirPdf, setIncluirPdf] = useState(prefs.pdf ?? true)
  const [incluirXml, setIncluirXml] = useState(prefs.xml ?? true)
  const [incluirCdr, setIncluirCdr] = useState(prefs.cdr ?? false)
  const [plantilla, setPlantilla] = useState(prefs.plantilla || PLANTILLA_DEFECTO)
  const [carpeta, setCarpeta] = useState(null)

  // Tabla
  const [filas, setFilas] = useState(() => crearFilasVacias())

  // Ejecución
  const [fase, setFase] = useState('edicion') // edicion | ejecutando | guardando | terminado
  const [tarea, setTarea] = useState(null)
  const [resultados, setResultados] = useState({}) // índice de la tabla -> resultado del servidor
  const [pedidoEjecutado, setPedidoEjecutado] = useState({ pdf: true, xml: true, cdr: false })
  const [errorGeneral, setErrorGeneral] = useState('')
  const [detalleErrores, setDetalleErrores] = useState([])
  const [guardado, setGuardado] = useState(null) // { modo, hechos, total, fallidos }
  const [errorGuardado, setErrorGuardado] = useState('')
  const [pendienteGuardar, setPendienteGuardar] = useState(false)
  const [toast, setToast] = useState('')
  const cerrarToast = useCallback(() => setToast(''), [])

  // Referencias: valores que los temporizadores necesitan "frescos"
  const indicesRef = useRef([]) // fila del servidor (1, 2, 3…) -> índice en la tabla
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

  // RUC por defecto: el recordado, o el RUC activo de la app.
  useEffect(() => {
    if (rucLogin) return
    const recordado = rucs.find((r) => r.ruc === prefs.ruc)?.ruc
    const candidato = recordado || activeRuc?.ruc || ''
    if (candidato) setRucLogin(candidato)
  }, [rucs, activeRuc]) // eslint-disable-line

  useEffect(() => {
    guardarPrefs({ ruc: rucLogin, pdf: incluirPdf, xml: incluirXml, cdr: incluirCdr, plantilla })
  }, [rucLogin, incluirPdf, incluirXml, incluirCdr, plantilla])

  // Mientras se descarga o se guarda, avisar si intenta cerrar la pestaña.
  useEffect(() => {
    if (fase !== 'ejecutando' && fase !== 'guardando') return undefined
    const avisar = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [fase])

  const bloqueada = fase !== 'edicion'
  const soportaCarpeta = soportaSelectorCarpeta()
  const errorPlantilla = validarPlantilla(plantilla)
  const opcionesRuc = useMemo(
    () => rucs.map((r) => ({ value: r.ruc, label: `${r.razonSocial} · ${r.ruc}` })),
    [rucs]
  )

  const resumen = useMemo(() => {
    let listas = 0
    let conError = 0
    let conAviso = 0
    filas.forEach((f) => {
      const v = validarFilaCacheada(f)
      if (v.vacia) return
      if (v.errores.length) conError += 1
      else {
        listas += 1
        if (v.avisos.length) conAviso += 1
      }
    })
    return { listas, conError, conAviso }
  }, [filas])

  // ── Edición de la tabla ───────────────────────────────────────────
  const cambiarCampo = useCallback((idx, campo, valor) => {
    setFilas((prev) => {
      const sig = prev.slice()
      sig[idx] = { ...prev[idx], [campo]: valor }
      return asegurarFilaLibre(sig)
    })
  }, [])

  // Al salir de una celda se normaliza (tipo "1" -> "01", serie en mayúsculas).
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

  const moverConTeclas = useCallback((e, idx, col) => {
    const delta = e.key === 'Enter' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
    if (!delta) return
    const siguiente = document.querySelector(`[data-celda="${idx + delta}-${col}"]`)
    if (siguiente) {
      e.preventDefault()
      siguiente.focus()
      siguiente.select?.()
    }
  }, [])

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
    if (r.filasRecortadas) notas.push(`${r.filasRecortadas} fila(s) no caben (máximo ${MAX_FILAS})`)
    setToast(`Se pegaron ${r.filasPegadas} fila(s)`)
    if (notas.length) pushLog(`⚠ Pegado: ${notas.join('; ')}.`)
  }

  // Ctrl+V sobre la tabla: si es una sola celda de texto, se deja pegar normal;
  // si son varias filas/columnas, se reparte como lo hace Excel.
  function alPegar(e) {
    if (bloqueada) return
    const matriz = parsearPortapapeles(e.clipboardData?.getData('text') ?? '')
    if (matriz.length === 0) return
    if (matriz.length === 1 && matriz[0].length === 1) return
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
    reiniciarResultados()
  }

  function agregarFila() {
    setFilas((prev) => (prev.length >= MAX_FILAS ? prev : [...prev, ...crearFilasVacias(1)]))
  }

  // ── Carpeta de la PC ──────────────────────────────────────────────
  async function elegirCarpetaDestino() {
    try {
      const handle = await elegirCarpeta()
      setCarpeta(handle)
    } catch (err) {
      if (err?.name !== 'AbortError') {
        pushLog(`⚠ No se pudo elegir esa carpeta: ${err?.message || err}. Prueba con otra (por ejemplo, una subcarpeta nueva).`)
      }
    }
  }

  // ── Seguimiento de la tarea en el servidor ────────────────────────
  function reiniciarResultados() {
    setFase('edicion')
    setTarea(null)
    setResultados({})
    setErrorGeneral('')
    setDetalleErrores([])
    setGuardado(null)
    setErrorGuardado('')
    setPendienteGuardar(false)
    tareaIdRef.current = null
  }

  function aplicarEstado(est) {
    setTarea(est)
    const mapa = {}
    ;(est.filas || []).forEach((f) => {
      const idxTabla = indicesRef.current[f.fila - 1]
      if (idxTabla !== undefined) mapa[idxTabla] = f
    })
    setResultados(mapa)
  }

  // Trae los archivos del servidor y los deja en la carpeta elegida (o en un .zip).
  const guardarResultados = useCallback(async (id, conGesto) => {
    setFase('guardando')
    setErrorGuardado('')
    setPendienteGuardar(false)
    try {
      const lista = await listarArchivosCpe(id)
      if (!lista.ok) throw new Error(lista.error || 'No se pudo leer la lista de archivos')
      const archivos = lista.archivos || []

      if (archivos.length === 0) {
        setGuardado({ modo: 'nada', hechos: 0, total: 0, fallidos: 0 })
        await borrarTareaCpe(id).catch(() => {})
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
        let fallidos = 0
        for (let i = 0; i < archivos.length; i += 1) {
          try {
            const blob = await descargarArchivoCpe(id, archivos[i].ruta)
            await guardarBlobEnCarpeta(destino, archivos[i].ruta, blob)
          } catch {
            fallidos += 1
          }
          if (!vivoRef.current) return
          setGuardado({ modo: 'carpeta', hechos: i + 1, total: archivos.length, fallidos })
        }
        if (fallidos > 0) {
          setErrorGuardado(`${fallidos} archivo(s) no se pudieron guardar. Los archivos siguen en el servidor unas horas.`)
          setPendienteGuardar(true)
        } else {
          await borrarTareaCpe(id).catch(() => {})
          pushLog(`✓ ${archivos.length} archivo(s) guardados en tu carpeta`)
        }
      } else {
        const zip = await descargarZipCpe(id)
        descargarBlob(zip, `comprobantes_${id}.zip`)
        setGuardado({ modo: 'zip', hechos: archivos.length, total: archivos.length, fallidos: 0 })
        await borrarTareaCpe(id).catch(() => {})
        pushLog(`✓ Se descargó un .zip con ${archivos.length} archivo(s)`)
      }
      setFase('terminado')
    } catch (err) {
      setErrorGuardado(`No se pudieron guardar los archivos: ${err?.message || err}`)
      setPendienteGuardar(true)
      setFase('terminado')
    }
  }, [pushLog])

  async function vigilar(id) {
    if (!vivoRef.current) return
    try {
      const est = await consultarEstadoCpe(id)
      if (!vivoRef.current) return
      fallosRedRef.current = 0
      if (!est.ok) {
        setErrorGeneral(
          'El servidor ya no recuerda esta tarea (¿se reinició?). Puedes intentar recuperar los archivos que alcanzaron a descargarse.'
        )
        setPendienteGuardar(true)
        setFase('terminado')
        return
      }
      aplicarEstado(est)
      if (est.estado === 'completado') {
        await guardarResultados(id, false)
        return
      }
      if (est.estado === 'error') {
        setErrorGeneral(est.mensaje || 'La descarga falló.')
        pushLog(`✗ Descarga de comprobantes: ${est.mensaje || 'error'}`)
        setFase('terminado')
        return
      }
    } catch {
      fallosRedRef.current += 1
      if (fallosRedRef.current >= MAX_FALLOS_RED) {
        setErrorGeneral('Se perdió la conexión con el servidor. Revisa tu internet; la descarga puede seguir en el servidor.')
        setPendienteGuardar(true)
        setFase('terminado')
        return
      }
    }
    timerRef.current = setTimeout(() => vigilar(id), INTERVALO_ESTADO_MS)
  }

  async function ejecutar() {
    setErrorGeneral('')
    setDetalleErrores([])
    if (!rucLogin) {
      setErrorGeneral('Elige el RUC con el que se inicia sesión en SUNAT.')
      return
    }
    if (!incluirPdf && !incluirXml && !incluirCdr) {
      setErrorGeneral('Marca al menos un tipo de archivo: PDF, XML o CDR.')
      return
    }
    if (errorPlantilla) {
      setErrorGeneral(`Nombre de archivo: ${errorPlantilla}`)
      return
    }

    const indices = []
    const comprobantes = []
    filas.forEach((f, i) => {
      if (esFilaVacia(f)) return
      indices.push(i)
      comprobantes.push({
        op: normalizarCampo('op', f.op),
        ruc_emisor: normalizarCampo('ruc_emisor', f.ruc_emisor),
        tipo: normalizarCampo('tipo', f.tipo),
        serie: normalizarCampo('serie', f.serie),
        numero: normalizarCampo('numero', f.numero),
      })
    })
    if (comprobantes.length === 0) {
      setErrorGeneral('La tabla está vacía. Pega los comprobantes desde Excel.')
      return
    }
    if (resumen.conError > 0) {
      setErrorGeneral(`Hay ${resumen.conError} fila(s) con error (en rojo). Corrígelas o bórralas antes de descargar.`)
      return
    }

    setResultados({})
    setGuardado(null)
    setErrorGuardado('')
    setPendienteGuardar(false)
    setPedidoEjecutado({ pdf: incluirPdf, xml: incluirXml, cdr: incluirCdr })
    setTarea({ estado: 'en_cola', total: comprobantes.length, procesados: 0 })
    setFase('ejecutando')

    try {
      const res = await ejecutarCpe({
        ruc: rucLogin,
        comprobantes,
        incluir_pdf: incluirPdf,
        incluir_xml: incluirXml,
        incluir_cdr: incluirCdr,
        plantilla: plantilla.trim(),
      })
      if (!res.ok) {
        setErrorGeneral(res.error || 'No se pudo iniciar la descarga.')
        setDetalleErrores(res.detalle || [])
        setTarea(null)
        setFase('edicion')
        return
      }
      indicesRef.current = indices
      tareaIdRef.current = res.tarea_id
      fallosRedRef.current = 0
      pushLog(`Descargando ${res.total} comprobante(s)…`)
      vigilar(res.tarea_id)
    } catch (err) {
      setErrorGeneral(`No se pudo conectar con el servidor: ${err?.message || err}`)
      setTarea(null)
      setFase('edicion')
    }
  }

  async function copiarFallidos() {
    const texto = textoFallidos(filas, indicesRef.current, resultados, pedidoEjecutado)
    if (!texto) {
      setToast('No hay comprobantes fallidos')
      return
    }
    try {
      await navigator.clipboard.writeText(texto)
      setToast('Fallidos copiados — pégalos en Excel')
    } catch {
      pushLog('⚠ No se pudo copiar al portapapeles.')
    }
  }

  function reintentarFallidos() {
    const fallidas = indicesRef.current
      .filter((idx) => resultados[idx] && !filaExitosa(resultados[idx], pedidoEjecutado))
      .map((idx) => filas[idx])
    setFilas(asegurarFilaLibre(fallidas.length ? fallidas : crearFilasVacias()))
    reiniciarResultados()
  }

  // ── Resumen del resultado ─────────────────────────────────────────
  const idsEnviados = indicesRef.current
  const exitosas = idsEnviados.filter((idx) => resultados[idx] && filaExitosa(resultados[idx], pedidoEjecutado)).length
  const fallidas = idsEnviados.filter((idx) => resultados[idx] && !filaExitosa(resultados[idx], pedidoEjecutado)).length
  const total = tarea?.total || 0
  const procesados = tarea?.procesados || 0
  const porcentaje = total ? Math.round((procesados / total) * 100) : 0
  const textoEstado = fase === 'guardando' ? 'Guardando archivos…' : TEXTO_ESTADO[tarea?.estado] || ''

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <Toast message={toast} onDone={cerrarToast} />
      <Encabezado onVolver={() => goScreen('inicio')} />

      <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-2 pb-6">
        <div className="max-w-[1100px] mx-auto">
          {errorGeneral && (
            <div className="mb-3 bg-[#FCE9EB] text-rojo-sunat text-[11.5px] rounded-xl px-3 py-2.5">
              <div className="font-semibold">{errorGeneral}</div>
              {detalleErrores.length > 0 && (
                <ul className="mt-1 list-disc pl-4">
                  {detalleErrores.slice(0, 6).map((d, i) => <li key={i}>{d}</li>)}
                  {detalleErrores.length > 6 && <li>… y {detalleErrores.length - 6} más</li>}
                </ul>
              )}
            </div>
          )}

          {pendienteGuardar && (
            <div className="mb-3 bg-[#FFF6DB] text-[#8A6A00] text-[11.5px] rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
              <span>{errorGuardado || 'Los archivos siguen en el servidor. Puedes guardarlos ahora.'}</span>
              <button
                onClick={() => guardarResultados(tareaIdRef.current, true)}
                disabled={!tareaIdRef.current}
                className="font-bold underline whitespace-nowrap disabled:opacity-50"
              >
                Guardar archivos ahora
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
            <Tarjeta numero="1" titulo="RUC con el que inicias sesión">
              <CustomSelect
                value={rucLogin}
                onChange={setRucLogin}
                options={opcionesRuc}
                placeholder="Elegir RUC…"
                title="RUC para iniciar sesión"
                className="w-full"
              />
              <p className="text-[10.5px] text-muted mt-2">
                Es el RUC que consulta los comprobantes (la clave se toma de tu hoja de RUCs). Los emisores van en la tabla.
              </p>
            </Tarjeta>

            <Tarjeta numero="2" titulo="Qué descargar y cómo nombrarlo">
              <div className="flex gap-2 mb-2.5">
                <Pildora activa={incluirPdf} onClick={() => setIncluirPdf((v) => !v)} disabled={bloqueada}>PDF</Pildora>
                <Pildora activa={incluirXml} onClick={() => setIncluirXml((v) => !v)} disabled={bloqueada}>XML</Pildora>
                <Pildora activa={incluirCdr} onClick={() => setIncluirCdr((v) => !v)} disabled={bloqueada}>CDR</Pildora>
              </div>
              <label className="text-[10.5px] font-semibold text-muted block mb-1">Nombre de archivo</label>
              <input
                value={plantilla}
                onChange={(e) => setPlantilla(e.target.value)}
                disabled={bloqueada}
                spellCheck={false}
                className={`w-full text-[12px] font-mono px-3 py-2 rounded-lg border bg-white disabled:opacity-70 ${errorPlantilla ? 'border-rojo-sunat' : 'border-bordersoft'}`}
              />
              {errorPlantilla ? (
                <p className="text-[10.5px] text-rojo-sunat mt-1">{errorPlantilla}</p>
              ) : (
                <p className="text-[10.5px] text-muted mt-1">
                  Ejemplo: <span className="font-mono">{nombreEjemplo(plantilla.trim(), filas.find((f) => !esFilaVacia(f)))}</span>
                  <br />Puedes usar {PLACEHOLDERS.map((p) => `{${p}}`).join(' ')}
                </p>
              )}
            </Tarjeta>

            <Tarjeta numero="3" titulo="Dónde guardar los archivos">
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
                      Se guardará en <span className="font-semibold">«{carpeta.name}»</span>, dentro de
                      carpetas <span className="font-mono">{rucLogin || 'RUC'}/PDF</span>, <span className="font-mono">XML</span> y <span className="font-mono">CDR</span>.
                    </p>
                  ) : (
                    <p className="text-[10.5px] text-muted mt-2">
                      Sin carpeta elegida: al terminar se descargará un archivo .zip. Si Chrome no te deja elegir una
                      carpeta (por ejemplo Descargas o Documentos), crea una subcarpeta dentro y elígela.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[11px] text-[#8A6A00] bg-[#FFF6DB] rounded-lg px-3 py-2">
                  Tu navegador no puede elegir carpetas (solo Chrome y Edge en computadora). Al terminar se
                  descargará un archivo .zip con todo.
                </p>
              )}
            </Tarjeta>
          </div>

          <div className="bg-white rounded-xl border border-[#F0F3F7] shadow-card p-3.5">
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="w-5 h-5 rounded-full bg-azul-inst text-white text-[10.5px] font-bold flex items-center justify-center flex-shrink-0">4</span>
              <div className="text-[12px] font-bold text-ink">Comprobantes</div>
              <div className="text-[10.5px] text-muted">
                {resumen.listas} listas
                {resumen.conAviso > 0 && ` (${resumen.conAviso} con aviso)`}
                {resumen.conError > 0 && <span className="text-rojo-sunat font-semibold"> · {resumen.conError} con error</span>}
              </div>
              <div className="flex-1" />
              <button onClick={pegarDesdeBoton} disabled={bloqueada} className="text-[11.5px] font-bold text-white bg-azul-inst px-3 py-1.5 rounded-lg disabled:opacity-60">
                Pegar desde Excel
              </button>
              <button onClick={agregarFila} disabled={bloqueada} className="text-[11.5px] font-semibold text-ink bg-white border border-bordersoft px-3 py-1.5 rounded-lg disabled:opacity-60">
                + Fila
              </button>
              <button onClick={limpiarTabla} disabled={bloqueada} className="text-[11.5px] font-semibold text-rojo-sunat bg-white border border-bordersoft px-3 py-1.5 rounded-lg disabled:opacity-60">
                Limpiar
              </button>
            </div>
            <p className="text-[10.5px] text-muted mb-2">
              En Excel copia las 5 columnas (Cód. operación, RUC emisor, Tipo, Serie, Número), haz clic en la primera
              celda de abajo y presiona <span className="font-semibold">Ctrl+V</span>. Máximo {MAX_FILAS} por tanda.
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
                </div>
                {filas.map((f, i) => (
                  <Fila
                    key={i}
                    idx={i}
                    fila={f}
                    resultado={resultados[i]}
                    pedido={pedidoEjecutado}
                    bloqueada={bloqueada}
                    onCambio={cambiarCampo}
                    onSalir={normalizarAlSalir}
                    onTecla={moverConTeclas}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de acción / progreso */}
      <div className="border-t border-bordersoft bg-white px-4 md:px-8 py-3">
        <div className="max-w-[1100px] mx-auto">
          {fase === 'edicion' ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 text-[11.5px] text-muted">
                {resumen.listas + resumen.conError === 0
                  ? 'Pega los comprobantes para empezar.'
                  : `${resumen.listas} comprobante(s) listos${resumen.conError ? ` · corrige ${resumen.conError} con error` : ''}`}
              </div>
              <button
                onClick={ejecutar}
                disabled={resumen.listas === 0}
                className="bg-azul-dark disabled:opacity-60 text-white text-[13px] font-bold px-8 py-3 rounded-2xl shadow-float"
              >
                Descargar{resumen.listas ? ` ${resumen.listas}` : ''}
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="text-[12px] font-bold text-ink">
                  {textoEstado}
                  {tarea?.estado === 'descargando' && ` (${procesados}/${total})`}
                  {fase === 'guardando' && guardado && ` ${guardado.hechos}/${guardado.total}`}
                </div>
                <div className="text-[11px] text-muted">
                  {fase === 'terminado' && `✓ ${exitosas} bien · ${fallidas} con problema`}
                </div>
              </div>
              <div className="h-2 rounded-full bg-[#EAF1FA] overflow-hidden mb-2">
                <div
                  className={`h-2 rounded-full transition-all ${fase === 'terminado' && (fallidas > 0 || errorGeneral) ? 'bg-ambar' : 'bg-azul-inst'}`}
                  style={{ width: `${fase === 'terminado' ? 100 : porcentaje}%` }}
                />
              </div>
              {fase === 'terminado' && (
                <div className="flex flex-wrap items-center gap-2">
                  {guardado?.modo === 'carpeta' && guardado.fallidos === 0 && (
                    <span className="text-[11.5px] text-verde font-semibold">{guardado.total} archivo(s) guardados en «{carpeta?.name}»</span>
                  )}
                  {guardado?.modo === 'zip' && (
                    <span className="text-[11.5px] text-verde font-semibold">Se descargó el .zip con {guardado.total} archivo(s)</span>
                  )}
                  {guardado?.modo === 'nada' && (
                    <span className="text-[11.5px] text-[#8A6A00] font-semibold">No se generó ningún archivo</span>
                  )}
                  <div className="flex-1" />
                  {fallidas > 0 && (
                    <>
                      <button onClick={copiarFallidos} className="text-[11.5px] font-semibold text-ink bg-white border border-bordersoft px-3 py-1.5 rounded-lg">Copiar fallidos</button>
                      <button onClick={reintentarFallidos} className="text-[11.5px] font-semibold text-azul-inst bg-[#EAF1FA] border border-[#C9D6E4] px-3 py-1.5 rounded-lg">Reintentar solo fallidos</button>
                    </>
                  )}
                  <button onClick={reiniciarResultados} className="text-[11.5px] font-bold text-white bg-azul-dark px-4 py-1.5 rounded-lg">Nueva descarga</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DescargaCpeScreen() {
  const { goScreen } = useApp()
  const esCelular = useEsCelular()
  return esCelular ? <AvisoSoloPc onVolver={() => goScreen('inicio')} /> : <DescargaCpePc />
}
