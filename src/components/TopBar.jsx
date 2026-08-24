import React, { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'

export default function TopBar({ titulo, onLock }) {
  const { rucs, setNotesSheetRucId, goScreen, setAccountPanelOpen, todosLosRecordatorios } = useApp()
  const [search, setSearch] = useState('')
  const activos = todosLosRecordatorios.filter((r) => r.recordar)

  const resultados = useMemo(() => {
    if (!search.trim()) return []
    const q = search.trim().toLowerCase()
    return rucs.filter((r) => r.ruc.includes(q) || r.razonSocial.toLowerCase().includes(q)).slice(0, 6)
  }, [rucs, search])

  function elegirResultado(ruc) {
    goScreen('home')
    setNotesSheetRucId(ruc.id)
    setSearch('')
  }

  return (
    <div className="flex items-center gap-4 px-8 py-4 border-b border-bordersoft bg-white/60 backdrop-blur-sm">
      <div className="font-display font-bold text-[17px] text-ink">{titulo}</div>

      <div className="relative flex-1 max-w-[420px] ml-4">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
          <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20l-4.5-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar RUC o razón social…"
          className="w-full text-[13px] border border-bordersoft rounded-xl pl-10 pr-3 py-2.5 bg-white"
        />
        {resultados.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-bordersoft rounded-xl shadow-lg overflow-hidden z-10">
            {resultados.map((r) => (
              <button
                key={r.id}
                onClick={() => elegirResultado(r)}
                className="w-full text-left px-4 py-2.5 hover:bg-[#F7F9FB] border-b border-[#F4F6F9] last:border-0"
              >
                <div className="text-[12.5px] font-semibold text-ink">{r.razonSocial}</div>
                <div className="font-mono text-[10.5px] text-muted">{r.ruc}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button onClick={() => setAccountPanelOpen(true)} className="relative w-9 h-9 rounded-full bg-[#F1F4F8] flex items-center justify-center text-azul-inst">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 2C9 2 7 4.5 7 8v4l-2 4h14l-2-4V8c0-3.5-2-6-5-6Z" strokeLinejoin="round" />
            <path d="M10 20a2 2 0 004 0" />
          </svg>
          {activos.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rojo-sunat text-white text-[8px] font-bold flex items-center justify-center">
              {activos.length}
            </span>
          )}
        </button>
        <button onClick={onLock} className="w-9 h-9 rounded-full bg-[#F1F4F8] flex items-center justify-center text-azul-inst" title="Bloquear">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 018 0v3" />
          </svg>
        </button>
      </div>
    </div>
  )
}