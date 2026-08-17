import React, { useState } from 'react'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS_CORTOS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const pad = (n) => String(n).padStart(2, '0')

function toISO(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

function buildGrid(year, month) {
  const first = new Date(year, month, 1)
  const startOffset = first.getDay() // 0=domingo
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
}

/**
 * Selector de fecha propio — reemplaza el calendario nativo del sistema
 * (que Android/iOS pintan con su propio estilo, sin relación al diseño
 * de la app), con el mismo lenguaje visual que CustomTimePicker.
 */
export default function CustomDatePicker({ value, onChange, className = '' }) {
  const [open, setOpen] = useState(false)
  const hoy = new Date()

  const parsed = value ? new Date(value + 'T00:00:00') : hoy
  const [viewYear, setViewYear] = useState(parsed.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed.getMonth())

  function abrir() {
    const p = value ? new Date(value + 'T00:00:00') : hoy
    setViewYear(p.getFullYear())
    setViewMonth(p.getMonth())
    setOpen(true)
  }

  function cambiarMes(delta) {
    let m = viewMonth + delta
    let y = viewYear
    if (m < 0) { m = 11; y -= 1 }
    if (m > 11) { m = 0; y += 1 }
    setViewMonth(m)
    setViewYear(y)
  }

  function elegirDia(d) {
    onChange(toISO(viewYear, viewMonth, d))
    setOpen(false)
  }

  function irAHoy() {
    setViewYear(hoy.getFullYear())
    setViewMonth(hoy.getMonth())
    onChange(toISO(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()))
    setOpen(false)
  }

  const cells = buildGrid(viewYear, viewMonth)
  const hoyISO = toISO(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())

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
          <div className="w-full bg-white rounded-t-[24px] p-5 shadow-[0_-8px_30px_rgba(0,0,0,0.2)]" onClick={(e) => e.stopPropagation()}>
            <div className="w-[38px] h-1 bg-[#DCE3EA] rounded mx-auto mb-4" />

            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={() => cambiarMes(-1)} className="w-9 h-9 rounded-full bg-[#F1F4F8] text-azul-inst flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </button>
              <div className="font-display font-bold text-[15px] text-ink">{MESES[viewMonth]} {viewYear}</div>
              <button type="button" onClick={() => cambiarMes(1)} className="w-9 h-9 rounded-full bg-[#F1F4F8] text-azul-inst flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1.5">
              {DIAS_CORTOS.map((d, i) => (
                <div key={i} className="text-center text-[10px] font-semibold text-muted py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (d === null) return <div key={i} />
                const iso = toISO(viewYear, viewMonth, d)
                const selected = iso === value
                const esHoy = iso === hoyISO
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => elegirDia(d)}
                    className={`aspect-square rounded-xl flex items-center justify-center text-[13px] font-semibold ${
                      selected ? 'bg-azul-inst text-white' : esHoy ? 'bg-[#EAF1FA] text-azul-inst' : 'text-ink active:bg-[#F7F9FB]'
                    }`}
                  >
                    {d}
                  </button>
                )
              })}
            </div>

            <button type="button" onClick={irAHoy} className="w-full mt-4 py-2.5 rounded-xl bg-[#F1F4F8] text-azul-inst font-semibold text-[12px]">
              Hoy — {pad(hoy.getDate())} {MESES[hoy.getMonth()].slice(0, 3)} {hoy.getFullYear()}
            </button>
          </div>
        </div>
      )}
    </>
  )
}