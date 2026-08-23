import React, { useRef, useState, useEffect } from 'react'
import { squarify } from '../utils/squarify.js'
import { formatMoney } from '../utils/formatMoney.js'

const PALETTE = ['#0B3A60', '#C8102E', '#D9A404', '#1E8F5F', '#7C3AED', '#0891B2', '#DB2777', '#EA580C', '#4D7C0F', '#5A6B80']

export default function DebtTreemap({ items, height = 220 }) {
  const containerRef = useRef(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width))
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const total = items.reduce((s, i) => s + i.value, 0)

  const withColor = items.map((it, i) => ({
    ...it,
    value: Math.sqrt(Math.max(it.value, 0.01)),
    realValue: it.value,
    color: PALETTE[i % PALETTE.length],
  }))
  const rects = width > 0 ? squarify(withColor, 0, 0, width, height) : []

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      {rects.map((r) => {
        const pct = total > 0 ? (r.realValue / total) * 100 : 0
        // Cuántas líneas de texto caben verticalmente (14px por línea aprox.)
        const maxLineas = Math.floor((r.h - 8) / 14)
        const completo = r.w >= 56 && maxLineas >= 3
        const medio = !completo && r.w >= 30 && maxLineas >= 2

        return (
          <div
            key={r.label}
            className="absolute rounded-lg flex flex-col items-start justify-end p-1.5 overflow-hidden"
            style={{
              left: r.x + 2,
              top: r.y + 2,
              width: Math.max(r.w - 4, 0),
              height: Math.max(r.h - 4, 0),
              background: `linear-gradient(155deg, ${r.color}, ${r.color}CC)`,
              boxShadow: '0 6px 14px -6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            {completo && (
              <>
                <span className="text-white font-semibold text-[10.5px] leading-tight w-full truncate whitespace-nowrap">{r.label}</span>
                <span className="text-white/90 font-mono font-bold text-[12px] leading-tight whitespace-nowrap">S/&nbsp;{formatMoney(r.realValue)}</span>
                <span className="text-white/70 text-[8.5px] whitespace-nowrap">{pct.toFixed(0)}%</span>
              </>
            )}
            {medio && (
              <>
                <span className="text-white font-bold text-[9px] leading-tight w-full truncate whitespace-nowrap">{r.label}</span>
                <span className="text-white/80 text-[8px] whitespace-nowrap">{pct.toFixed(0)}%</span>
              </>
            )}
            {!completo && !medio && r.w >= 16 && (
              <span className="text-white font-bold text-[8px] m-auto whitespace-nowrap">{pct.toFixed(0)}%</span>
            )}
          </div>
        )
      })}
      {items.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted text-[12px]">Sin deuda pendiente en este filtro.</div>
      )}
    </div>
  )
}