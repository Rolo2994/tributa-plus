import React, { useMemo, useState } from 'react'

/**
 * Selector propio (reemplaza el <select> nativo, que Android pinta con
 * su propio estilo oscuro sin relación con el diseño de la app).
 * Incluye buscador automático cuando la lista es larga.
 */
export default function CustomSelect({ value, onChange, options, placeholder = 'Elegir…', title = 'Elegir opción', className = '' }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const opts = useMemo(() => options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)), [options])
  const current = opts.find((o) => o.value === value)

  const filtrados = useMemo(() => {
    if (!search) return opts
    return opts.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
  }, [opts, search])

  function abrir() {
    setSearch('')
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className={`flex items-center justify-between text-[12px] border border-bordersoft rounded-lg px-3 py-2.5 bg-white text-ink ${className}`}
      >
        <span className="truncate font-medium">{current ? current.label : placeholder}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 ml-1.5 text-muted">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute inset-0 z-[90] bg-black/55 flex items-end" onClick={() => setOpen(false)}>
          <div className="w-full bg-white rounded-t-[24px] max-h-[75vh] flex flex-col shadow-[0_-8px_30px_rgba(0,0,0,0.2)]" onClick={(e) => e.stopPropagation()}>
            <div className="w-[38px] h-1 bg-[#DCE3EA] rounded mx-auto mt-2.5 flex-shrink-0" />

            <div className="flex items-center justify-between px-5 pt-3 pb-2 flex-shrink-0">
              <div className="font-display font-bold text-[15px] text-ink">{title}</div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-[#F1F4F8] text-muted flex items-center justify-center text-[14px]">
                ✕
              </button>
            </div>

            {opts.length > 7 && (
              <div className="px-5 pb-2 flex-shrink-0">
                <div className="relative">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                    <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
                    <path d="M20 20l-4.5-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar…"
                    className="w-full text-[13px] border border-bordersoft rounded-xl pl-9 pr-3 py-2.5 bg-[#F7F9FB]"
                  />
                </div>
              </div>
            )}

            <div className="overflow-y-auto px-3 pb-5">
              {filtrados.map((o) => {
                const selected = o.value === value
                return (
                  <button
                    type="button"
                    key={o.value}
                    onClick={() => { onChange(o.value); setOpen(false) }}
                    className={`w-full flex items-center gap-3 text-left px-3.5 py-3.5 rounded-2xl text-[13.5px] mb-0.5 transition-colors ${
                      selected ? 'bg-[#EAF1FA]' : 'active:bg-[#F7F9FB]'
                    }`}
                  >
                    <span className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'border-azul-inst' : 'border-[#D5DEE8]'}`}>
                      {selected && <span className="w-[9px] h-[9px] rounded-full bg-azul-inst" />}
                    </span>
                    <span className={selected ? 'font-semibold text-azul-inst' : 'font-medium text-ink'}>{o.label}</span>
                  </button>
                )
              })}
              {filtrados.length === 0 && (
                <div className="text-center text-muted text-[12.5px] py-8">Sin resultados para "{search}"</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}