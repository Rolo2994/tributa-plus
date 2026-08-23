import React from 'react'
import { useApp } from '../context/AppContext.jsx'

const ITEMS = [
  {
    id: 'home', label: 'RUCs',
    icon: (c) => <path d="M4 21V9L12 3L20 9V21H4Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill="none" />,
  },
  {
    id: 'alerts', label: 'Alertas',
    icon: (c) => (
      <>
        <path d="M12 2C9 2 7 4.5 7 8v4l-2 4h14l-2-4V8c0-3.5-2-6-5-6Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill="none" />
        <path d="M10 20a2 2 0 004 0" stroke={c} strokeWidth="1.8" fill="none" />
      </>
    ),
  },
  {
    id: 'inicio', label: 'Inicio',
    icon: (c) => (
      <>
        <rect x="4" y="10" width="7" height="10" rx="1.5" stroke={c} strokeWidth="1.8" fill="none" />
        <rect x="13" y="4" width="7" height="16" rx="1.5" stroke={c} strokeWidth="1.8" fill="none" />
      </>
    ),
  },
  {
    id: 'dashboard', label: 'Dashboard',
    icon: (c) => <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke={c} strokeWidth="1.8" strokeLinecap="round" fill="none" />,
  },
  {
    id: 'settings', label: 'Ajustes',
    icon: (c) => (
      <>
        <circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.8" fill="none" />
        <path
          d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 01-4 0v-.09a1.7 1.7 0 00-1-1.55 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.55-1H3a2 2 0 010-4h.09a1.7 1.7 0 001.55-1 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34H9a1.7 1.7 0 001-1.55V3a2 2 0 014 0v.09a1.7 1.7 0 001 1.55 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87V9a1.7 1.7 0 001.55 1H21a2 2 0 010 4h-.09a1.7 1.7 0 00-1.55 1Z"
          stroke={c} strokeWidth="1.8" fill="none"
        />
      </>
    ),
  },
]

/**
 * Navegación de escritorio — reemplaza al BottomNav cuando la pantalla
 * es ancha (md: en adelante). Se queda fija a la izquierda, siempre
 * visible, en vez de competir por espacio dentro del panel central.
 */
export default function SidebarNav() {
  const { screen, goScreen, rucs, todosLosRecordatorios } = useApp()
  const activos = todosLosRecordatorios.filter((r) => r.recordar)

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:flex-shrink-0 bg-gradient-to-b from-azul-inst to-azul-dark min-h-[100dvh] sticky top-0">
      <div className="px-6 pt-7 pb-6 flex items-center gap-2.5 border-b border-white/10">
        <div className="w-9 h-9 rounded-[10px] bg-white/10 border border-white/20 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M4 21V9L12 3L20 9V21H4Z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M9 21V13H15V21" stroke="#fff" strokeWidth="1.6" />
          </svg>
        </div>
        <div className="font-display font-extrabold text-[17px] text-white">
          Tributa<span className="text-[#FF6B7F]">+</span>
        </div>
      </div>

      <div className="px-6 py-4 flex gap-2 border-b border-white/10">
        <div className="flex-1 bg-white/10 rounded-xl px-3 py-2.5">
          <div className="text-[16px] font-display font-bold text-white leading-none">{rucs.length}</div>
          <div className="text-[9px] text-sky-200/70 mt-1">RUCs</div>
        </div>
        <div className="flex-1 bg-white/10 rounded-xl px-3 py-2.5">
          <div className="text-[16px] font-display font-bold text-white leading-none">{activos.length}</div>
          <div className="text-[9px] text-sky-200/70 mt-1">Recordatorios</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {ITEMS.map((item) => {
          const active = screen === item.id
          const color = active ? '#0B3A60' : '#DCEBFA'
          return (
            <button
              key={item.id}
              onClick={() => goScreen(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${
                active ? 'bg-white text-azul-inst' : 'text-sky-100 hover:bg-white/10'
              }`}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" className="flex-shrink-0">{item.icon(color)}</svg>
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="px-6 py-4 text-[9.5px] text-sky-200/50 border-t border-white/10">
        Tributa+ · Panel de escritorio
      </div>
    </aside>
  )
}