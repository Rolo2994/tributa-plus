import React, { useState } from 'react'
import { CRONOGRAMA_HOY, CRONOGRAMA_PROX } from '../data/mockData.js'
import { useApp } from '../context/AppContext.jsx'

export default function AlertsScreen() {
  const { pushLog } = useApp()
  const [pushOn, setPushOn] = useState(true)
  const [autoOn, setAutoOn] = useState(false)

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-[130px]">
      <h2 className="font-display font-bold text-[14px] text-ink mb-2.5">Cronograma de hoy</h2>

      <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5 mb-2.5">
        <div className="font-bold text-[12.5px] mb-1">🔴 Vence hoy — {CRONOGRAMA_HOY.fecha}</div>
        <div className="text-[10.5px] text-muted leading-relaxed">
          {CRONOGRAMA_HOY.items.map((i) => `${i.tipo} (dígitos ${i.digitos.join(', ')})`).join(' · ')}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5 mb-2.5">
        <div className="font-bold text-[12.5px] mb-1">🟡 Próximo día hábil — {CRONOGRAMA_PROX.fecha}</div>
        <div className="text-[10.5px] text-muted leading-relaxed">
          {CRONOGRAMA_PROX.items.map((i) => `${i.tipo} (dígitos ${i.digitos.join(', ')})`).join(' · ')}
        </div>
      </div>

      <h2 className="font-display font-bold text-[14px] text-ink mt-5 mb-2.5">Envío de recordatorios</h2>

      <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5 mb-2.5">
        <div className="flex items-center justify-between">
          <div>
            <b className="block text-[12px]">Notificación push al contador</b>
            <span className="text-[10.5px] text-muted">Aviso apenas se detecta un vencimiento.</span>
          </div>
          <button
            onClick={() => setPushOn((v) => !v)}
            className={`relative w-[42px] h-6 rounded-full flex-shrink-0 transition-colors ${pushOn ? 'bg-verde' : 'bg-bordersoft'}`}
          >
            <span
              className={`absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white shadow transition-transform ${
                pushOn ? 'translate-x-[18px]' : ''
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5">
        <div className="flex items-center justify-between">
          <div>
            <b className="block text-[12px]">Envío automático al cliente</b>
            <span className="text-[10.5px] text-muted">
              {autoOn
                ? 'Activado: los recordatorios se envían solos por WhatsApp al detectar un vencimiento.'
                : 'Tú decides cuándo enviar cada recordatorio.'}
            </span>
          </div>
          <button
            onClick={() => {
              setAutoOn((v) => !v)
              pushLog(!autoOn ? 'Envío automático activado' : 'Envío automático desactivado')
            }}
            className={`relative w-[42px] h-6 rounded-full flex-shrink-0 transition-colors ${autoOn ? 'bg-verde' : 'bg-bordersoft'}`}
          >
            <span
              className={`absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white shadow transition-transform ${
                autoOn ? 'translate-x-[18px]' : ''
              }`}
            />
          </button>
        </div>
        {!autoOn && (
          <div className="flex items-center gap-2 mt-2 text-[11.5px] text-muted">
            <span>Enviar todos los días a las</span>
            <input type="time" defaultValue="08:30" className="border border-bordersoft rounded-lg px-2 py-1 text-[12px]" />
          </div>
        )}
      </div>
    </div>
  )
}
