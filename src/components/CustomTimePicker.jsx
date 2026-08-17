import React, { useEffect, useRef, useState } from 'react'

const pad = (n) => String(n).padStart(2, '0')
const ITEM_H = 44

/* ───────────────── Rueda deslizable (estilo iOS) ───────────────── */
function WheelColumn({ values, value, onChange, label }) {
  const ref = useRef(null)
  const timer = useRef(null)
  const didInit = useRef(false)

  useEffect(() => {
    const idx = values.indexOf(value)
    if (ref.current && idx >= 0) ref.current.scrollTop = idx * ITEM_H
    didInit.current = true
  }, []) // eslint-disable-line

  function commitFromScroll() {
    if (!ref.current) return
    const idx = Math.round(ref.current.scrollTop / ITEM_H)
    const clamped = Math.max(0, Math.min(values.length - 1, idx))
    ref.current.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' })
    onChange(values[clamped])
  }

  function handleScroll() {
    if (!didInit.current) return
    clearTimeout(timer.current)
    timer.current = setTimeout(commitFromScroll, 110)
  }

  return (
    <div className="relative w-20">
      <div
        ref={ref}
        onScroll={handleScroll}
        className="h-[176px] overflow-y-scroll no-scrollbar"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        <div style={{ height: ITEM_H * 2 }} />
        {values.map((v) => (
          <div
            key={v}
            style={{ height: ITEM_H, scrollSnapAlign: 'center' }}
            className={`flex items-center justify-center font-mono font-bold transition-all ${
              v === value ? 'text-[26px] text-azul-inst' : 'text-[18px] text-[#C3CEDA]'
            }`}
          >
            {pad(v)}
          </div>
        ))}
        <div style={{ height: ITEM_H * 2 }} />
      </div>
      <div className="text-center text-[9.5px] font-semibold text-muted uppercase tracking-wide mt-1">{label}</div>
    </div>
  )
}

