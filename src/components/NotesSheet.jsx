import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import TributoForm from './TributoForm.jsx'
import { construirMensajeNota } from '../utils/construirMensajeNota.js'

export default function NotesSheet() {
  const {
    notesSheetRucId, setNotesSheetRucId, rucs, pushLog,
    tributos, tributosBase,
    getNotasForRuc, updateNotasForRuc, addTributoToRuc,
    updateTributoDeRuc, toggleRecordarTributo, removeTributoDeRuc,
    flushNotasForRuc,
  } = useApp()
  const [addingOpen, setAddingOpen] = useState(false)

  const open = !!notesSheetRucId
  const ruc = rucs.find((r) => r.id === notesSheetRucId)
  const notas = notesSheetRucId ? getNotasForRuc(notesSheetRucId) : { observaciones: '', tributos: [] }

  function close() { setNotesSheetRucId(null) }
  async function save() {
    pushLog('Guardando notas en Google Sheets…')
    await flushNotasForRuc(notesSheetRucId)
    close()
  }

  function handleAdd(data) {
    if (!notesSheetRucId) return
    addTributoToRuc(notesSheetRucId, data)
    setAddingOpen(false)
    pushLog(`Recordatorio agregado: ${data.nombre}`)
  }

  async function compartirPorWhatsApp() {
    if (!ruc) return
    const texto = construirMensajeNota(ruc, notas)
    if (navigator.share) {
      try { await navigator.share({ title: `Recordatorio — ${ruc.razonSocial}`, text: texto }) } catch {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
    }
  }

  const colorPara = (nombre) => tributos.find((t) => t.nombre === nombre)?.color || '#68788A'

  return (
    <>
      <div onClick={close} className={`absolute inset-0 z-50 bg-[#071422]/50 transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />
      <div className={`absolute left-0 right-0 bottom-0 z-[51] max-h-[88%] flex flex-col bg-white rounded-t-[22px] transition-transform duration-300 ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="w-[38px] h-1 bg-[#DCE3EA] rounded mx-auto mt-2.5 mb-1" />
        <div className="flex items-start justify-between px-5 pb-3.5 pt-1.5 border-b border-bordersoft">
          <div>
            <div className="font-mono text-[11px] text-muted">{ruc?.ruc || '—'}</div>
            <div className="font-semibold text-[16px] text-ink">{ruc?.razonSocial || '—'}</div>
          </div>
          <button onClick={close} className="w-[30px] h-[30px] rounded-full bg-[#F1F4F8] text-muted flex items-center justify-center">✕</button>
        </div>

        <div className="px-5 pt-3.5 pb-6 overflow-y-auto">
          {notas.tributos.map((t) => (
            <div key={t.id} className="py-2.5 border-b border-[#F1F4F8]">
              <div className="flex items-center gap-2.5">
                <div className="w-[38px] h-[38px] rounded-[10px] flex-shrink-0 flex items-center justify-center font-display font-bold text-[11px] text-white" style={{ background: colorPara(t.nombre) }}>
                  {t.nombre.slice(0, 3).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-[12.5px] font-semibold text-ink">
                    {t.nombre}
                    {t.tributoAsociado && <span className="text-muted font-normal"> · {t.tributoAsociado}</span>}
                  </div>
                  <div className="text-[10px] text-muted">{t.periodoMes} {t.periodoAnio}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input type="date" value={t.fecha} onChange={(e) => updateTributoDeRuc(notesSheetRucId, t.id, 'fecha', e.target.value)} className="text-[10.5px] text-muted border-none bg-transparent p-0" />
                    <input type="time" value={t.hora || '09:00'} onChange={(e) => updateTributoDeRuc(notesSheetRucId, t.id, 'hora', e.target.value)} className="text-[10.5px] text-muted border-none bg-transparent p-0" />
                  </div>
                </div>
                <input value={t.monto} onChange={(e) => updateTributoDeRuc(notesSheetRucId, t.id, 'monto', e.target.value)} className="font-mono font-semibold text-[13px] text-ink text-right w-[70px] rounded-md px-1.5 py-1 border border-transparent focus:border-azul-inst focus:bg-[#F7FAFD] outline-none" />
                <button onClick={() => removeTributoDeRuc(notesSheetRucId, t.id)} className="text-[#C3CEDA] text-[15px] px-1">✕</button>
              </div>
              <button onClick={() => toggleRecordarTributo(notesSheetRucId, t.id)} className={`mt-1.5 ml-[48px] text-[10px] font-semibold px-2 py-1 rounded-full ${t.recordar ? 'bg-[#EAF6EF] text-verde' : 'bg-[#F1F4F8] text-muted'}`}>
                🔔 {t.recordar ? 'Recordatorio activo' : 'Sin recordatorio'}
              </button>
            </div>
          ))}

          {notas.tributos.length === 0 && <div className="py-6 text-center text-[12px] text-muted">Sin recordatorios registrados todavía.</div>}

          {!addingOpen ? (
            <button onClick={() => setAddingOpen(true)} className="w-full flex items-center justify-center gap-1.5 mt-2 py-2.5 rounded-xl border-[1.5px] border-dashed border-[#C9D6E4] bg-[#F8FAFC] text-azul-inst font-semibold text-[12px]">
              ＋ Agregar recordatorio manualmente
            </button>
          ) : (
            <div className="mt-2.5">
              <TributoForm tributos={tributos} tributosBase={tributosBase} onSubmit={handleAdd} onCancel={() => setAddingOpen(false)} />
            </div>
          )}

          <span className="block text-[11px] font-semibold text-ink mt-4 mb-1.5">Observaciones</span>
          <textarea value={notas.observaciones} onChange={(e) => updateNotasForRuc(notesSheetRucId, { observaciones: e.target.value })} rows={3} className="w-full bg-[#F7F9FB] border border-bordersoft rounded-xl p-3 text-[12px] text-ink resize-none" />

          <button onClick={compartirPorWhatsApp} className="w-full mt-4 py-3 rounded-xl bg-[#25D366] text-white font-semibold text-[12.5px] flex items-center justify-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 11.5a8.4 8.4 0 01-9 8.4A8.5 8.5 0 013 12a8.5 8.5 0 0117-.5Z" /><path d="M8 12h.01M12 12h.01M16 12h.01" /></svg>
            Enviar por WhatsApp
          </button>

          <div className="flex gap-2.5 mt-2.5">
            <button onClick={close} className="flex-1 py-3 rounded-xl bg-[#F1F4F8] text-ink font-semibold text-[12.5px]">Cerrar</button>
            <button onClick={save} className="flex-1 py-3 rounded-xl bg-azul-inst text-white font-semibold text-[12.5px]">Guardar notas</button>
          </div>
        </div>
      </div>
    </>
  )
}