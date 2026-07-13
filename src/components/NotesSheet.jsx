import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { NOTAS_INICIALES, TRIBUTO_COLORS } from '../data/mockData.js'

const TRIBUTOS_DISPONIBLES = ['PLAME', 'Detracción', 'Multa', 'Fraccionamiento', 'Otro']

/**
 * Bottom sheet de notas por RUC — persistido en localStorage
 * (tributaplus_notas). Cada RUC tiene su propio arreglo de tributos
 * (nombre, monto, fecha) más un campo de observaciones libre. Todo
 * es editable inline: montos y fechas se pueden tocar y cambiar.
 *
 * saveToCloud() es donde, al conectar Google Sheets, llamarías a
 * services/googleSheetsApi.js → saveNotas(ruc, notas).
 */
export default function NotesSheet() {
  const { notesSheetRucId, setNotesSheetRucId, rucs, pushLog } = useApp()
  const [allNotes, setAllNotes] = useLocalStorage('tributaplus_notas', NOTAS_INICIALES)
  const [addingOpen, setAddingOpen] = useState(false)
  const [newTrib, setNewTrib] = useState({ nombre: 'PLAME', monto: '', fecha: '' })

  const open = !!notesSheetRucId
  const ruc = rucs.find((r) => r.id === notesSheetRucId)
  const notas = notesSheetRucId ? allNotes[notesSheetRucId] || { observaciones: '', tributos: [] } : { observaciones: '', tributos: [] }

  function updateNotas(patch) {
    if (!notesSheetRucId) return
    setAllNotes((prev) => ({
      ...prev,
      [notesSheetRucId]: { ...(prev[notesSheetRucId] || { observaciones: '', tributos: [] }), ...patch },
    }))
  }

  function updateTributo(id, field, value) {
    updateNotas({ tributos: notas.tributos.map((t) => (t.id === id ? { ...t, [field]: value } : t)) })
  }

  function removeTributo(id) {
    updateNotas({ tributos: notas.tributos.filter((t) => t.id !== id) })
  }

  function addTributo() {
    if (!newTrib.monto) return
    const id = 't' + Date.now()
    updateNotas({
      tributos: [
        ...notas.tributos,
        { id, nombre: newTrib.nombre, monto: Number(newTrib.monto), fecha: newTrib.fecha || new Date().toISOString().slice(0, 10) },
      ],
    })
    setNewTrib({ nombre: 'PLAME', monto: '', fecha: '' })
    setAddingOpen(false)
    pushLog(`Tributo agregado manualmente: ${newTrib.nombre}`)
  }

  function close() {
    setNotesSheetRucId(null)
  }

  function save() {
    // Aquí es donde, con Google Sheets ya conectado, llamarías:
    // await saveNotas(ruc.id, notas)
    pushLog('Notas guardadas — sincronizando con Google Sheets…')
    close()
  }

  return (
    <>
      <div
        onClick={close}
        className={`absolute inset-0 z-50 bg-[#071422]/50 transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />
      <div
        className={`absolute left-0 right-0 bottom-0 z-[51] max-h-[88%] flex flex-col bg-white rounded-t-[22px] transition-transform duration-300 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="w-[38px] h-1 bg-[#DCE3EA] rounded mx-auto mt-2.5 mb-1" />
        <div className="flex items-start justify-between px-5 pb-3.5 pt-1.5 border-b border-bordersoft">
          <div>
            <div className="font-mono text-[11px] text-muted">{ruc?.ruc || '—'}</div>
            <div className="font-semibold text-[16px] text-ink">{ruc?.razonSocial || '—'}</div>
          </div>
          <button onClick={close} className="w-[30px] h-[30px] rounded-full bg-[#F1F4F8] text-muted flex items-center justify-center">
            ✕
          </button>
        </div>

        <div className="px-5 pt-3.5 pb-6 overflow-y-auto">
          {notas.tributos.map((t) => (
            <div key={t.id} className="flex items-center gap-2.5 py-2.5 border-b border-[#F1F4F8]">
              <div
                className="w-[38px] h-[38px] rounded-[10px] flex-shrink-0 flex items-center justify-center font-display font-bold text-[11px] text-white"
                style={{ background: TRIBUTO_COLORS[t.nombre] || '#68788A' }}
              >
                {t.nombre.slice(0, 3).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-[12.5px] font-semibold text-ink">{t.nombre}</div>
                <input
                  type="date"
                  value={t.fecha}
                  onChange={(e) => updateTributo(t.id, 'fecha', e.target.value)}
                  className="text-[10.5px] text-muted mt-0.5 border-none bg-transparent p-0"
                />
              </div>
              <input
                value={t.monto}
                onChange={(e) => updateTributo(t.id, 'monto', e.target.value)}
                className="font-mono font-semibold text-[13px] text-ink text-right w-[78px] rounded-md px-1.5 py-1 border border-transparent focus:border-azul-inst focus:bg-[#F7FAFD] outline-none"
              />
              <button onClick={() => removeTributo(t.id)} className="text-[#C3CEDA] text-[15px] px-1">
                ✕
              </button>
            </div>
          ))}

          {notas.tributos.length === 0 && (
            <div className="py-6 text-center text-[12px] text-muted">Sin tributos registrados todavía.</div>
          )}

          <button
            onClick={() => setAddingOpen((o) => !o)}
            className="w-full flex items-center justify-center gap-1.5 mt-2 py-2.5 rounded-xl border-[1.5px] border-dashed border-[#C9D6E4] bg-[#F8FAFC] text-azul-inst font-semibold text-[12px]"
          >
            ＋ Agregar tributo manualmente
          </button>

          {addingOpen && (
            <div className="flex flex-wrap gap-2 mt-2.5 p-3 bg-[#F7F9FB] border border-bordersoft rounded-xl">
              <select
                value={newTrib.nombre}
                onChange={(e) => setNewTrib((p) => ({ ...p, nombre: e.target.value }))}
                className="flex-1 min-w-[110px] text-[12px] border border-bordersoft rounded-lg p-2 bg-white"
              >
                {TRIBUTOS_DISPONIBLES.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Monto S/"
                value={newTrib.monto}
                onChange={(e) => setNewTrib((p) => ({ ...p, monto: e.target.value }))}
                className="w-20 text-[12px] border border-bordersoft rounded-lg p-2"
              />
              <input
                type="date"
                value={newTrib.fecha}
                onChange={(e) => setNewTrib((p) => ({ ...p, fecha: e.target.value }))}
                className="flex-1 min-w-[120px] text-[12px] border border-bordersoft rounded-lg p-2"
              />
              <button onClick={addTributo} className="w-full mt-1 py-2.5 rounded-xl bg-azul-inst text-white font-semibold text-[12.5px]">
                Agregar
              </button>
            </div>
          )}

          <span className="block text-[11px] font-semibold text-ink mt-4 mb-1.5">Observaciones</span>
          <textarea
            value={notas.observaciones}
            onChange={(e) => updateNotas({ observaciones: e.target.value })}
            rows={3}
            className="w-full bg-[#F7F9FB] border border-bordersoft rounded-xl p-3 text-[12px] text-ink resize-none"
          />

          <div className="flex gap-2.5 mt-4">
            <button onClick={close} className="flex-1 py-3 rounded-xl bg-[#F1F4F8] text-ink font-semibold text-[12.5px]">
              Cerrar
            </button>
            <button onClick={save} className="flex-1 py-3 rounded-xl bg-azul-inst text-white font-semibold text-[12.5px]">
              Guardar notas
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
