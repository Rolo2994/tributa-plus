import React from 'react'
import { useApp } from '../context/AppContext.jsx'

const ITEMS = [
  {
    id: 'home',
    label: 'RUCs',
    icon: (c) => (
      <path d="M4 21V9L12 3L20 9V21H4Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill="none" />
    ),
  },
  {
    id: 'alerts',
    label: 'Alertas',
    icon: (c) => (
      <>
        <path d="M12 2C9 2 7 4.5 7 8v4l-2 4h14l-2-4V8c0-3.5-2-6-5-6Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill="none" />
        <path d="M10 20a2 2 0 004 0" stroke={c} strokeWidth="1.8" fill="none" />
      </>
    ),
  },
  {
    id: 'modules',
    label: 'Módulos',
    icon: (c) => (
      <>
        <rect x="4" y="4" width="7" height="7" rx="1.5" stroke={c} strokeWidth="1.8" fill="none" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" stroke={c} strokeWidth="1.8" fill="none" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" stroke={c} strokeWidth="1.8" fill="none" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" stroke={c} strokeWidth="1.8" fill="none" />
      </>
    ),
  },
  {
    id: 'settings',
    label: 'Ajustes',
    icon: (c) => (
      <>
        <circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.8" fill="none" />
        <path
          d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 01-4 0v-.09a1.7 1.7 0 00-1-1.55 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.55-1H3a2 2 0 010-4h.09a1.7 1.7 0 001.55-1 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34H9a1.7 1.7 0 001-1.55V3a2 2 0 014 0v.09a1.7 1.7 0 001 1.55 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87V9a1.7 1.7 0 001.55 1H21a2 2 0 010 4h-.09a1.7 1.7 0 00-1.55 1Z"
          stroke={c}
          strokeWidth="1.8"
          fill="none"
        />
      </>
    ),
  },
]

export default function BottomNav() {
  const { screen, goScreen } = useApp()
  return (
    <div className="absolute left-0 right-0 bottom-0 z-30 flex bg-white border-t border-bordersoft px-1.5 pt-2.5 pb-3">
      {ITEMS.map((item) => {
        const active = screen === item.id
        const color = active ? '#0B3A60' : '#68788A'
        return (
          <button
            key={item.id}
            onClick={() => goScreen(item.id)}
            className={`flex-1 flex flex-col items-center gap-[3px] py-1 text-[9.5px] font-semibold ${
              active ? 'text-azul-inst' : 'text-muted'
            }`}
          >
            <svg viewBox="0 0 24 24" width="19" height="19">
              {item.icon(color)}
            </svg>
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
