import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import PdfViewer from './PdfViewer.jsx'
import Paginador from './Paginador.jsx'
import { usePaginacion } from '../utils/usePaginacion.js'
import { descargarFichaRuc, borrarFichaRuc } from '../services/fichaRucApi.js'
import { nombreSeguroPdf } from '../utils/nombreSeguroPdf.js'
import { descargarBlob } from '../utils/carpetaPc.js'

// ── Constantes globales (mismo estilo que la pantalla Buzón PDF) ────
const REINTENTOS_DESCARGA = 1     // cuántas veces reintenta si la descarga falla
const PRECARGA_COLA = 3           // cuántos PDFs de la cola se descargan por adelantado
const VENTANA_GESTO_MS = 4000     // el celular deja abrir "Compartir" solo ~5 s después del toque (1 s de margen)
const FILAS_POR_PAGINA = 20

const BTN_ICONO = 'w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0'
const BTN_ENVIAR_FILA = 'w-[72px] py-2 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-[#25D366] disabled:opacity-60 text-white text-[11px] font-bold'
const BTN_COLA_BASE = 'py-2.5 rounded-[10px] flex items-center justify-center flex-shrink-0 text-[12px] font-bold'
const ALTO_FILA = 'min-h-[68px]'
const CLAMP_2_LINEAS = { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
const COLOR_VER = 'bg-[#E8F1FA]'
const COLOR_ELIMINAR = 'bg-[#FCE9EB] text-rojo-sunat'
const CLASE_CAMPO = 'w-full h-10 text-[12.5px] text-ink px-2.5 rounded-lg border border-bordersoft bg-white focus:border-azul-inst'
const CLASE_MINI = 'text-[11px] font-semibold text-azul-inst bg-[#EAF1FA] border border-[#C9D6E4] px-2.5 py-1.5 rounded-lg disabled:opacity-60'
const VISOR_CERRADO = { abierto: false, archivo: null, file: null, cargando: false, error: '' }

const claveCache = (a) => `${a.nombre}|${a.kb}` // si la ficha se reemplaza (otro tamaño) se vuelve a bajar

function fechaCorta(iso) {
  const [a, m, d] = String(iso || '').split('-')
  return a && m && d ? `${d}/${m}/${a}` : iso
}

function IconoOjo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0B3A60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/**
 * Lista de fichas guardadas: ver en pantalla, enviar por WhatsApp (uno por uno o en cola) y eliminar.
 * Funciona igual que las notificaciones del Buzón; solo que ordenada por fecha (la más reciente arriba).
 * Props: archivos (lista del servidor), cargado (true cuando ya llegó la lista), onRecargar(), avisar(texto).
 */
export default function FichasGuardadas({ archivos, cargado, onRecargar, avisar }) {
  const { pushLog } = useApp()
  const [filtro, setFiltro] = useState('')
  const [seleccionados, setSeleccionados] = useState(new Set()) // nombres
  const [cola, setCola] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [descargando, setDescargando] = useState(new Set())
  const [visor, setVisor] = useState(VISOR_CERRADO)
  const cacheRef = useRef(new Map())      // clave -> File ya descargado (con nombre seguro)
  const pendientesRef = useRef(new Map()) // clave -> descarga en curso

  // Orden: fecha más reciente primero (la lista del servidor ya viene así; se asegura aquí).
  const ordenadas = useMemo(
    () => [...(archivos || [])].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))),
    [archivos],
  )
  const filtradas = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    return ordenadas.filter((a) => !q || a.nombre.toLowerCase().includes(q))
  }, [ordenadas, filtro])
  const pag = usePaginacion(filtradas.length, FILAS_POR_PAGINA, 'fichas_ruc')
  const pagina = filtradas.slice(pag.desde, pag.hasta)

  // Si una ficha desaparece de la lista (borrada o reemplazada), se quita de la selección.
  useEffect(() => {
    const existentes = new Set(ordenadas.map((a) => a.nombre))
    setSeleccionados((prev) => new Set([...prev].filter((n) => existentes.has(n))))
    setCola((prev) => prev.filter((a) => existentes.has(a.nombre)))
  }, [ordenadas])

  // El gesto/botón "atrás" del celular cierra el visor en vez de salir de la pantalla.
  useEffect(() => {
    if (!visor.abierto) return undefined
    window.history.pushState({ screen: 'ficha-ruc', visor: true }, '', '#ficha-ruc')
    const alVolver = () => setVisor((v) => ({ ...v, abierto: false }))
    window.addEventListener('popstate', alVolver)
    return () => window.removeEventListener('popstate', alVolver)
  }, [visor.abierto])

  // ── Descarga ─────────────────────────────────────────────────────
  async function descargarConReintento(archivo) {
    let ultimoError
    for (let intento = 0; intento <= REINTENTOS_DESCARGA; intento++) {
      try {
        const inicio = Date.now()
        const blob = await descargarFichaRuc(archivo.nombre)
        pushLog(`⬇ Ficha descargada (${Math.round(blob.size / 1024)} KB en ${((Date.now() - inicio) / 1000).toFixed(1)} s)`)
        return blob
      } catch (err) {
        ultimoError = err
        if (intento < REINTENTOS_DESCARGA) pushLog(`⚠ ${err?.message || err} — reintentando…`)
      }
    }
    throw ultimoError
  }

  // Deja el PDF en memoria (como File, con nombre seguro). Si ya está, no lo vuelve a bajar.
  const prepararArchivo = useCallback((archivo) => {
    const clave = claveCache(archivo)
    const enCache = cacheRef.current.get(clave)
    if (enCache) return Promise.resolve(enCache)
    const enCurso = pendientesRef.current.get(clave)
    if (enCurso) return enCurso

    setDescargando((prev) => new Set(prev).add(clave))
    pushLog(`⬇ Descargando "${archivo.nombre}"…`)
    const promesa = (async () => {
      const blob = await descargarConReintento(archivo)
      const file = new File([blob], nombreSeguroPdf(archivo.nombre), { type: 'application/pdf' })
      cacheRef.current.set(clave, file)
      return file
    })().finally(() => {
      pendientesRef.current.delete(clave)
      setDescargando((prev) => {
        const n = new Set(prev)
        n.delete(clave)
        return n
      })
    })
    pendientesRef.current.set(clave, promesa)
    return promesa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cuando empieza (o avanza) la cola, baja por adelantado los próximos PDFs, de uno en uno.
  useEffect(() => {
    if (cola.length === 0) return undefined
    let cancelado = false
    ;(async () => {
      for (const archivo of cola.slice(0, PRECARGA_COLA)) {
        if (cancelado) return
        try {
          await prepararArchivo(archivo)
        } catch (err) {
          pushLog(`✗ No se pudo descargar "${archivo.nombre}": ${err?.message || err}`)
        }
      }
    })()
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cola])

  // ── Compartir ────────────────────────────────────────────────────
  function armarTexto(a) {
    return [fechaCorta(a.fecha), a.razon].filter(Boolean).join(' | ')
  }

  async function compartirArchivo(archivo, file) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(armarTexto(archivo))
        .then(() => pushLog('📋 Texto copiado — pégalo en el mensaje de WhatsApp'))
        .catch((err) => pushLog(`✗ No se pudo copiar el texto: ${err?.message || err}`))
    }
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] })
    } else {
      // Computadora o navegador sin "Compartir": se descarga el PDF.
      descargarBlob(file, file.name)
      avisar?.(`Descargado: ${file.name}`)
    }
  }

  // Un toque: si el PDF ya está descargado lo comparte al instante; si no, lo baja y lo comparte.
  // Si la descarga tarda más de ~4 s (el celular ya no deja abrir "Compartir"), queda listo y se vuelve a tocar.
  async function enviarArchivo(archivo) {
    const inicio = Date.now()
    let file = cacheRef.current.get(claveCache(archivo))
    if (!file) {
      file = await prepararArchivo(archivo)
      if (Date.now() - inicio > VENTANA_GESTO_MS) {
        pushLog('⏱ La descarga tardó y el celular ya no permite abrir "Compartir". El PDF quedó listo: vuelve a tocar "Enviar".')
        return false
      }
    }
    await compartirArchivo(archivo, file)
    return true
  }

  function reportarErrorEnvio(archivo, err) {
    if (err?.name === 'AbortError') pushLog('ℹ Envío cancelado')
    else if (err?.name === 'NotAllowedError') pushLog(`✗ El celular no permitió compartir "${nombreSeguroPdf(archivo.nombre)}" (${err.message}). Usa el botón 👁 para verlo.`)
    else pushLog(`✗ No se pudo enviar: ${err?.name || 'Error'} — ${err?.message || err}`)
  }

  async function enviarUno(archivo) {
    setEnviando(true)
    try { await enviarArchivo(archivo) } catch (err) { reportarErrorEnvio(archivo, err) } finally { setEnviando(false) }
  }

  // ── Visor ────────────────────────────────────────────────────────
  async function verPdf(archivo) {
    const enCache = cacheRef.current.get(claveCache(archivo))
    setVisor({ abierto: true, archivo, file: enCache || null, cargando: !enCache, error: '' })
    if (enCache) return
    try {
      const file = await prepararArchivo(archivo)
      setVisor((v) => (v.archivo?.nombre === archivo.nombre ? { ...v, file, cargando: false } : v))
    } catch (err) {
      setVisor((v) => (v.archivo?.nombre === archivo.nombre ? { ...v, cargando: false, error: err?.message || String(err) } : v))
    }
  }

  const cerrarVisor = () => window.history.back() // el evento "popstate" de arriba es el que lo cierra

  // ── Cola de envío ────────────────────────────────────────────────
  function toggle(nombre) {
    setSeleccionados((prev) => {
      const n = new Set(prev)
      n.has(nombre) ? n.delete(nombre) : n.add(nombre)
      return n
    })
  }
  const todosMarcados = filtradas.length > 0 && filtradas.every((a) => seleccionados.has(a.nombre))
  const alternarTodos = () => setSeleccionados(todosMarcados ? new Set() : new Set(filtradas.map((a) => a.nombre)))
  const iniciarCola = () => setCola(ordenadas.filter((a) => seleccionados.has(a.nombre)))

  async function enviarSiguiente() {
    if (cola.length === 0) return
    const [actual, ...resto] = cola
    setEnviando(true)
    try {
      if (await enviarArchivo(actual)) setCola(resto) // solo avanza si se abrió "Compartir"
    } catch (err) {
      reportarErrorEnvio(actual, err)
    } finally {
      setEnviando(false)
    }
  }
  const saltar = () => setCola((prev) => prev.slice(1))

  // ── Eliminar ─────────────────────────────────────────────────────
  async function borrarLista(lista) {
    let borradas = 0
    for (const a of lista) {
      try {
        const r = await borrarFichaRuc(a.nombre)
        if (r.ok) borradas += 1
        else pushLog(`✗ No se pudo eliminar "${a.nombre}": ${r.error || 'error'}`)
      } catch (err) {
        pushLog(`✗ Error al eliminar "${a.nombre}": ${err?.message || err}`)
      }
    }
    setSeleccionados(new Set())
    if (borradas) {
      pushLog(`🗑 ${borradas} ficha(s) eliminada(s)`)
      avisar?.(borradas === 1 ? 'Ficha eliminada' : `${borradas} fichas eliminadas`)
    }
    onRecargar?.()
  }
  function borrarUna(a) {
    if (window.confirm(`¿Eliminar "${a.nombre}"? Se borra del servidor y no se puede deshacer.`)) borrarLista([a])
  }
  function borrarSeleccionadas() {
    const lista = ordenadas.filter((x) => seleccionados.has(x.nombre))
    if (lista.length && window.confirm(`¿Eliminar ${lista.length} ficha(s) seleccionada(s)? Se borran del servidor y no se puede deshacer.`)) borrarLista(lista)
  }

  const actual = cola[0]
  const actualDescargando = !!actual && descargando.has(claveCache(actual))

  return (
    <div className="bg-white rounded-xl border border-[#F0F3F7] shadow-card p-3.5">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="text-[12px] font-bold text-ink flex-1">Fichas guardadas ({ordenadas.length})</div>
        {ordenadas.length > 0 && (
          <button type="button" onClick={alternarTodos} className="text-[11px] font-semibold text-azul-inst whitespace-nowrap">
            {todosMarcados ? 'Ninguno' : 'Todos'}
          </button>
        )}
        <button type="button" onClick={onRecargar} className={CLASE_MINI}>Actualizar</button>
      </div>

      <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar por nombre…" className={`${CLASE_CAMPO} mb-2`} />

      {filtradas.length === 0 ? (
        <div className="text-[11.5px] text-muted text-center py-6">
          {cargado ? 'Todavía no hay fichas guardadas.' : 'Cargando…'}
        </div>
      ) : (
        pagina.map((a) => {
          const clave = claveCache(a)
          const bajando = descargando.has(clave)
          return (
            <div key={a.nombre} className={`flex gap-2.5 items-center bg-white rounded-xl border border-[#F0F3F7] p-3 mb-2 ${ALTO_FILA}`}>
              <button
                type="button"
                onClick={() => toggle(a.nombre)}
                aria-label="Elegir ficha"
                className={`w-[19px] h-[19px] rounded-md border-[1.6px] flex-shrink-0 flex items-center justify-center text-[12px] ${
                  seleccionados.has(a.nombre) ? 'bg-azul-inst border-azul-inst text-white' : 'border-[#C9D6E4]'
                }`}
              >
                {seleccionados.has(a.nombre) ? '✓' : ''}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold leading-[15px] break-words" style={CLAMP_2_LINEAS}>{a.nombre}</div>
                <div className="text-[10.5px] text-muted truncate">
                  {fechaCorta(a.fecha)} · {a.kb} KB{a.hoy && <span className="font-bold text-verde"> · de hoy</span>}
                </div>
              </div>
              <button type="button" onClick={() => verPdf(a)} className={`${BTN_ICONO} ${COLOR_VER}`} title="Ver PDF" aria-label="Ver PDF">
                <IconoOjo />
              </button>
              <button type="button" onClick={() => enviarUno(a)} disabled={enviando || bajando} className={BTN_ENVIAR_FILA}>
                {bajando ? 'Bajando…' : 'Enviar'}
              </button>
              <button type="button" onClick={() => borrarUna(a)} className={`${BTN_ICONO} ${COLOR_ELIMINAR}`} title="Eliminar" aria-label="Eliminar ficha">
                🗑
              </button>
            </div>
          )
        })
      )}

      {filtradas.length > 0 && <Paginador total={filtradas.length} pag={pag} />}

      {/* Barra de cola / selección (dentro de la tarjeta, para no tapar la barra de Ejecutar) */}
      {cola.length > 0 ? (
        <div className="mt-2 bg-azul-dark rounded-2xl px-4 py-3 flex items-center justify-between gap-2 shadow-float">
          <div className="min-w-0 flex-1">
            <div className="text-white text-[11.5px] font-semibold">Falta{cola.length > 1 ? 'n' : ''} {cola.length}</div>
            <div className="text-white/70 text-[10.5px] truncate">{actual.razon || actual.nombre}</div>
          </div>
          <button type="button" onClick={saltar} disabled={enviando} className={`${BTN_COLA_BASE} w-[60px] bg-white/15 disabled:opacity-60 text-white`}>Saltar</button>
          <button type="button" onClick={enviarSiguiente} disabled={enviando || actualDescargando} className={`${BTN_COLA_BASE} w-[100px] bg-[#25D366] disabled:opacity-60 text-white`}>
            {actualDescargando ? 'Bajando…' : 'Enviar este'}
          </button>
        </div>
      ) : seleccionados.size > 0 && (
        <div className="mt-2 bg-azul-dark rounded-2xl px-4 py-3 flex items-center justify-between gap-2 shadow-float">
          <span className="text-white text-[12px] font-semibold">{seleccionados.size} seleccionada(s)</span>
          <div className="flex gap-2">
            <button type="button" onClick={borrarSeleccionadas} className="bg-rojo-sunat text-white text-[12px] font-bold px-3 py-2.5 rounded-[10px]">Eliminar</button>
            <button type="button" onClick={iniciarCola} className="bg-[#25D366] text-white text-[12px] font-bold px-4 py-2.5 rounded-[10px]">Empezar a enviar</button>
          </div>
        </div>
      )}

      <PdfViewer
        open={visor.abierto}
        onClose={cerrarVisor}
        documento={{ asunto: visor.archivo?.razon || visor.archivo?.nombre, fecha: visor.archivo ? fechaCorta(visor.archivo.fecha) : '', hora: '' }}
        pdfArchivo={visor.file}
        cargando={visor.cargando}
        error={visor.error}
        onDownload={() => visor.file && descargarBlob(visor.file, visor.file.name)}
      />
    </div>
  )
}
