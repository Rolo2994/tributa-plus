import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'

const DOT_COLOR = { ok: 'bg-verde', prox: 'bg-ambar', vencido: 'bg-rojo-sunat' }

/** Panel lateral con la lista completa de RUCs — sirve para elegir el "RUC activo" usado por Módulos. */
export default function Drawer() {
  const { rucs, drawerOpen, setDrawerOpen, activeRucId, setActiveRucId, pushLog } = useApp()
  const [search, setSearch] = useState('')

  const filtered = rucs.filter(
    (r) =>
      r.ruc.includes(search) ||
      r.razonSocial.toLowerCase().includes(search.toLowerCase())
  )

  function pick(ruc) {
    setActiveRucId(ruc.id)
    setDrawerOpen(false)
    pushLog(`RUC activo cambiado a ${ruc.razonSocial} (${ruc.ruc})`)
  }

  return (
    <>
      <div
        onClick={() => setDrawerOpen(false)}
        className={`absolute inset-0 z-40 bg-[#071422]/50 transition-opacity duration-200 ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />
      <div
        className={`absolute top-0 bottom-0 left-0 z-[41] w-[82%] overflow-y-auto p-[22px_16px] bg-gradient-to-b from-azul-inst to-[#062338] transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="font-display font-bold text-[15px] text-white mb-1">RUCs disponibles</div>
        <div className="text-[11px] text-sky-200/70 mb-4">Toca un RUC para usarlo en Módulos</div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar RUC o razón social…"
          className="w-full mb-3.5 rounded-[10px] bg-white/10 border border-white/15 px-3 py-2.5 text-[12px] text-white placeholder:text-sky-300/60"
        />
        {filtered.map((r) => (
          <div
            key={r.id}
            onClick={() => pick(r)}
            className={`flex items-center gap-2.5 px-2 py-2.5 rounded-[10px] text-[12.5px] text-sky-100 cursor-pointer mb-0.5 ${
              r.id === activeRucId ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${DOT_COLOR[r.status]}`} />
            <span>
              <b className="text-white font-semibold">{r.ruc}</b> — {r.razonSocial.split(' ').slice(0, 2).join(' ')}
            </span>
            {r.id === activeRucId && <span className="ml-auto text-verde-console text-xs">✓</span>}
          </div>
        ))}
      </div>
    </>
  )
}
