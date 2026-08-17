import React, { useEffect, useRef, useState } from 'react'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const DIAS_CORTOS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const pad = (n) => String(n).padStart(2, '0')
const SWIPE_THRESHOLD = 45
const TOTAL_CELLS = 42 // 6 filas x 7 columnas — SIEMPRE, así el alto nunca cambia entre meses

function toISO(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

/** Devuelve exactamente 42 celdas: días del mes anterior (atenuados) + del mes actual + del mes siguiente (atenuados). */
function buildGrid(year, month) {
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells = []
  for (let i = 0; i < firstDow; i++) {
    const d = daysInPrevMonth - firstDow + 1 + i
    cells.push({ day: d, type: 'prev' })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, type: 'current' })
  }
  let nextDay = 1
  while (cells.length < TOTAL_CELLS) {
    cells.push({ day: nextDay, type: 'next' })
    nextDay++
  }
  return cells
}

function decadeStart(year) {
  return Math.floor(year / 10) * 10 - 1
}

export default function CustomDatePicker({ value, onChange, className = '' }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('days')
  const hoy = new Date()

  const parsed = value ? new Date(value + 'T00:00:00') : hoy
  const [viewYear, setViewYear] = useState(parsed.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed.getMonth())

  // Animación de deslizamiento: 'enter-left' | 'enter-right' | null
  const [animClass, setAnimClass] = useState(null)
  const animTimer = useRef(null)

  const dragX = useRef(0)
  const dragging = useRef(false)

  function abrir() {
    const p = value ? new Date(value + 'T00:00:00') : hoy
    setViewYear(p.getFullYear())
    setViewMonth(p.getMonth())
    setView('days')
    setOpen(true)
  }

  function irAMes(year, month) {
    setViewYear(year)
    setViewMonth(month)
  }

  function cambiarMes(delta) {
    clearTimeout(animTimer.current)
    setAnimClass(delta > 0 ? 'enter-right' : 'enter-left')
    let m = viewMonth + delta
    let y = viewYear
    if (m < 0) { m = 11; y -= 1 }
    if (m > 11) { m = 0; y += 1 }
    irAMes(y, m)
    // Se limpia después de que termina la animación (220ms) — si se
    // limpiara antes, cortaría el deslizamiento a la mitad.
    animTimer.current = setTimeout(() => setAnimClass(null), 230)
  }

  useEffect(() => () => clearTimeout(animTimer.current), [])

  function elegirDiaEn(year, month, d) {
    onChange(toISO(year, month, d))
    setOpen(false)
  }

  function onCellClick(cell) {
    if (cell.type === 'prev') {
      const m = viewMonth === 0 ? 11 : viewMonth - 1
      const y = viewMonth === 0 ? viewYear - 1 : viewYear
      elegirDiaEn(y, m, cell.day)
    } else if (cell.type === 'next') {
      const m = viewMonth === 11 ? 0 : viewMonth + 1
      const y = viewMonth === 11 ? viewYear + 1 : viewYear
      elegirDiaEn(y, m, cell.day)
    } else {
      elegirDiaEn(viewYear, viewMonth, cell.day)
    }
  }

  function irAHoy() {
    irAMes(hoy.getFullYear(), hoy.getMonth())
    onChange(toISO(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()))
    setOpen(false)
  }

  function onPointerDown(e) {
    dragging.current = true
    dragX.current = e.clientX
  }
  function onPointerUp(e) {
    if (!dragging.current) return
    dragging.current = false
    const dx = e.clientX - dragX.current
    if (dx > SWIPE_THRESHOLD) cambiarMes(-1)
    else if (dx < -SWIPE_THRESHOLD) cambiarMes(1)
  }

  const cells = buildGrid(viewYear, viewMonth)
  const hoyISO = toISO(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const dStart = decadeStart(viewYear)
  const anios = Array.from({ length: 12 }, (_, i) => dStart + i)

  const displayLabel = value
    ? `${pad(parsed.getDate())} ${MESES[parsed.getMonth()].slice(0, 3)} ${parsed.getFullYear()}`
    : 'Elegir fecha'

  return (
    <>
      <button type="button" onClick={abrir} className={`flex items-center justify-between text-[12px] border border-bordersoft rounded-lg px-3 py-2.5 bg-white text-ink ${className}`}>
        <span className="font-medium">{displayLabel}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-muted flex-shrink-0 ml-1.5">
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute inset-0 z-[90] bg-black/55 flex items-end" onClick={() => setOpen(false)}>
          <div className="w-full bg-white rounded-t-[24px] p-5 shadow-[0_-8px_30px_rgba(0,0,0,0.2)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="w-[38px] h-1 bg-[#DCE3EA] rounded mx-auto mb-4" />

            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => (view === 'days' ? cambiarMes(-1) : setViewYear((y) => (view === 'years' ? y - 12 : y - 1)))}
                className="w-9 h-9 rounded-full bg-[#F1F4F8] text-azul-inst flex items-center justify-center flex-shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </button>

              <div className="flex items-center gap-2">
                {view === 'days' && (
                  <>
                    <button type="button" onClick={() => setView('months')} className="font-display font-bold text-[15px] text-azul-inst px-3 py-1.5 rounded-lg bg-[#EAF1FA]">
                      {MESES[viewMonth]}
                    </button>
                    <button type="button" onClick={() => setView('years')} className="font-display font-bold text-[15px] text-azul-inst px-3 py-1.5 rounded-lg bg-[#EAF1FA]">
                      {viewYear}
                    </button>
                  </>
                )}
                {view === 'months' && <div className="font-display font-bold text-[16px] text-ink px-3 py-1.5">{viewYear}</div>}
                {view === 'years' && <div className="font-display font-bold text-[16px] text-ink px-3 py-1.5">{dStart + 1}–{dStart + 10}</div>}
              </div>

              <button
                type="button"
                onClick={() => (view === 'days' ? cambiarMes(1) : setViewYear((y) => (view === 'years' ? y + 12 : y + 1)))}
                className="w-9 h-9 rounded-full bg-[#F1F4F8] text-azul-inst flex items-center justify-center flex-shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </button>
            </div>

            {view === 'days' && (
              <div onPointerDown={onPointerDown} onPointerUp={onPointerUp} className="touch-pan-y">
                <div className="grid grid-cols-7 gap-1 mb-1.5">
                  {DIAS_CORTOS.map((d, i) => (
                    <div key={i} className="text-center text-[10px] font-semibold text-muted py-1">{d}</div>
                  ))}
                </div>

                <div
                  key={`${viewYear}-${viewMonth}`}
                  className={`grid grid-cols-7 grid-rows-6 gap-1 ${animClass === 'enter-right' ? 'dp-enter-right' : animClass === 'enter-left' ? 'dp-enter-left' : 'dp-enter-settled'}`}
                >
                  {cells.map((cell, i) => {
                    const isCurrent = cell.type === 'current'
                    const iso = isCurrent ? toISO(viewYear, viewMonth, cell.day) : null
                    const selected = isCurrent && iso === value
                    const esHoy = isCurrent && iso === hoyISO
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onCellClick(cell)}
                        className={`aspect-square rounded-xl flex items-center justify-center text-[13.5px] font-semibold ${
                          selected
                            ? 'bg-azul-inst text-white shadow-[0_4px_10px_-2px_rgba(11,58,96,0.5)]'
                            : esHoy
                            ? 'bg-[#EAF1FA] text-azul-inst'
                            : isCurrent
                            ? 'text-ink active:bg-[#F7F9FB]'
                            : 'text-[#D5DEE8] active:bg-[#F7F9FB]'
                        }`}
                      >
                        {cell.day}
                      </button>
                    )
                  })}
                </div>
                <div className="text-center text-[9.5px] text-[#C3CEDA] mt-2">← desliza para cambiar de mes →</div>
              </div>
            )}

            {view === 'months' && (
              <div className="grid grid-cols-4 gap-2">
                {MESES_CORTOS.map((m, i) => {
                  const active = i === viewMonth
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setViewMonth(i); setView('days') }}
                      className={`py-3.5 rounded-xl text-[12.5px] font-bold ${active ? 'bg-azul-inst text-white' : 'bg-[#F7F9FB] text-ink active:bg-[#EEF2F7]'}`}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            )}

            {view === 'years' && (
              <div className="grid grid-cols-4 gap-2">
                {anios.map((y) => {
                  const active = y === viewYear
                  const fueraDecada = y === dStart || y === dStart + 11
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => { setViewYear(y); setView('months') }}
                      className={`py-3.5 rounded-xl text-[12.5px] font-bold ${
                        active ? 'bg-azul-inst text-white' : fueraDecada ? 'text-[#C3CEDA]' : 'bg-[#F7F9FB] text-ink active:bg-[#EEF2F7]'
                      }`}
                    >
                      {y}
                    </button>
                  )
                })}
              </div>
            )}

            {view === 'days' && (
              <button type="button" onClick={irAHoy} className="w-full mt-4 py-2.5 rounded-xl bg-[#F1F4F8] text-azul-inst font-semibold text-[12px]">
                Hoy — {pad(hoy.getDate())} {MESES[hoy.getMonth()].slice(0, 3)} {hoy.getFullYear()}
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes dpSlideFromRight { from { transform: translateX(28px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes dpSlideFromLeft  { from { transform: translateX(-28px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .dp-enter-right  { animation: dpSlideFromRight .22s ease; }
        .dp-enter-left   { animation: dpSlideFromLeft .22s ease; }
        .dp-enter-settled{ animation: dpSlideFromRight .01s ease; }
      `}</style>
    </>
  )
}