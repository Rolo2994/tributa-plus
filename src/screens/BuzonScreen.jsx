import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { NOTIFICACIONES } from '../data/mockData.js'
import PdfViewer from '../components/PdfViewer.jsx'
import ContactPicker from '../components/ContactPicker.jsx'

/**
 * Buzón PDF — a propósito NO vuelve a ejecutar el scraping de SUNAT
 * (eso sigue viviendo en la app de escritorio, sunat_launcher.py).
 * Esta pantalla solo VISUALIZA lo que ya se descargó, y permite
 * reenviarlo por WhatsApp sin volver a guardar nada en el celular.
 */
export default function BuzonScreen() {
  const { activeRuc, goScreen, setContactPickerOpen, setPendingSendCount, pushLog } = useApp()
  const notificaciones = NOTIFICACIONES[activeRuc.id] || []
  const [selected, setSelected] = useState(() => new Set(notificaciones.slice(0, 2).map((n) => n.id)))
  const [viewerDoc, setViewerDoc] = useState(null)

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function selectAll(all) {
    setSelected(all ? new Set(notificaciones.map((n) => n.id)) : new Set())
  }

  function openSend() {
    if (selected.size === 0) {
      pushLog('⚠ Selecciona al menos una notificación para enviar.')
      return
    }
    setPendingSendCount(selected.size)
    setContactPickerOpen(true)
  }

  function handleSend(contactName) {
    pushLog(`Enviando ${selected.size} PDF por WhatsApp a: ${contactName}…`)
    setTimeout(() => pushLog(`✓ Enviado correctamente a ${contactName}`), 800)
  }

  function handleDownload(doc) {
    // Única vía de descarga real — el usuario la pidió explícitamente.
    pushLog(`Descargando PDF: ${doc.asunto.slice(0, 40)}…`)
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-1.5">
        <button onClick={() => goScreen('modules')} className="w-8 h-8 rounded-[9px] bg-white border border-bordersoft flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="#0B3A60" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="font-display font-bold text-[15px]">Buzón PDF</div>
      </div>
      <div className="text-[11px] text-muted ml-[42px] -mt-1">
        Últimas notificaciones descargadas desde la PC · {activeRuc.razonSocial}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-[100px]">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] text-muted">{notificaciones.length} notificaciones</span>
          <div className="flex gap-3 text-[11px] font-semibold text-azul-inst">
            <button onClick={() => selectAll(true)}>Todos</button>
            <button onClick={() => selectAll(false)}>Ninguno</button>
          </div>
        </div>

        {notificaciones.map((n) => (
          <div key={n.id} className="flex gap-2.5 items-start bg-white rounded-xl border border-[#F0F3F7] p-3 mb-2">
            <button
              onClick={() => toggle(n.id)}
              className={`w-[19px] h-[19px] rounded-md border-[1.6px] flex-shrink-0 mt-0.5 flex items-center justify-center text-[12px] ${
                selected.has(n.id) ? 'bg-azul-inst border-azul-inst text-white' : 'border-[#C9D6E4]'
              }`}
            >
              {selected.has(n.id) ? '✓' : ''}
            </button>
            <div className="flex-1 cursor-pointer" onClick={() => setViewerDoc(n)}>
              <div className="text-[12px] font-semibold leading-snug">{n.asunto}</div>
              <div className="flex gap-2 mt-1 text-[10px] text-muted">
                <span>
                  {n.fecha} {n.hora}
                </span>
                {n.tieneAdjunto && <span className="bg-[#EAF6EF] text-verde font-semibold px-1.5 py-[1px] rounded">PDF</span>}
              </div>
            </div>
          </div>
        ))}

        {notificaciones.length === 0 && (
          <div className="text-center text-muted text-[12px] py-10">Sin notificaciones descargadas para este RUC.</div>
        )}
      </div>

      {notificaciones.length > 0 && (
        <div className="absolute left-3.5 right-3.5 bottom-3.5 z-[15] bg-azul-dark rounded-2xl px-4 py-3 flex items-center justify-between shadow-float">
          <span className="text-white text-[12px] font-semibold">{selected.size} seleccionadas</span>
          <button onClick={openSend} className="flex items-center gap-1.5 bg-[#25D366] text-white text-[12px] font-bold px-4 py-2.5 rounded-[10px]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M21 11.5a8.4 8.4 0 01-9 8.4A8.5 8.5 0 013 12a8.5 8.5 0 0117-.5Z" />
              <path d="M8 12h.01M12 12h.01M16 12h.01" />
            </svg>
            Enviar
          </button>
        </div>
      )}

      <PdfViewer open={!!viewerDoc} documento={viewerDoc} onClose={() => setViewerDoc(null)} onDownload={handleDownload} />
      <ContactPicker onSend={handleSend} />
    </div>
  )
}
