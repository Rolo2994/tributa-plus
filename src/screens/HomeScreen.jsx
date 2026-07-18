import React from 'react'
import { useApp } from '../context/AppContext.jsx'
import RucCard from '../components/RucCard.jsx'

const TABS = [
  { id: 'buzon', label: '📥 Buzón PDF', outline: true },
  { id: 'validez', label: '🔎 Validez CP', outline: true },
  { id: 'sire', label: '⬇ SIRE', outline: false },
  { id: 'detracc', label: '📊 Detracciones', outline: true },
]

export default function HomeScreen() {
  // Aseguramos que si visibleRucs es undefined/null, se convierta en un array vacío []
  const { visibleRucs = [], setNotesSheetRucId, goScreen, groupFilter } = useApp()

  function openModuleAction(id) {
    goScreen(id)
  }

  return (
    <div>
      <div className="flex gap-2 px-4 pt-3.5 pb-1 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <div
            key={t.id}
            onClick={() => openModuleAction(t.id)}
            className={`whitespace-nowrap font-semibold text-[12.5px] px-[15px] py-2.5 rounded-full cursor-pointer border ${
              t.id === 'sire'
                ? 'bg-azul-dark text-white border-azul-dark shadow-[0_6px_14px_-4px_rgba(7,40,68,0.5)]'
                : t.outline
                ? 'bg-white text-rojo-sunat border-[#F3C6CE]'
                : 'bg-white text-azul-inst border-bordersoft'
            }`}
          >
            {t.label}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-3.5 pb-[130px]">
        <div className="flex items-center justify-between mb-2.5 mt-1.5 px-0.5">
          <h2 className="font-display font-bold text-[14px] text-ink">RUCs disponibles</h2>
          <span className="text-[11px] text-muted flex items-center gap-1.5">
            {visibleRucs.length} clientes
            <button
              onClick={() => goScreen('settings')}
              className="bg-[#E7EEF7] text-azul-inst font-semibold px-2.5 py-[3px] rounded-full text-[10px]"
            >
              Grupo: {groupFilter}
            </button>
          </span>
        </div>

        {visibleRucs.map((r) => (
          <RucCard key={r.id} ruc={r} onClick={() => setNotesSheetRucId(r.id)} />
        ))}

        {visibleRucs.length === 0 && (
          <div className="text-center text-muted text-[12px] py-10">
            Ningún RUC en el grupo "{groupFilter}". Cambia el filtro en Ajustes.
          </div>
        )}
      </div>
    </div>
  )
}