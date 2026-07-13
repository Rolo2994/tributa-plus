import React from 'react'

const DOT = {
  ok: 'bg-verde',
  prox: 'bg-ambar',
  vencido: 'bg-rojo-sunat',
}
const TAG_TONE = {
  urgent: 'bg-[#FCE9EB] text-rojo-sunat',
  warn: 'bg-[#FBF1DD] text-[#8A6A00]',
  neutral: 'bg-[#F1F5FA] text-azul-inst',
}

/** Tarjeta individual de RUC — el punto rojo "vencido" tiene un pulso radar para que el ojo vaya directo a lo urgente. */
export default function RucCard({ ruc, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 bg-white rounded-2xl p-3.5 mb-2.5 border border-[#F0F3F7] shadow-card cursor-pointer active:scale-[0.98] transition-transform"
    >
      <div className="relative w-3 h-3 flex-shrink-0">
        <span className={`absolute inset-0 rounded-full z-[2] ${DOT[ruc.status]}`} />
        {ruc.status === 'vencido' && (
          <span className="absolute inset-0 rounded-full bg-rojo-sunat opacity-55 animate-radar" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[11px] text-muted tracking-wide">{ruc.ruc}</div>
        <div className="font-semibold text-[13.5px] text-ink truncate mt-0.5">{ruc.razonSocial}</div>
        <div className="flex gap-1.5 mt-1.5 flex-wrap">
          {ruc.tags.map((t, i) => (
            <span key={i} className={`text-[9.5px] font-semibold px-[7px] py-[2px] rounded-md ${TAG_TONE[t.tone]}`}>
              {t.label}
            </span>
          ))}
        </div>
      </div>
      <svg className="text-[#C3CEDA] flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  )
}
