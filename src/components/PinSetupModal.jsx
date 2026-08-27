import React, { useState } from 'react'
import { configurarPin } from '../hooks/usePinAuth.js'

export default function PinSetupModal({ open, onClose, onSaved }) {
  const [paso, setPaso] = useState('nuevo') // 'nuevo' | 'confirmar'
  const [pin1, setPin1] = useState('')
  const [pin2, setPin2] = useState('')
  const [error, setError] = useState('')

  function reset() {
    setPaso('nuevo'); setPin1(''); setPin2(''); setError('')
  }
  function cerrar() {
    reset(); onClose()
  }

  function presionar(n) {
    setError('')
    if (paso === 'nuevo') {
      if (pin1.length >= 4) return
      const next = pin1 + n
      setPin1(next)
      if (next.length === 4) setTimeout(() => setPaso('confirmar'), 150)
    } else {
      if (pin2.length >= 4) return
      const next = pin2 + n
      setPin2(next)
      if (next.length === 4) {
        setTimeout(async () => {
          if (next === pin1) {
            try {
              await configurarPin(next)
              onSaved && onSaved()
              cerrar()
            } catch (err) {
              setError('Error al guardar el PIN. Intenta de nuevo.')
              setPin1(''); setPin2(''); setPaso('nuevo')
            }
          } else {
            setError('Los PIN no coinciden. Intenta de nuevo.')
            setPin1(''); setPin2(''); setPaso('nuevo')
          }
        }, 150)
      }
    }
  }

  if (!open) return null
  const pinActual = paso === 'nuevo' ? pin1 : pin2

  return (
    <div className="absolute inset-0 z-[95] bg-black/60 flex items-end md:items-center md:justify-center" onClick={cerrar}>
      <div className="w-full md:max-w-[320px] bg-white rounded-t-[24px] md:rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="w-[38px] h-1 bg-[#DCE3EA] rounded mx-auto mb-4 md:hidden" />
        <div className="text-center mb-6">
          <div className="font-display font-bold text-[15px] text-ink">{paso === 'nuevo' ? 'Crea tu nuevo PIN' : 'Confirma tu PIN'}</div>
          <div className="text-[11.5px] text-muted mt-1">{paso === 'nuevo' ? 'Elige un código de 4 dígitos' : 'Ingresa el mismo código otra vez'}</div>
        </div>
        <div className="flex gap-3.5 mb-8 justify-center">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`w-[13px] h-[13px] rounded-full border-[1.6px] transition-all ${i < pinActual.length ? 'bg-azul-inst border-azul-inst' : 'border-[#C3CEDA]'}`} />
          ))}
        </div>
        {error && <div className="text-center text-[11px] text-rojo-sunat mb-4">{error}</div>}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[240px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button key={n} onClick={() => presionar(String(n))} className="aspect-square rounded-full bg-[#F1F4F8] text-ink font-display text-[16px] font-semibold active:bg-[#E2E8F0]">
              {n}
            </button>
          ))}
          <div />
          <button onClick={() => presionar('0')} className="aspect-square rounded-full bg-[#F1F4F8] text-ink font-display text-[16px] font-semibold active:bg-[#E2E8F0]">0</button>
          <button
            onClick={() => (paso === 'nuevo' ? setPin1((p) => p.slice(0, -1)) : setPin2((p) => p.slice(0, -1)))}
            className="aspect-square rounded-full bg-[#F1F4F8] text-ink text-[16px] active:bg-[#E2E8F0]"
          >
            ⌫
          </button>
        </div>
        <button onClick={cerrar} className="w-full mt-6 py-3 rounded-xl bg-[#F1F4F8] text-ink font-semibold text-[12.5px]">Cancelar</button>
      </div>
    </div>
  )
}