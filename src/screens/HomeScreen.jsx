import React from 'react'
import { useApp } from '../context/AppContext.jsx'
import RucCard from '../components/RucCard.jsx'
import GroupFilterBar from '../components/GroupFilterBar.jsx'

export default function HomeScreen() {
  const { visibleRucs = [], setNotesSheetRucId } = useApp()

  function handleSelectRuc(rucId) {
    if (typeof setNotesSheetRucId === 'function') setNotesSheetRucId(rucId)
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <div className="flex-shrink-0 px-4 pt-3.5 pb-2">
        <GroupFilterBar />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-1 pb-[130px]">
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <h2 className="font-display font-bold text-[14px] text-ink">RUCs disponibles</h2>
          <span className="text-[11px] text-muted">{visibleRucs.length} clientes</span>
        </div>

        {visibleRucs.map((r) => (
          <RucCard key={r.id} ruc={r} onClick={() => handleSelectRuc(r.id)} />
        ))}

        {visibleRucs.length === 0 && (
          <div className="text-center text-muted text-[12px] py-10">
            Ningún RUC en este grupo. Cambia el filtro arriba.
          </div>
        )}
      </div>
    </div>
  )
}