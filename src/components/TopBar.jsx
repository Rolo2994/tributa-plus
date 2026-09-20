import React from 'react'
import { useApp } from '../context/AppContext.jsx'

export default function TopBar({ titulo, onLock }) {
  const { setAccountPanelOpen, todosLosRecordatorios } = useApp()
  const activos = todosLosRecordatorios.filter((r) => r.recordar)

  return (
    <div className="flex items-center gap-4 px-8 py-4 border-b border-bordersoft bg-white/60 backdrop-blur-sm">
      <div className="font-display font-bold text-[17px] text-ink">{titulo}</div>

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
