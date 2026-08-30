import React, { useState } from 'react'
import PinSetupModal from './PinSetupModal.jsx'
import { tienePinConfigurado } from '../hooks/usePinAuth.js'

/**
 * Tarjeta autosuficiente de "Seguridad — PIN". Se importa y se coloca
 * en Ajustes con una sola línea — no requiere tocar el resto del
 * archivo, para no arriesgar los otros bloques que ya funcionan.
 */
export default function PinSecurityCard() {
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [pinConfigurado, setPinConfigurado] = useState(tienePinConfigurado())

  return (
    <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5 mb-2.5">
      <div className="flex items-center justify-between">
        <div>
          <b className="block text-[12px]">{pinConfigurado ? 'Cambiar mi PIN' : 'Configurar mi PIN'}</b>
          <span className="text-[10.5px] text-muted">
            {pinConfigurado ? 'Ya tienes un PIN configurado en este dispositivo' : 'Aún no configuraste un PIN — cualquier código de 4 dígitos desbloquea'}
          </span>
        </div>
        <button onClick={() => setPinModalOpen(true)} className="text-[11px] font-semibold text-azul-inst bg-[#EAF1FA] px-3 py-2 rounded-lg flex-shrink-0">
          {pinConfigurado ? 'Cambiar' : 'Configurar'}
        </button>
      </div>
      <PinSetupModal open={pinModalOpen} onClose={() => setPinModalOpen(false)} onSaved={() => setPinConfigurado(true)} />
    </div>
  )
}