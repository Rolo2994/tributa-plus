import React, { useState } from 'react'

/** Reemplaza el <select> nativo (que Android pinta con su propio estilo oscuro) por una hoja propia, con el diseño de la app. */
export default function CustomSelect({ value, onChange, options, placeholder = 'Elegir…', className = '' }) {
  const [open, setOpen] = useState(false)
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  const current = opts.find((o) => o.value === value)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center justify-between text-[12px] border border-bordersoft rounded-lg px-3 py-2 bg-white text-ink ${className}`}
      >
        <span className="truncate">{current ? current.label : placeholder}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 ml-1.5 text-muted">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute inset-0 z-[90] bg-black/50 flex items-end" onClick={() => setOpen(false)}>
          <div className="w-full bg-white rounded-t-2xl max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="w-[38px] h-1 bg-[#DCE3EA] rounded mx-auto mt-2.5 mb-1 flex-shrink-0" />
            <div className="overflow-y-auto px-2 pb-4">
              {opts.map((o) => {
                const selected = o.value === value
                return (
                  <button
                    type="button"
                    key={o.value}
                    onClick={() => { onChange(o.value); setOpen(false) }}
                    className={`w-full flex items-center justify-between text-left px-3.5 py-3 rounded-xl text-[13px] font-medium ${
                      selected ? 'bg-[#EAF1FA] text-azul-inst font-semibold' : 'text-ink'
                    }`}
                  >
                    {o.label}
                    {selected && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke="#0B3A60" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}