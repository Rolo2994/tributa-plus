import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { CONTACTOS } from '../data/mockData.js'

/** Selector de contacto para reenviar notificaciones del Buzón por WhatsApp. */
export default function ContactPicker({ onSend }) {
  const { contactPickerOpen, setContactPickerOpen, pendingSendCount } = useApp()
  const [search, setSearch] = useState('')

  const filtered = CONTACTOS.filter((c) => c.nombre.toLowerCase().includes(search.toLowerCase()))

  function close() {
    setContactPickerOpen(false)
  }

  function pick(nombre) {
    close()
    onSend && onSend(nombre)
  }

  return (
    <>
      <div
        onClick={close}
        className={`absolute inset-0 z-50 bg-[#071422]/50 transition-opacity duration-200 ${
          contactPickerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />
      <div
        className={`absolute left-0 right-0 bottom-0 z-[51] max-h-[70%] flex flex-col bg-white rounded-t-2xl transition-transform duration-300 ${
          contactPickerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="w-[38px] h-1 bg-[#DCE3EA] rounded mx-auto mt-2.5 mb-1" />
        <div className="flex items-start justify-between px-5 pb-3.5 pt-1.5 border-b border-bordersoft">
          <div>
            <div className="font-semibold text-[14px] text-ink">Enviar a…</div>
            <div className="font-mono text-[11px] text-muted">{pendingSendCount} PDF seleccionados</div>
          </div>
          <button onClick={close} className="w-[30px] h-[30px] rounded-full bg-[#F1F4F8] text-muted flex items-center justify-center">
            ✕
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contacto…"
            className="w-full mb-3 rounded-[10px] border border-bordersoft px-3 py-2.5 text-[12px]"
          />
          {filtered.map((c) => (
            <div key={c.id} onClick={() => pick(c.nombre)} className="flex items-center gap-2.5 py-2.5 border-b border-[#F4F6F9] cursor-pointer">
              <div className="w-9 h-9 rounded-full bg-[#DCE9FA] text-azul-inst flex items-center justify-center font-bold text-[12px] flex-shrink-0">
                {c.iniciales}
              </div>
              <div>
                <div className="text-[12.5px] font-semibold">{c.nombre}</div>
                <div className="text-[10px] text-muted">{c.sub}</div>
              </div>
            </div>
          ))}
          <div onClick={() => pick('Nuevo contacto')} className="flex items-center gap-2.5 py-2.5 cursor-pointer text-azul-inst font-semibold">
            <div className="w-9 h-9 rounded-full bg-[#EAF1FA] flex items-center justify-center flex-shrink-0">＋</div>
            <div className="text-[12.5px]">Elegir otro contacto del celular</div>
          </div>
        </div>
      </div>
    </>
  )
}
