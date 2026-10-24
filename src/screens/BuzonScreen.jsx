import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { listarPdfs, obtenerPdfBlob, eliminarPdf } from '../services/buzonApi.js'

// ── Constantes globales ─────────────────────────────────────────────
const TIMEOUT_DESCARGA_MS = 30000 // máximo de espera por cada descarga de PDF
const REINTENTOS_DESCARGA = 1     // cuántas veces reintenta si la descarga falla
const PRECARGA_COLA = 3           // cuántos PDFs de la cola se descargan por adelantado
const VENTANA_GESTO_MS = 4000     // el celular deja abrir "Compartir" solo ~5 s después del toque (1 s de margen)
const NOMBRE_SEGURO_MAX = 100     // largo máximo del nombre del PDF cuando se comparte

// Estilos reutilizables: todos los botones de una misma fila comparten alto y radio.
const BTN_ICONO = 'w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0'      // Ver y Eliminar (mismo tamaño)
const BTN_ENVIAR_FILA = 'w-[72px] py-2 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-[#25D366] disabled:opacity-60 text-white text-[11px] font-bold'
const BTN_COLA_BASE = 'py-2.5 rounded-[10px] flex items-center justify-center flex-shrink-0 text-[12px] font-bold'
const COLOR_VER = 'bg-[#E8F1FA]'
const COLOR_ELIMINAR = 'bg-[#FCE9EB] text-rojo-sunat'

// Abre el PDF en el visor de Drive (no descarga nada del servidor).
const urlVerDrive = (id) => `https://drive.google.com/file/d/${id}/view`

// Deja el nombre del PDF "limpio" para compartirlo: sin tildes, sin paréntesis, sin °,
// sin puntos dobles ni puntos al final, y con largo máximo. Algunos nombres de SUNAT
// traen caracteres que el celular rechaza al compartir ("Permission denied").
// Solo cambia el nombre que recibe WhatsApp; el archivo en Drive NO se modifica.
function nombreSeguroPdf(nombre) {
  let base = String(nombre || 'documento').replace(/\.pdf$/i, '')
  base = base.normalize('NFD').replace(/[̀-ͯ]/g, '')  // quita tildes
  base = base.replace(/[^A-Za-z0-9 _.-]/g, ' ')                 // quita °, paréntesis, #, etc.
  base = base.replace(/\.{2,}/g, '.').replace(/\s+/g, ' ')      // sin puntos dobles ni espacios dobles
  base = base.replace(/^[\s.]+|[\s.]+$/g, '')                   // sin puntos/espacios al inicio o al final
  base = base.slice(0, NOMBRE_SEGURO_MAX).replace(/[\s.]+$/g, '')
  return `${base || 'documento'}.pdf`
}

