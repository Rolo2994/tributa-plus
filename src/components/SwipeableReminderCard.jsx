import React, { useRef, useState } from 'react'

const SWIPE_THRESHOLD = 90
const LONG_PRESS_MS = 550

/**
 * Envoltorio con gestos para tarjetas de recordatorio:
 * - Deslizar a la izquierda o derecha más de SWIPE_THRESHOLD → confirma y elimina.
 * - Mantener presionado sin mover el dedo → activa/desactiva.
 * Usa Pointer Events (funciona igual con touch y con mouse, útil para probar en PC).
 */
export default function SwipeableReminderCard({ children, onDelete, onToggle }) {
  const [translateX, setTranslateX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const longPressTimer = useRef(null)
  const movedEnough = useRef(false)

  function clearLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function handlePointerDown(e) {
    startX.current = e.clientX
    startY.current = e.clientY
    movedEnough.current = false
    setDragging(true)
    longPressTimer.current = setTimeout(() => {
      if (!movedEnough.current) {
        if (navigator.vibrate) navigator.vibrate(30)
        onToggle && onToggle()
        setDragging(false)
      }
    }, LONG_PRESS_MS)
  }

  function handlePointerMove(e) {
    if (!dragging) return
    const dx = e.clientX - startX.current
    const dy = e.clientY - startY.current
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      movedEnough.current = true
      clearLongPress()
    }
    if (Math.abs(dx) > Math.abs(dy)) setTranslateX(dx)
  }

  function handlePointerUp() {
    clearLongPress()
    setDragging(false)
    if (Math.abs(translateX) > SWIPE_THRESHOLD) {
      onDelete && onDelete()
    }
    setTranslateX(0)
  }

  const bgOpacity = Math.min(Math.abs(translateX) / SWIPE_THRESHOLD, 1)

  return (
    <div className="relative mb-2.5">
      <div
        className="absolute inset-0 rounded-2xl flex items-center px-5 bg-rojo-sunat pointer-events-none"
        style={{ opacity: bgOpacity, justifyContent: translateX > 0 ? 'flex-start' : 'flex-end' }}
      >
        <span className="text-white text-[12px] font-semibold">🗑 Soltar para eliminar</span>
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ 
          transform: `translateX(${translateX}px)`,
          transition: dragging ? 'none' : 'transform .25s ease',
          touchAction: 'pan-y',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          userSelect: 'none',
        }}
        className="relative"
      >
        {children}
      </div>
    </div>
  )
}