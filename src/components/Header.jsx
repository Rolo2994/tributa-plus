import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'

const DIAS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

/** Reloj digital HH:MM:SS en vivo — componente propio para no re-renderizar el Header entero cada segundo. */
function ClockDigital() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return (
    <div className="flex items-baseline justify-between mt-3.5">
      <div className="font-mono text-[26px] font-semibold text-white tracking-wider tabular-nums">
        {hh}:{mm}:{ss}
      </div>
      <div className="text-[10.5px] text-sky-200/80 uppercase tracking-wider text-right">
        {DIAS[now.getDay()]} {String(now.getDate()).padStart(2, '0')} {MESES[now.getMonth()]}
      </div>
    </div>
  )
}

export default function Header({ onLock }) {
  const { setDrawerOpen, rucs } = useApp()
  const vencidosHoy = 2 // valor de ejemplo — vendría del cronograma real

  return (
    <div className="app-safe-top relative flex-shrink-0 bg-gradient-to-b from-azul-inst to-azul-dark px-[18px] pt-4 pb-3.5 after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[3px] after:bg-rojo-sunat">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[10px] bg-white/10 border border-white/20 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 21V9L12 3L20 9V21H4Z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M9 21V13H15V21" stroke="#fff" strokeWidth="1.6" />
            </svg>
          </div>
          <div className="font-display font-extrabold text-[17px] text-white tracking-tight">
            Tributa<span className="text-[#FF6B7F]">+</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onLock}
            title="Bloquear"
            className="w-[38px] h-[38px] rounded-[10px] bg-white/10 flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="1.8">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 018 0v3" />
            </svg>
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-[38px] h-[38px] rounded-[10px] bg-white/10 flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path d="M4 6H20M4 12H20M4 18H14" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      <ClockDigital />
      <div className="mt-0.5 text-[11.5px] text-sky-200/80">
        {rucs.length} RUCs activos · {vencidosHoy} vencimientos hoy
      </div>
    </div>
  )
}
