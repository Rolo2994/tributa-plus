import React, { useState } from 'react'
import { CRONOGRAMA_HOY, CRONOGRAMA_PROX } from '../data/mockData.js'
import { useApp } from '../context/AppContext.jsx'
import TributoForm from '../components/TributoForm.jsx'

export default function AlertsScreen() {
  const {
    pushLog, todosLosRecordatorios, toggleRecordarTributo, editTributoDeRuc,
    rucs, tributos, tributosBase, addTributoToRuc,
  } = useApp()
  const [pushOn, setPushOn] = useState(true)
  const [autoOn, setAutoOn] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [rucElegido, setRucElegido] = useState(null)
  const [editingItem, setEditingItem] = useState(null)

  const activos = todosLosRecordatorios.filter((r) => r.recordar)
  const inactivos = todosLosRecordatorios.filter((r) => !r.recordar)

  const rucsFiltrados = rucs.filter(
    (r) => r.ruc.includes(search) || r.razonSocial.toLowerCase().includes(search.toLowerCase())
  )

  function abrirPicker() {
    setEditingItem(null)
    setRucElegido(null)
    setSearch('')
    setPickerOpen(true)
  }

  function abrirEdicion(item) {
    setPickerOpen(false)
    setEditingItem(item)
  }

  function handleAgregar(data) {
    if (!rucElegido) return
    addTributoToRuc(rucElegido.id, data)
    pushLog(`Recordatorio agregado para ${rucElegido.razonSocial}: ${data.nombre}`)
    setPickerOpen(false)
  }

  function handleEditar(data) {
    if (!editingItem) return
    editTributoDeRuc(editingItem.rucId, editingItem.id, data)
    pushLog(`Recordatorio actualizado: ${data.nombre}`)
    setEditingItem(null)
  }

  function renderCard(r) {
    const activo = r.recordar
    return (
      <div
        key={`${r.rucId}-${r.id}`}
        onClick={() => abrirEdicion(r)}
        className={`bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5 mb-2.5 cursor-pointer ${activo ? '' : 'opacity-60'}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-ink truncate flex items-center gap-1.5">
              {r.esTarea && <span className="text-[9px] bg-[#EFE9FB] text-[#5B3FA8] font-bold px-1.5 py-[1px] rounded">TAREA</span>}
              {r.nombre}{r.tributoAsociado ? ` · ${r.tributoAsociado}` : ''}
            </div>
            <div className="text-[10.5px] text-muted mt-0.5 truncate">{r.rucNombre} · {r.rucNumero}</div>
            <div className="text-[10px] text-muted">{r.periodoMes} {r.periodoAnio} · {r.fecha} {r.hora}{r.monto ? ` · S/ ${r.monto}` : ''}</div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); toggleRecordarTributo(r.rucId, r.id) }}
            className={`flex-shrink-0 text-[10px] font-semibold px-2.5 py-1.5 rounded-full ${activo ? 'text-rojo-sunat bg-[#FCE9EB]' : 'text-verde bg-[#EAF6EF]'}`}
          >
            {activo ? 'Desactivar' : 'Reactivar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex-1 overflow-y-auto px-4 pt-4 pb-[130px]">
      <h2 className="font-display font-bold text-[14px] text-ink mb-2.5">Cronograma de hoy</h2>

      <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5 mb-2.5">
        <div className="font-bold text-[12.5px] mb-1">🔴 Vence hoy — {CRONOGRAMA_HOY.fecha}</div>
        <div className="text-[10.5px] text-muted leading-relaxed">
          {CRONOGRAMA_HOY.items.map((i) => `${i.tipo} (dígitos ${i.digitos.join(', ')})`).join(' · ')}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5 mb-2.5">
        <div className="font-bold text-[12.5px] mb-1">🟡 Próximo día hábil — {CRONOGRAMA_PROX.fecha}</div>
        <div className="text-[10.5px] text-muted leading-relaxed">
          {CRONOGRAMA_PROX.items.map((i) => `${i.tipo} (dígitos ${i.digitos.join(', ')})`).join(' · ')}
        </div>
      </div>

      <div className="flex items-center justify-between mt-5 mb-2.5">
        <h2 className="font-display font-bold text-[14px] text-ink">Recordatorios activos</h2>
        <button onClick={abrirPicker} className="text-[11px] font-semibold text-azul-inst bg-[#E7EEF7] px-2.5 py-1.5 rounded-full">
          ＋ Agregar recordatorio
        </button>
      </div>

      {activos.length === 0 && <div className="text-center text-muted text-[12px] py-4">Sin recordatorios activos.</div>}
      {activos.map(renderCard)}

      <h2 className="font-display font-bold text-[14px] text-ink mt-5 mb-2.5">Recordatorios desactivados</h2>
      {inactivos.length === 0 && <div className="text-center text-muted text-[12px] py-4">Sin recordatorios desactivados.</div>}
      {inactivos.map(renderCard)}

      <h2 className="font-display font-bold text-[14px] text-ink mt-5 mb-2.5">Envío de recordatorios</h2>

      <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5 mb-2.5">
        <div className="flex items-center justify-between">
          <div>
            <b className="block text-[12px]">Notificación push al contador</b>
            <span className="text-[10.5px] text-muted">Aviso apenas se detecta un vencimiento.</span>
          </div>
          <button onClick={() => setPushOn((v) => !v)} className={`relative w-[42px] h-6 rounded-full flex-shrink-0 transition-colors ${pushOn ? 'bg-verde' : 'bg-bordersoft'}`}>
            <span className={`absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white shadow transition-transform ${pushOn ? 'translate-x-[18px]' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5">
        <div className="flex items-center justify-between">
          <div>
            <b className="block text-[12px]">Envío automático al cliente</b>
            <span className="text-[10.5px] text-muted">
              {autoOn ? 'Activado: los recordatorios se envían solos por WhatsApp al detectar un vencimiento.' : 'Tú decides cuándo enviar cada recordatorio.'}
            </span>
          </div>
          <button
            onClick={() => { setAutoOn((v) => !v); pushLog(!autoOn ? 'Envío automático activado' : 'Envío automático desactivado') }}
            className={`relative w-[42px] h-6 rounded-full flex-shrink-0 transition-colors ${autoOn ? 'bg-verde' : 'bg-bordersoft'}`}
          >
            <span className={`absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white shadow transition-transform ${autoOn ? 'translate-x-[18px]' : ''}`} />
          </button>
        </div>
        {!autoOn && (
          <div className="flex items-center gap-2 mt-2 text-[11.5px] text-muted">
            <span>Enviar todos los días a las</span>
            <input type="time" defaultValue="08:30" className="border border-bordersoft rounded-lg px-2 py-1 text-[12px]" />
          </div>
        )}
      </div>

      {pickerOpen && (
        <div className="absolute inset-0 z-[60] bg-black/50 flex items-end" onClick={() => setPickerOpen(false)}>
          <div className="w-full bg-white rounded-t-2xl p-5 max-h-[80%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-[38px] h-1 bg-[#DCE3EA] rounded mx-auto mb-4" />
            {!rucElegido ? (
              <>
                <div className="font-display font-bold text-[14px] mb-3">Elige un RUC</div>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar RUC o razón social…" className="w-full mb-3 rounded-[10px] border border-bordersoft px-3 py-2.5 text-[12px]" />
                {rucsFiltrados.map((r) => (
                  <div key={r.id} onClick={() => setRucElegido(r)} className="py-2.5 border-b border-[#F4F6F9] cursor-pointer">
                    <div className="text-[12px] font-semibold">{r.razonSocial}</div>
                    <div className="font-mono text-[10.5px] text-muted">{r.ruc}</div>
                  </div>
                ))}
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
          </div>
        </div>
      )}
    </div>
  )
}