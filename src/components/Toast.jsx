import React, { useEffect } from 'react'

/** Aviso flotante breve — aparece arriba, se oculta solo después de un momento. */
export default function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDone, 1800)
    return () => clearTimeout(t)
  }, [message, onDone])

  if (!message) return null
  return (
    <div className="absolute top-3 left-4 right-4 z-[80] flex justify-center pointer-events-none">
      <div className="bg-[#152233] text-white text-[12px] font-semibold px-4 py-2.5 rounded-full shadow-lg animate-fadein">
        {message}
      </div>
    </div>
  )
}