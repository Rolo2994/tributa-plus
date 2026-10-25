import React, { useEffect, useRef, useState } from 'react'
import { cargarPdfJs } from '../utils/cargarPdfJs.js'

// ── Constantes globales ─────────────────────────────────────────────
const ZOOMS = [1, 1.5, 2]               // niveles de zoom (1 = páginas a todo el ancho de la pantalla)
const MAX_DPR = 2                       // nitidez máxima (píxeles reales del celular por píxel de pantalla)
const MAX_PIXELES_PAGINA = 4000000      // tope de memoria por página: evita que el celular se quede sin memoria
const BTN_ZOOM = 'w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center text-[16px] font-semibold disabled:opacity-40 flex-shrink-0'
const CLASE_PAGINA = 'bg-white rounded-lg shadow-lg block mx-auto mb-3' // estilo de cada página dibujada
const ESTADO_INICIAL = { fase: 'inactivo', error: '' }                  // fase: inactivo | abriendo | listo | error

/**
 * PdfViewer
 * ─────────────────────────────────────────────────────────────
 * Visor de documentos EN PANTALLA — nunca dispara una descarga
 * automática. Tiene tres modos, según lo que reciba:
 *
 *  1) `pdfArchivo` (File/Blob con los bytes del PDF): dibuja las páginas
 *     dentro de la app con pdf.js. No depende de Drive, de cuentas de
 *     Google ni del visor del celular. Admite zoom. Mientras el archivo
 *     se descarga se muestra `cargando`; si falla, `error`.
 *  2) `pdfUrl` (un link real): lo muestra con <iframe> (como antes).
 *  3) Sin nada: vista previa "simulada" (modo demo, como antes).
 *
 * La única forma de que un archivo llegue al almacenamiento del
 * celular es tocando el botón "Descargar" — todo lo demás es
 * solo lectura en pantalla.
 */
