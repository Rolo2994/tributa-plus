import React, { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import RucCard from '../components/RucCard.jsx'
import GroupFilterBar from '../components/GroupFilterBar.jsx'

export default function HomeScreen() {
  const { visibleRucs = [], setNotesSheetRucId } = useApp()
  const [search, setSearch] = useState('')

  const filtrados = useMemo(() => {
    if (!search.trim()) return visibleRucs
    const q = search.trim().toLowerCase()
    return visibleRucs.filter(
      (r) => r.ruc.includes(q) || r.razonSocial.toLowerCase().includes(q)
    )
  }, [visibleRucs, search])

  function handleSelectRuc(rucId) {
    if (typeof setNotesSheetRucId === 'function') setNotesSheetRucId(rucId)
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <div className="flex-shrink-0 px-4 pt-3.5 pb-2 space-y-2.5">
        <div className="relative">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
            <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-4.5-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por RUC o razón social…"
            className="w-full text-[13px] border border-bordersoft rounded-2xl pl-10 pr-9 py-3 bg-white shadow-card"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#F1F4F8] text-muted flex items-center justify-center text-[11px]"
            >
              ✕
            </button>
          )}
        </div>
        <GroupFilterBar />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-1 pb-[130px]">
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <h2 className="font-display font-bold text-[14px] text-ink">RUCs disponibles</h2>
          <span className="text-[11px] text-muted">{filtrados.length} clientes</span>
        </div>

        {filtrados.map((r) => (
          <RucCard key={r.id} ruc={r} onClick={() => handleSelectRuc(r.id)} />
        ))}

        {filtrados.length === 0 && search && (
          <div className="text-center text-muted text-[12px] py-10">
            Ningún RUC coincide con "{search}".
          </div>
        )}
        {filtrados.length === 0 && !search && (
          <div className="text-center text-muted text-[12px] py-10">
            Ningún RUC en este grupo. Cambia el filtro arriba.
          </div>
        )}
      </div>
    </div>
  )
}