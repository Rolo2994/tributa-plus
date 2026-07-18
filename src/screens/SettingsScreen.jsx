import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { clearBiometric, hasRegisteredCredential } from '../hooks/useWebAuthn.js'

export default function SettingsScreen() {
  const { 
    groupFilter, 
    setGroupFilter, 
    vencimientoTipo, 
    setVencimientoTipo, 
    pushLog, 
    availableGroups 
  } = useApp()
  
  const [pinLockOn, setPinLockOn] = useState(true)
  const [bioOn, setBioOn] = useState(hasRegisteredCredential())

  const TIPOS_VENCIMIENTO = ['SIRE', 'DJ Mensual', 'DJ Anual']

  function toggleBio() {
    if (bioOn) {
      clearBiometric()
      setBioOn(false)
      pushLog('Huella / Face ID desvinculada de este dispositivo.')
    } else {
      setBioOn(true)
      pushLog('Huella / Face ID se registrará la próxima vez que bloquees la app.')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-[130px]">
      <h2 className="font-display font-bold text-[14px] text-ink mb-2.5">Filtros de la lista de RUCs</h2>

      <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5 mb-2.5">
        <div className="font-bold text-[12.5px] mb-0.5">Grupo</div>
        <div className="text-[10.5px] text-muted mb-2.5">Filtra los RUCs visibles en la pantalla principal.</div>
        <div className="flex flex-wrap gap-1.5">
          {availableGroups.map((g) => (
            <button
              key={g}
              onClick={() => {
                setGroupFilter(g)
                pushLog(`Filtro de grupo aplicado: ${g}`)
              }}
              className={`text-[11.5px] font-semibold px-3.5 py-2 rounded-full border ${
                groupFilter === g ? 'bg-azul-inst text-white border-azul-inst' : 'bg-[#F1F4F8] text-ink border-transparent'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5 mb-2.5">
        <div className="font-bold text-[12.5px] mb-0.5">Tipo de vencimiento a mostrar</div>
        <div className="text-[10.5px] text-muted mb-2.5">Cambia qué cronograma se usa en las tarjetas y el resumen de hoy.</div>
        <div className="flex bg-[#F1F4F8] rounded-[11px] p-[3px]">
          {TIPOS_VENCIMIENTO.map((t) => (
            <button
              key={t}
              onClick={() => {
                setVencimientoTipo(t)
                pushLog(`Tipo de vencimiento mostrado: ${t}`)
              }}
              className={`flex-1 text-center py-2 text-[11.5px] font-semibold rounded-[9px] ${
                vencimientoTipo === t ? 'bg-white text-azul-inst shadow' : 'text-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* El resto de tu código de Seguridad y Base de Datos sigue igual */}
      {/* ... */}
    </div>
  )
}