export default function PdfViewer({ open, onClose, documento, pdfUrl, pdfArchivo, cargando, error, onDownload }) {
  const contenedorRef = useRef(null) // aquí se dibujan las páginas (sin hijos de React)
  const docRef = useRef(null)        // documento pdf.js abierto
  const tareaRef = useRef(null)      // página que se está dibujando (para poder cancelarla)
  const tokenRef = useRef(0)         // identifica la "pasada" de dibujo vigente
  const [zoom, setZoom] = useState(ZOOMS[0])
  const [estado, setEstado] = useState(ESTADO_INICIAL)

  const modoArchivo = !!(pdfArchivo || cargando || error)

  // 1) Cuando llega el archivo, se abre el documento con pdf.js
  useEffect(() => {
    setZoom(ZOOMS[0])
    if (!open || !pdfArchivo) {
      setEstado(ESTADO_INICIAL)
      return undefined
    }
    let cancelado = false
    setEstado({ fase: 'abriendo', error: '' })
    ;(async () => {
      try {
        const [lib, buffer] = await Promise.all([cargarPdfJs(), pdfArchivo.arrayBuffer()])
        const doc = await lib.getDocument({ data: new Uint8Array(buffer) }).promise
        if (cancelado) {
          doc.destroy()
          return
        }
        docRef.current = doc
        setEstado({ fase: 'listo', error: '' })
      } catch (err) {
        if (!cancelado) setEstado({ fase: 'error', error: err?.message || String(err) })
      }
    })()
    return () => {
      cancelado = true
      if (docRef.current) {
        docRef.current.destroy()
        docRef.current = null
      }
    }
  }, [open, pdfArchivo])

  // 2) Dibuja las páginas (de una en una) cada vez que cambia el documento o el zoom
  useEffect(() => {
    const doc = docRef.current
    const cont = contenedorRef.current
    if (estado.fase !== 'listo' || !doc || !cont) return undefined

    const token = ++tokenRef.current
    cont.replaceChildren()
    ;(async () => {
      try {
        const anchoDisponible = cont.clientWidth
        for (let n = 1; n <= doc.numPages; n++) {
          if (token !== tokenRef.current) return
          const pagina = await doc.getPage(n)
          const base = pagina.getViewport({ scale: 1 })
          const viewport = pagina.getViewport({ scale: (anchoDisponible / base.width) * zoom })

          // Nitidez: píxeles reales por píxel de pantalla, con tope de memoria.
          const salida = Math.min(
            window.devicePixelRatio || 1,
            MAX_DPR,
            Math.sqrt(MAX_PIXELES_PAGINA / (viewport.width * viewport.height)),
          )
          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width * salida)
          canvas.height = Math.floor(viewport.height * salida)
          canvas.style.width = `${Math.floor(viewport.width)}px`
          canvas.style.height = `${Math.floor(viewport.height)}px`
          canvas.className = CLASE_PAGINA
          if (token !== tokenRef.current) return
          cont.appendChild(canvas)

          tareaRef.current = pagina.render({
            canvasContext: canvas.getContext('2d'),
            viewport,
            transform: salida !== 1 ? [salida, 0, 0, salida, 0, 0] : null,
          })
          await tareaRef.current.promise
          pagina.cleanup()
        }
      } catch (err) {
        if (err?.name === 'RenderingCancelledException') return // se cambió el zoom a mitad: normal
        if (token === tokenRef.current) setEstado({ fase: 'error', error: err?.message || String(err) })
      }
    })()
    return () => {
      tokenRef.current++
      if (tareaRef.current) tareaRef.current.cancel()
    }
  }, [estado.fase, zoom])

  function cambiarZoom(paso) {
    const i = ZOOMS.indexOf(zoom)
    setZoom(ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, i + paso))])
  }

  if (!open) return null

  const mensajeError = error || (estado.fase === 'error' ? estado.error : '')
  const mostrandoCarga = !mensajeError && (cargando || estado.fase === 'abriendo')

  return (
    <div className="absolute inset-0 z-[60] bg-black/70 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-[#0A1017] border-b border-[#1E2833]">
        <div className="min-w-0">
          <div className="text-white text-[12.5px] font-semibold truncate">{documento?.asunto}</div>
          <div className="text-[#7FA0BE] text-[10px] font-mono">
            {documento?.fecha} {documento?.hora}
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center flex-shrink-0 ml-2">
          ✕
        </button>
      </div>

      <div className={`flex-1 bg-[#E7EBF1] p-4 ${modoArchivo ? 'overflow-auto' : 'overflow-y-auto'}`}>
        {modoArchivo ? (
          <>
            {mostrandoCarga && (
              <div className="text-center text-[#5B7185] text-[12px] py-10">Cargando PDF…</div>
            )}
            {mensajeError && (
              <div className="bg-white rounded-lg shadow-lg mx-auto max-w-[340px] p-5 text-center">
                <div className="text-[13px] font-semibold text-ink mb-1.5">No se pudo mostrar el PDF</div>
                <div className="text-[11.5px] text-muted leading-relaxed">{mensajeError}</div>
              </div>
            )}
            <div ref={contenedorRef} />
          </>
        ) : pdfUrl ? (
          <iframe title="Visor de documento" src={pdfUrl} className="w-full h-full rounded-lg bg-white" />
        ) : (
          <div className="bg-white rounded-lg shadow-lg mx-auto max-w-[340px] p-6 min-h-[440px]">
            <div className="text-center border-b border-dashed border-bordersoft pb-3 mb-4">
              <div className="font-display font-bold text-azul-inst text-sm">SUNAT — Documento electrónico</div>
              <div className="text-[10px] text-muted mt-1">Vista previa simulada (modo demo)</div>
            </div>
            <div className="text-[11.5px] text-ink leading-relaxed space-y-2">
              <p>
                <b>Asunto:</b> {documento?.asunto}
              </p>
              <p>
                <b>Fecha:</b> {documento?.fecha} {documento?.hora}
              </p>
              <p className="text-muted">
                En producción, este panel muestra el PDF real recibido de SUNAT (o el enlace generado por tu backend)
                dentro de este mismo visor, sin guardarlo en el celular salvo que toques "Descargar".
              </p>
            </div>
          </div>
        )}
      </div>

      <div className={`px-4 py-3 bg-[#0A1017] border-t border-[#1E2833] flex items-center gap-2 ${pdfArchivo ? 'justify-between' : 'justify-end'}`}>
        {pdfArchivo && (
          <div className="flex items-center gap-1.5">
            <button onClick={() => cambiarZoom(-1)} disabled={zoom <= ZOOMS[0]} className={BTN_ZOOM} aria-label="Alejar">−</button>
            <span className="text-[#7FA0BE] text-[11px] font-mono w-11 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => cambiarZoom(1)} disabled={zoom >= ZOOMS[ZOOMS.length - 1]} className={BTN_ZOOM} aria-label="Acercar">+</button>
          </div>
        )}
        <button
          onClick={() => onDownload && onDownload(documento)}
          disabled={modoArchivo && !pdfArchivo}
          className="flex items-center gap-2 bg-azul-inst disabled:opacity-40 text-white text-[12px] font-semibold px-4 py-2.5 rounded-lg"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M12 4v11M7 10l5 5 5-5" />
            <path d="M5 20h14" />
          </svg>
          Descargar
        </button>
      </div>
    </div>
  )
}