function IconoOjo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0B3A60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export default function BuzonScreen() {
  const { goScreen, pushLog } = useApp()
  const [fecha, setFecha] = useState(() => {
    const ahora = new Date()
    const peru = new Date(ahora.getTime() - 5 * 60 * 60 * 1000) // Peru = UTC-5
    return peru.toISOString().slice(0, 10)
  })
  const [archivos, setArchivos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [colaEnvio, setColaEnvio] = useState([])

  // PDFs que se están descargando ahora (para mostrar "Bajando…").
  const [descargando, setDescargando] = useState(new Set())
  const cacheRef = useRef(new Map())      // id -> File ya descargado (con nombre seguro)
  const pendientesRef = useRef(new Map()) // id -> descarga en curso (evita descargar 2 veces lo mismo)

  async function cargar() {
    setCargando(true)
    try {
      const res = await listarPdfs(fecha)
      if (res.ok) {
        const ordenados = [...res.archivos].sort((a, b) => {
            const claveA = `${a.fecha?.split('/').reverse().join('-') || ''} ${a.hora || ''}`
            const claveB = `${b.fecha?.split('/').reverse().join('-') || ''} ${b.hora || ''}`
            return claveB.localeCompare(claveA) // orden descendente: mas reciente primero
        })
        setArchivos(ordenados)
      } else {
        pushLog(`✗ ${res.error}`)
        setArchivos([])
      }
    } catch (err) {
      pushLog(`✗ Error: ${err?.message || err}`)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
    setSeleccionados(new Set())
    cacheRef.current.clear()
  }, [fecha]) // eslint-disable-line

  // Cuando empieza (o avanza) la cola, descarga por adelantado los próximos PDFs,
  // de uno en uno, para no saturar el servidor.
  useEffect(() => {
    if (colaEnvio.length === 0) return
    let cancelado = false
    ;(async () => {
      for (const archivo of colaEnvio.slice(0, PRECARGA_COLA)) {
        if (cancelado) return
        try {
          await prepararArchivo(archivo)
        } catch (err) {
          pushLog(`✗ No se pudo descargar "${archivo.nombre}": ${err?.message || err}`)
        }
      }
    })()
    return () => { cancelado = true }
  }, [colaEnvio]) // eslint-disable-line

  function toggle(id) {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function armarTexto(archivo) {
    const fechaHora = [archivo.fecha, archivo.hora].filter(Boolean).join(' ')
    const partes = [fechaHora, archivo.razon].filter(Boolean)
    return partes.join(' | ')
  }

  // ── Descarga ─────────────────────────────────────────────────────

  // Descarga el PDF con límite de tiempo y un reintento automático.
  async function descargarConReintento(archivo) {
    let ultimoError
    for (let intento = 0; intento <= REINTENTOS_DESCARGA; intento++) {
      try {
        const inicio = Date.now()
        const blob = await obtenerPdfBlob(archivo.id, { timeoutMs: TIMEOUT_DESCARGA_MS })
        const seg = ((Date.now() - inicio) / 1000).toFixed(1)
        pushLog(`⬇ PDF descargado (${Math.round(blob.size / 1024)} KB en ${seg} s)`)
        return blob
      } catch (err) {
        ultimoError = err
        if (intento < REINTENTOS_DESCARGA) pushLog(`⚠ ${err?.message || err} — reintentando…`)
      }
    }
    throw ultimoError
  }

  // Deja el PDF descargado en memoria (como File, con nombre seguro). Si ya está, no lo vuelve a bajar.
  function prepararArchivo(archivo) {
    const enCache = cacheRef.current.get(archivo.id)
    if (enCache) return Promise.resolve(enCache)

    const enCurso = pendientesRef.current.get(archivo.id)
    if (enCurso) return enCurso

    setDescargando((prev) => new Set(prev).add(archivo.id))
    pushLog(`⬇ Descargando "${archivo.nombre}"…`)

    const promesa = (async () => {
      const blob = await descargarConReintento(archivo)
      const file = new File([blob], nombreSeguroPdf(archivo.nombre), { type: 'application/pdf' })
      cacheRef.current.set(archivo.id, file)
      return file
    })().finally(() => {
      pendientesRef.current.delete(archivo.id)
      setDescargando((prev) => {
        const next = new Set(prev)
        next.delete(archivo.id)
        return next
      })
    })

    pendientesRef.current.set(archivo.id, promesa)
    return promesa
  }

  // ── Compartir ────────────────────────────────────────────────────

  // Copia el texto y abre el menú "Compartir" del celular.
  async function compartirArchivo(archivo, file) {
    // Copiar el texto no se espera (sin await) para no perder tiempo del toque.
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(armarTexto(archivo))
        .then(() => pushLog('📋 Texto copiado — pégalo en el mensaje de WhatsApp'))
        .catch((err) => pushLog(`✗ No se pudo copiar el texto: ${err?.message || err}`))
    } else {
      pushLog('⚠ Este navegador no permite copiar el texto automáticamente')
    }

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] })
    } else {
      window.open(URL.createObjectURL(file), '_blank')
    }
  }

  // Un solo toque: si el PDF ya está descargado lo comparte al instante; si no, lo descarga
  // y lo comparte enseguida. Solo si la descarga tarda más de ~4 s (el celular ya no deja
  // abrir "Compartir"), queda listo y hay que volver a tocar "Enviar".
  // Devuelve true si se abrió el menú de compartir.
  async function enviarArchivo(archivo) {
    const inicio = Date.now()
    let file = cacheRef.current.get(archivo.id)
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
    if (err?.name === 'AbortError') {
      pushLog('ℹ Envío cancelado')
    } else if (err?.name === 'NotAllowedError') {
      pushLog(`✗ El celular no permitió compartir "${nombreSeguroPdf(archivo.nombre)}" (${err.message}). Usa el botón 👁 para verlo.`)
    } else {
      pushLog(`✗ No se pudo enviar: ${err?.name || 'Error'} — ${err?.message || err}`)
    }
  }

  async function enviarUno(archivo) {
    setEnviando(true)
    try {
      await enviarArchivo(archivo)
    } catch (err) {
      reportarErrorEnvio(archivo, err)
    } finally {
      setEnviando(false)
    }
  }

  function verPdf(archivo) {
    window.open(urlVerDrive(archivo.id), '_blank', 'noopener')
  }

  // ── Cola de envío ────────────────────────────────────────────────

  function iniciarEnvioSeleccionados() {
     if (seleccionados.size === 0) return
     const lista = archivos.filter((a) => seleccionados.has(a.id))
     setColaEnvio(lista)
  }

  async function enviarSiguienteDeLaCola() {
      if (colaEnvio.length === 0) return
      const [actual, ...resto] = colaEnvio
      setEnviando(true)
      try {
        const compartido = await enviarArchivo(actual)
        if (compartido) setColaEnvio(resto) // solo avanza si se abrió "Compartir"
      } catch (err) {
        reportarErrorEnvio(actual, err)
      } finally {
        setEnviando(false)
      }
  }

  // Pasa al siguiente sin enviar el actual (por si uno falla).
  function saltarDeLaCola() {
    setColaEnvio((prev) => prev.slice(1))
  }

  // ── Eliminar ─────────────────────────────────────────────────────

  async function borrarUno(archivo) {
    const confirmar = window.confirm(`¿Eliminar "${archivo.nombre}"? Esto lo borra también de Drive, no se puede deshacer.`)
    if (!confirmar) return
    try {
      const res = await eliminarPdf(archivo.id)
      if (res.ok) {
        cacheRef.current.delete(archivo.id)
        setArchivos((prev) => prev.filter((a) => a.id !== archivo.id))
        pushLog(`🗑 Eliminado: ${archivo.nombre}`)
      } else {
        pushLog(`✗ No se pudo eliminar: ${res.error}`)
      }
    } catch (err) {
      pushLog(`✗ Error al eliminar: ${err?.message || err}`)
    }
  }

  async function borrarSeleccionados() {
    const lista = archivos.filter((a) => seleccionados.has(a.id))
    const confirmar = window.confirm(`¿Eliminar ${lista.length} PDF(s) seleccionados? Esto los borra también de Drive, no se puede deshacer.`)
    if (!confirmar) return
    for (const archivo of lista) {
      try {
        const res = await eliminarPdf(archivo.id)
        if (res.ok) {
          cacheRef.current.delete(archivo.id)
          setArchivos((prev) => prev.filter((a) => a.id !== archivo.id))
        } else {
          pushLog(`✗ No se pudo eliminar "${archivo.nombre}": ${res.error}`)
        }
      } catch (err) {
        pushLog(`✗ Error al eliminar "${archivo.nombre}": ${err?.message || err}`)
      }
    }
    setSeleccionados(new Set())
    pushLog(`🗑 ${lista.length} PDF(s) eliminados`)
  }

  // Datos del archivo que sigue en la cola (para la barra inferior).
  const actualCola = colaEnvio[0]
  const actualDescargando = !!actualCola && descargando.has(actualCola.id)

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-1.5">
        <button onClick={() => goScreen('buzon-ejecutar')} className="w-8 h-8 rounded-[9px] bg-white border border-bordersoft flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="#0B3A60" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="font-display font-bold text-[15px]">Buzón PDF</div>
      </div>

      <div className="px-4 pt-1 pb-2 flex items-center gap-2">
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="flex-1 text-[12.5px] px-3 py-2 rounded-xl border border-bordersoft"
        />
        {archivos.length > 0 && (
          <button
            onClick={() => setSeleccionados(seleccionados.size === archivos.length ? new Set() : new Set(archivos.map((a) => a.id)))}
            className="text-[11px] font-semibold text-azul-inst whitespace-nowrap"
          >
            {seleccionados.size === archivos.length ? 'Ninguno' : 'Todos'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-[90px]">
        {cargando && <div className="text-center text-muted text-[12px] py-10">Cargando…</div>}

        {!cargando && archivos.length === 0 && (
          <div className="text-center text-muted text-[12px] py-10">Sin PDFs para esta fecha.</div>
        )}

        {!cargando && archivos.map((a) => (
          <div key={a.id} className="flex gap-2.5 items-center bg-white rounded-xl border border-[#F0F3F7] p-3 mb-2">
            <button
              onClick={() => toggle(a.id)}
              className={`w-[19px] h-[19px] rounded-md border-[1.6px] flex-shrink-0 flex items-center justify-center text-[12px] ${
                seleccionados.has(a.id) ? 'bg-azul-inst border-azul-inst text-white' : 'border-[#C9D6E4]'
              }`}
            >
              {seleccionados.has(a.id) ? '✓' : ''}
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold truncate">{a.nombre}</div>
              {(a.fecha || a.razon) && (
                <div className="text-[10.5px] text-muted truncate">{armarTexto(a)}</div>
              )}
            </div>
            <button
              onClick={() => verPdf(a)}
              className={`${BTN_ICONO} ${COLOR_VER}`}
              title="Ver PDF"
            >
              <IconoOjo />
            </button>
            <button
              onClick={() => enviarUno(a)}
              disabled={enviando || descargando.has(a.id)}
              className={BTN_ENVIAR_FILA}
            >
              {descargando.has(a.id) ? 'Bajando…' : 'Enviar'}
            </button>
            <button
              onClick={() => borrarUno(a)}
              className={`${BTN_ICONO} ${COLOR_ELIMINAR}`}
              title="Eliminar"
            >
              🗑
            </button>
          </div>
        ))}
      </div>

      {colaEnvio.length > 0 ? (
         <div className="absolute left-3.5 right-3.5 bottom-3.5 z-[15] bg-azul-dark rounded-2xl px-4 py-3 flex items-center justify-between gap-2 shadow-float">
             <div className="min-w-0 flex-1">
                 <div className="text-white text-[11.5px] font-semibold">
                     Falta{colaEnvio.length > 1 ? 'n' : ''} {colaEnvio.length}
                 </div>
                 <div className="text-white/70 text-[10.5px] truncate">{actualCola.razon || actualCola.nombre}</div>
             </div>
             <button
                 onClick={saltarDeLaCola}
                 disabled={enviando}
                 className={`${BTN_COLA_BASE} w-[60px] bg-white/15 disabled:opacity-60 text-white`}
             >
                 Saltar
             </button>
             <button
                 onClick={enviarSiguienteDeLaCola}
                 disabled={enviando || actualDescargando}
                 className={`${BTN_COLA_BASE} w-[100px] bg-[#25D366] disabled:opacity-60 text-white`}
             >
                 {actualDescargando ? 'Bajando…' : 'Enviar este'}
             </button>
         </div>
      ) : seleccionados.size > 0 && (
        <div className="absolute left-3.5 right-3.5 bottom-3.5 z-[15] bg-azul-dark rounded-2xl px-4 py-3 flex items-center justify-between gap-2 shadow-float">
            <span className="text-white text-[12px] font-semibold">{seleccionados.size} seleccionado(s)</span>
            <div className="flex gap-2">
              <button
                  onClick={borrarSeleccionados}
                  className="bg-rojo-sunat text-white text-[12px] font-bold px-3 py-2.5 rounded-[10px]"
              >
                  Eliminar
              </button>
              <button
                  onClick={iniciarEnvioSeleccionados}
                  className="bg-[#25D366] text-white text-[12px] font-bold px-4 py-2.5 rounded-[10px]"
              >
                  Empezar a enviar
              </button>
            </div>
        </div>
      )}
    </div>
  )
}
