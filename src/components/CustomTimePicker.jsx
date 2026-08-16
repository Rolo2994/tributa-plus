import React, { useState } from 'react'

const pad = (n) => String(n).padStart(2, '0')

/** Reemplaza el reloj nativo (el disco de Android) por un selector propio, con esteticismo consistente al resto de la app. */
export default function CustomTimePicker({ value, onChange, className = '' }) {
  const [open, setOpen] = useState(false)
  const [h, m] = (value || '09:00').split(':').map(Number)
  const [hh, setHh] = useState(h)
  const [mm, setMm] = useState(m)

  function abrir() {
    const [ch, cm] = (value || '09:00').split(':').map(Number)
    setHh(ch); setMm(cm)
    setOpen(true)
  }
  function confirmar() {
    onChange(`${pad(hh)}:${pad(mm)}`)
    setOpen(false)
  }

  return (
    <>
      <button type="button" onClick={abrir} className={`flex items-center justify-between text-[12px] border border-bordersoft rounded-lg px-3 py-2 bg-white text-ink ${className}`}>
        <span className="font-mono">{pad(h)}:{pad(m)}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-muted">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute inset-0 z-[90] bg-black/50 flex items-end" onClick={() => setOpen(false)}>
          <div className="w-full bg-white rounded-t-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="w-[38px] h-1 bg-[#DCE3EA] rounded mx-auto mb-4" />
            <div className="text-center font-display font-bold text-[14px] text-ink mb-5">Elegir hora</div>

            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="flex flex-col items-center gap-2">
                <button type="button" onClick={() => setHh((v) => (v + 1) % 24)} className="w-9 h-9 rounded-full bg-[#F1F4F8] text-azul-inst flex items-center justify-center text-[15px]">▲</button>
                <div className="w-16 h-16 rounded-2xl bg-azul-dark text-white flex items-center justify-center font-mono font-bold text-[26px]">{pad(hh)}</div>
                <button type="button" onClick={() => setHh((v) => (v + 23) % 24)} className="w-9 h-9 rounded-full bg-[#F1F4F8] text-azul-inst flex items-center justify-center text-[15px]">▼</button>
              </div>
              <div className="font-display font-bold text-[26px] text-ink pb-1">:</div>
              <div className="flex flex-col items-center gap-2">
                <button type="button" onClick={() => setMm((v) => (v + 5) % 60)} className="w-9 h-9 rounded-full bg-[#F1F4F8] text-azul-inst flex items-center justify-center text-[15px]">▲</button>
                <div className="w-16 h-16 rounded-2xl bg-azul-dark text-white flex items-center justify-center font-mono font-bold text-[26px]">{pad(mm)}</div>
                <button type="button" onClick={() => setMm((v) => (v + 55) % 60)} className="w-9 h-9 rounded-full bg-[#F1F4F8] text-azul-inst flex items-center justify-center text-[15px]">▼</button>
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 py-3 rounded-xl bg-[#F1F4F8] text-ink font-semibold text-[12.5px]">Cancelar</button>
              <button type="button" onClick={confirmar} className="flex-1 py-3 rounded-xl bg-azul-inst text-white font-semibold text-[12.5px]">Establecer</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}