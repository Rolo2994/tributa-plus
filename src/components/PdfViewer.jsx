import React from 'react'

/**
 * PdfViewer
 * ─────────────────────────────────────────────────────────────
 * Visor de documentos EN PANTALLA — nunca dispara una descarga
 * automática. Está pensado para recibir un `pdfUrl` real (un blob
 * de SUNAT, un link firmado de Drive, etc.) y mostrarlo con
 * <iframe>/<embed>, que es el mismo mecanismo que usará la versión
 * conectada a la API real.
 *
 * Como este proyecto todavía trabaja con datos simulados, no hay
 * bytes de PDF reales que mostrar — en vez de fingir un PDF, el
 * visor deja esto explícito con una vista previa "simulada" del
 * documento, para no generar una falsa sensación de que ya lee
 * PDFs reales. Cuando conectes el backend, basta con pasarle
 * `pdfUrl` y el iframe se activa solo.
 *
 * La única forma de que un archivo llegue al almacenamiento del
 * celular es tocando el botón "Descargar" — todo lo demás es
 * solo lectura en pantalla.
 */
export default function PdfViewer({ open, onClose, documento, pdfUrl, onDownload }) {
  if (!open) return null

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

      <div className="flex-1 overflow-y-auto bg-[#E7EBF1] p-4">
        {pdfUrl ? (
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

      <div className="px-4 py-3 bg-[#0A1017] border-t border-[#1E2833] flex justify-end">
        <button
          onClick={() => onDownload && onDownload(documento)}
          className="flex items-center gap-2 bg-azul-inst text-white text-[12px] font-semibold px-4 py-2.5 rounded-lg"
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
