import React, { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'

/**
 * Consola de actividad flotante — muestra en vivo cada acción
 * simulada (login automático, sincronización, envíos por WhatsApp,
 * etc.), igual que el log de la app de escritorio de Rolo.
 */
export default function ConsoleLog() {
  const { logs } = useApp()
  const [collapsed, setCollapsed] = useState(false)
  const bodyRef = useRef(null)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [logs])

  return (
    <div className="absolute left-3.5 right-3.5 bottom-[78px] z-20 rounded-[14px] overflow-hidden bg-[#0A1017] border border-[#1E2833] shadow-float">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-3 py-[9px] bg-[#0F1720] border-b border-[#1E2833]"
      >
        <span className="flex items-center gap-[7px] font-mono text-[10.5px] text-[#7FA0BE] uppercase tracking-wide">
          <span className="w-[7px] h-[7px] rounded-full bg-verde-console shadow-[0_0_8px_#3BEB8A]" />
          Actividad en vivo
        </span>
        <span className="text-[#5A7186] text-[11px]">{collapsed ? '▸' : '▾'}</span>
      </button>
      {!collapsed && (
        <div ref={bodyRef} className="font-mono text-[10.5px] leading-relaxed px-3 py-2.5 h-[112px] overflow-y-auto text-verde-console">
          {logs.map((l) => (
            <div key={l.id} className="animate-fadein whitespace-pre-wrap">
              <span className="text-[#4A6A85]">[{l.ts.toTimeString().slice(0, 8)}]</span> {l.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
