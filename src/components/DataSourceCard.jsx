import React, { useState } from 'react'
import { getConfiguredSheetsUrl, setConfiguredSheetsUrl } from '../services/googleSheetsApi.js'
import { useApp } from '../context/AppContext.jsx'

/**
 * Permite que CADA usuario conecte su propio Google Sheet/Apps Script
 * (Modelo 2: cada quien es dueño de sus datos), sin depender de una
 * única URL fija para todos.
 */
export default function DataSourceCard() {
  const { sincronizarDatos, pushLog } = useApp()
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(getConfiguredSheetsUrl())
  const urlActual = getConfiguredSheetsUrl()

  function guardar() {
    setConfiguredSheetsUrl(valor)
    setEditando(false)
    pushLog('URL de Google Sheets actualizada — sincronizando…')
    sincronizarDatos()
  }

  return (
    <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5 mb-2.5">
      <div className="font-bold text-[12.5px] mb-1">Mi Google Sheets</div>
      <div className="text-[10.5px] text-muted leading-relaxed mb-2.5">
        Conecta tu propio Google Sheet (con tu propio Drive) siguiendo la guía del README — así tus datos son
        completamente tuyos, no compartidos con nadie más.
      </div>

      {!editando ? (
        <>
          <div className="text-[10.5px] font-mono text-ink bg-[#F7F9FB] rounded-lg px-3 py-2 mb-2 truncate">
            {urlActual || 'Usando la URL predeterminada del proyecto'}
          </div>
          <button onClick={() => setEditando(true)} className="w-full py-2.5 rounded-xl border-[1.4px] border-azul-inst text-azul-inst font-semibold text-[11.5px]">
            {urlActual ? 'Cambiar mi URL' : 'Conectar mi propio Sheet'}
          </button>
        </>
      ) : (
        <>
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
            className="w-full text-[11.5px] border border-bordersoft rounded-lg px-3 py-2.5 mb-2 font-mono"
          />
          <div className="flex gap-2">
            <button onClick={() => setEditando(false)} className="flex-1 py-2.5 rounded-xl bg-[#F1F4F8] text-ink font-semibold text-[11.5px]">Cancelar</button>
            <button onClick={guardar} className="flex-1 py-2.5 rounded-xl bg-azul-inst text-white font-semibold text-[11.5px]">Guardar</button>
          </div>
        </>
      )}
    </div>
  )
}