function WheelPicker({ hh, mm, onChangeHH, onChangeMM }) {
  const horas = Array.from({ length: 24 }, (_, i) => i)
  const minutos = Array.from({ length: 60 }, (_, i) => i)
  return (
    <div className="relative flex items-center justify-center gap-3">
      <div className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 h-11 bg-[#EAF1FA] rounded-2xl z-0" />
      <div className="relative z-10"><WheelColumn values={horas} value={hh} onChange={onChangeHH} label="Hora" /></div>
      <div className="relative z-10 font-display font-bold text-[22px] text-ink pb-4">:</div>
      <div className="relative z-10"><WheelColumn values={minutos} value={mm} onChange={onChangeMM} label="Min" /></div>
    </div>
  )
}

/* ───────────────── Reloj circular (arrastre real con pointer events) ───────────────── */
function polarPoint(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * (Math.PI / 180)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function CircularClock({ hh, mm, onChangeHH, onChangeMM }) {
  const [step, setStep] = useState('hour') // 'hour' | 'minute'
  const [isPM, setIsPM] = useState(hh >= 12)
  const svgRef = useRef(null)
  const size = 250
  const cx = size / 2
  const cy = size / 2
  const rOuter = 100

  const hour12 = hh % 12 === 0 ? 12 : hh % 12

  function valueFromPointer(clientX, clientY, steps) {
    const rect = svgRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    let angle = Math.atan2(x - cx, -(y - cy)) * (180 / Math.PI)
    if (angle < 0) angle += 360
    const raw = Math.round(angle / (360 / steps)) % steps
    return raw
  }

  function handlePointer(e) {
    e.preventDefault()
    if (step === 'hour') {
      let v = valueFromPointer(e.clientX, e.clientY, 12)
      if (v === 0) v = 12
      const hh24 = isPM ? (v === 12 ? 12 : v + 12) : (v === 12 ? 0 : v)
      onChangeHH(hh24)
    } else {
      const v = valueFromPointer(e.clientX, e.clientY, 60)
      onChangeMM(v)
    }
  }

  function onDown(e) {
    handlePointer(e)
    function onMove(ev) { handlePointer(ev) }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (step === 'hour') setStep('minute')
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const handAngle = step === 'hour' ? (hour12 % 12) * 30 : mm * 6
  const handEnd = polarPoint(cx, cy, rOuter - 22, handAngle)
  const knobPos = polarPoint(cx, cy, rOuter - 22, handAngle)

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setStep('hour')}
          className={`font-mono font-extrabold text-[34px] px-2 rounded-xl ${step === 'hour' ? 'bg-[#EAF1FA] text-azul-inst' : 'text-ink'}`}
        >
          {pad(hour12)}
        </button>
        <span className="font-display font-bold text-[30px] text-ink">:</span>
        <button
          onClick={() => setStep('minute')}
          className={`font-mono font-extrabold text-[34px] px-2 rounded-xl ${step === 'minute' ? 'bg-[#EAF1FA] text-azul-inst' : 'text-ink'}`}
        >
          {pad(mm)}
        </button>
        <div className="flex flex-col gap-1 ml-2">
          <button
            onClick={() => { setIsPM(false); if (hh >= 12) onChangeHH(hh - 12) }}
            className={`text-[10px] font-bold px-2 py-1 rounded-lg ${!isPM ? 'bg-azul-inst text-white' : 'bg-[#F1F4F8] text-muted'}`}
          >
            AM
          </button>
          <button
            onClick={() => { setIsPM(true); if (hh < 12) onChangeHH(hh + 12) }}
            className={`text-[10px] font-bold px-2 py-1 rounded-lg ${isPM ? 'bg-azul-inst text-white' : 'bg-[#F1F4F8] text-muted'}`}
          >
            PM
          </button>
        </div>
      </div>

      <svg ref={svgRef} width={size} height={size} onPointerDown={onDown} className="touch-none select-none">
        <circle cx={cx} cy={cy} r={rOuter} fill="#F7F9FB" stroke="#EEF2F7" strokeWidth="2" />
        <line x1={cx} y1={cy} x2={handEnd.x} y2={handEnd.y} stroke="#0B3A60" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4" fill="#0B3A60" />
        <circle cx={knobPos.x} cy={knobPos.y} r="17" fill="#0B3A60" />
        {step === 'hour'
          ? Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
              const p = polarPoint(cx, cy, rOuter - 22, n * 30)
              const active = n === hour12
              return (
                <text key={n} x={p.x} y={p.y + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill={active ? '#fff' : '#152233'}>
                  {n}
                </text>
              )
            })
          : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((n) => {
              const p = polarPoint(cx, cy, rOuter - 22, n * 6)
              const active = Math.round(mm / 5) * 5 % 60 === n
              return (
                <text key={n} x={p.x} y={p.y + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill={active ? '#fff' : '#152233'}>
                  {pad(n)}
                </text>
              )
            })}
      </svg>

      <div className="text-[10.5px] text-muted mt-3">
        {step === 'hour' ? 'Arrastra para elegir la hora' : 'Arrastra para elegir los minutos'}
      </div>
    </div>
  )
}

/* ───────────────── Componente principal ───────────────── */
export default function CustomTimePicker({ value, onChange, className = '' }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('wheel') // 'wheel' | 'clock'
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
      <button type="button" onClick={abrir} className={`flex items-center justify-between text-[12px] border border-bordersoft rounded-lg px-3 py-2.5 bg-white text-ink ${className}`}>
        <span className="font-mono font-semibold">{pad(h)}:{pad(m)}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-muted">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute inset-0 z-[90] bg-black/55 flex items-end" onClick={() => setOpen(false)}>
          <div className="w-full bg-white rounded-t-[24px] p-5 shadow-[0_-8px_30px_rgba(0,0,0,0.2)]" onClick={(e) => e.stopPropagation()}>
            <div className="w-[38px] h-1 bg-[#DCE3EA] rounded mx-auto mb-4" />

            <div className="flex items-center justify-between mb-5">
              <div className="font-display font-bold text-[15px] text-ink">Elegir hora</div>
              <button
                onClick={() => setMode((m) => (m === 'wheel' ? 'clock' : 'wheel'))}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-azul-inst bg-[#EAF1FA] px-3 py-1.5 rounded-full"
              >
                {mode === 'wheel' ? '🕐 Reloj circular' : '🎚 Deslizar'}
              </button>
            </div>

            <div className="min-h-[220px] flex items-center justify-center py-2">
              {mode === 'wheel' ? (
                <WheelPicker hh={hh} mm={mm} onChangeHH={setHh} onChangeMM={setMm} />
              ) : (
                <CircularClock hh={hh} mm={mm} onChangeHH={setHh} onChangeMM={setMm} />
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 py-3 rounded-xl bg-[#F1F4F8] text-ink font-semibold text-[12.5px]">Cancelar</button>
              <button type="button" onClick={confirmar} className="flex-1 py-3 rounded-xl bg-azul-inst text-white font-semibold text-[12.5px]">Establecer</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}