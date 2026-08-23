import React, { useState, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import TributoForm from '../components/TributoForm.jsx'
import SwipeableReminderCard from '../components/SwipeableReminderCard.jsx'
import RucCard from '../components/RucCard.jsx'
import Toast from '../components/Toast.jsx'
import { labelRecurrencia } from '../utils/recurrencia.js'

export default function AlertsScreen() {
  const {
    pushLog, todosLosRecordatorios, toggleRecordarTributo, editTributoDeRuc, removeTributoDeRuc,
    rucs, tributos, tributosBase, addTributoToRuc,
  } = useApp()

  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef(null)
  function handleFocusSearch() {
    setTimeout(() => searchRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)
  }
  const [rucElegido, setRucElegido] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [toast, setToast] = useState('')
  const [mostrarActivos, setMostrarActivos] = useState(true)
  const [mostrarInactivos, setMostrarInactivos] = useState(false)

  const activos = todosLosRecordatorios.filter((r) => r.recordar)
  const inactivos = todosLosRecordatorios.filter((r) => !r.recordar)

  const rucsFiltrados = rucs.filter(
    (r) => r.ruc.includes(search) || r.razonSocial.toLowerCase().includes(search.toLowerCase())
  )

  function abrirPicker() { setEditingItem(null); setRucElegido(null); setSearch(''); setPickerOpen(true) }
  function abrirEdicion(item) { setPickerOpen(false); setEditingItem(item) }
  function handleAgregar(data) {
    if (!rucElegido) return
    addTributoToRuc(rucElegido.id, data)
    pushLog(`Recordatorio agregado para ${rucElegido.razonSocial}: ${data.nombre}`)
    setToast(`✓ Recordatorio agregado: ${data.nombre}`)
    setPickerOpen(false)
  }
  function handleEditar(data) {
    if (!editingItem) return
    editTributoDeRuc(editingItem.rucId, editingItem.id, data)
    pushLog(`Recordatorio actualizado: ${data.nombre}`)
    setToast('✓ Recordatorio actualizado')
    setEditingItem(null)
  }
  function confirmarEliminar(item) {
    if (!window.confirm(`¿Eliminar el recordatorio "${item.nombre}" de ${item.rucNombre}?`)) return
    removeTributoDeRuc(item.rucId, item.id)
    pushLog(`Recordatorio eliminado: ${item.nombre}`)
    setToast('🗑 Recordatorio eliminado')
    setEditingItem(null)
  }
  function confirmarToggle(item) {
    toggleRecordarTributo(item.rucId, item.id)
    const nuevoEstado = !item.recordar
    pushLog(`${nuevoEstado ? 'Reactivado' : 'Desactivado'}: ${item.nombre}`)
    setToast(nuevoEstado ? `✓ "${item.nombre}" activado` : `⏸ "${item.nombre}" desactivado`)
  }

  function renderCard(r) {
    const activo = r.recordar
    return (
      <SwipeableReminderCard key={`${r.rucId}-${r.id}`} onDelete={() => confirmarEliminar(r)} onToggle={() => confirmarToggle(r)}>
        <div className={`bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5 ${activo ? '' : 'opacity-60'}`}>
          <div className="flex items-center justify-between gap-2">
            <div onClick={() => abrirEdicion(r)} className="min-w-0 flex-1 cursor-pointer">
              <div className="text-[12px] font-semibold text-ink truncate flex items-center gap-1.5">
                {r.esTarea && <span className="text-[9px] bg-[#EFE9FB] text-[#5B3FA8] font-bold px-1.5 py-[1px] rounded">TAREA</span>}
                {r.nombre}{r.tributoAsociado ? ` · ${r.tributoAsociado}` : ''}
              </div>
              <div className="text-[10.5px] text-muted mt-0.5 truncate">{r.rucNombre} · {r.rucNumero}</div>
              <div className="text-[10px] text-muted">{r.periodoMes} {r.periodoAnio} · {r.fecha} {r.hora}{r.monto ? ` · S/ ${r.monto}` : ''}</div>
              {r.recurrencia && r.recurrencia !== 'ninguna' && (
                <div className="text-[9.5px] text-azul-inst font-semibold mt-0.5">🔁 {labelRecurrencia(r)}</div>
              )}
            </div>
            <span className={`flex-shrink-0 text-[9.5px] font-semibold px-2 py-1 rounded-full ${activo ? 'text-verde bg-[#EAF6EF]' : 'text-muted bg-[#F1F4F8]'}`}>
              {activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
      </SwipeableReminderCard>
    )
  }

  return (
    <div className="relative flex-1 overflow-y-auto px-4 pt-4 pb-[130px]">
      <Toast message={toast} onDone={() => setToast('')} />

      <div className="bg-[#EAF1FA] text-azul-inst text-[10.5px] rounded-xl px-3 py-2.5 mb-3.5 leading-relaxed">
        💡 Desliza una tarjeta a los lados para eliminarla, o mantenla presionada para activar/desactivar el recordatorio.
      </div>

      <button
        onClick={abrirPicker}
        className="w-full flex items-center justify-center gap-2 py-3.5 mb-4 rounded-2xl bg-azul-dark text-white font-semibold text-[13px] shadow-[0_6px_16px_-4px_rgba(7,40,68,0.5)]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
        Agregar recordatorio
      </button>

      <button onClick={() => setMostrarActivos((v) => !v)} className="w-full flex items-center justify-between mb-2.5">
        <h2 className="font-display font-bold text-[14px] text-ink">Recordatorios activos <span className="text-muted font-normal text-[12px]">({activos.length})</span></h2>
        <span className="text-muted text-[13px]">{mostrarActivos ? '▾' : '▸'}</span>
      </button>
      {mostrarActivos && (
        <>
          {activos.length === 0 && <div className="text-center text-muted text-[12px] py-4">Sin recordatorios activos.</div>}
          {activos.map(renderCard)}
        </>
      )}

      <button onClick={() => setMostrarInactivos((v) => !v)} className="w-full flex items-center justify-between mt-5 mb-2.5">
        <h2 className="font-display font-bold text-[14px] text-ink">Recordatorios desactivados <span className="text-muted font-normal text-[12px]">({inactivos.length})</span></h2>
        <span className="text-muted text-[13px]">{mostrarInactivos ? '▾' : '▸'}</span>
      </button>
      {mostrarInactivos && (
        <>
          {inactivos.length === 0 && <div className="text-center text-muted text-[12px] py-4">Sin recordatorios desactivados.</div>}
          {inactivos.map(renderCard)}
        </>
      )}

      {pickerOpen && (
        <div className="absolute inset-0 z-[60] bg-black/50 flex items-start" onClick={() => setPickerOpen(false)}>
          <div className="w-full bg-white rounded-b-2xl p-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-[38px] h-1 bg-[#DCE3EA] rounded mx-auto mb-4" />
            {!rucElegido ? (
              <>
                <div className="font-display font-bold text-[14px] mb-3">Elige un RUC</div>
                <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} onFocus={handleFocusSearch} placeholder="Buscar RUC o razón social…" className="w-full mb-3 rounded-[10px] border border-bordersoft px-3 py-2.5 text-[12px]" />
                {rucsFiltrados.map((r) => (
                  <RucCard key={r.id} ruc={r} onClick={() => setRucElegido(r)} />
                ))}
                {rucsFiltrados.length === 0 && (
                  <div className="text-center text-muted text-[12px] py-6">Ningún RUC coincide con la búsqueda.</div>
                )}
              </>
            ) : (
              <>
                <div className="font-display font-bold text-[14px] mb-1">{rucElegido.razonSocial}</div>
                <div className="font-mono text-[11px] text-muted mb-3">{rucElegido.ruc}</div>
                <TributoForm tributos={tributos} tributosBase={tributosBase} onSubmit={handleAgregar} onCancel={() => setRucElegido(null)} />
              </>
            )}
          </div>
        </div>
      )}

      {editingItem && (
        <div className="absolute inset-0 z-[60] bg-black/50 flex items-end" onClick={() => setEditingItem(null)}>
          <div className="w-full bg-white rounded-t-2xl p-5 max-h-[80%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-[38px] h-1 bg-[#DCE3EA] rounded mx-auto mb-4" />
            <div className="font-display font-bold text-[14px] mb-1">{editingItem.rucNombre}</div>
            <div className="font-mono text-[11px] text-muted mb-3">{editingItem.rucNumero}</div>
            <TributoForm tributos={tributos} tributosBase={tributosBase} initial={editingItem} onSubmit={handleEditar} onCancel={() => setEditingItem(null)} />
            <button onClick={() => confirmarEliminar(editingItem)} className="w-full mt-2.5 py-3 rounded-xl bg-[#FCE9EB] text-rojo-sunat font-semibold text-[12.5px]">
              🗑 Eliminar este recordatorio
            </button>
          </div>
        </div>
      )}
    </div>
  )
}