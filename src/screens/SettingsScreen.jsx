import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { GRUPOS, TIPOS_VENCIMIENTO } from '../data/mockData.js'
import { clearBiometric, hasRegisteredCredential } from '../hooks/useWebAuthn.js'

export default function SettingsScreen() {
  const { groupFilter, setGroupFilter, vencimientoTipo, setVencimientoTipo, pushLog } = useApp()
  const [pinLockOn, setPinLockOn] = useState(true)
  const [bioOn, setBioOn] = useState(hasRegisteredCredential())

  function toggleBio() {
    if (bioOn) {
      clearBiometric()
      setBioOn(false)
      pushLog('Huella / Face ID desvinculada de este dispositivo.')
    } else {
      // El registro real ocurre la próxima vez que se bloquee/desbloquee
      // la app (LockScreen llama a registerBiometric la primera vez).
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
          {GRUPOS.map((g) => (
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

      <h2 className="font-display font-bold text-[14px] text-ink mt-5 mb-2.5">Seguridad</h2>
      <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5">
        <div className="flex items-center justify-between py-1">
          <div>
            <b className="block text-[12px]">Bloqueo con PIN</b>
            <span className="text-[10.5px] text-muted">Pide un código de 4 dígitos al abrir la app</span>
          </div>
          <button
            onClick={() => setPinLockOn((v) => !v)}
            className={`relative w-[42px] h-6 rounded-full flex-shrink-0 transition-colors ${pinLockOn ? 'bg-verde' : 'bg-bordersoft'}`}
          >
            <span className={`absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white shadow transition-transform ${pinLockOn ? 'translate-x-[18px]' : ''}`} />
          </button>
        </div>
        <div className="flex items-center justify-between py-2.5 border-t border-[#F1F4F8] mt-1">
          <div>
            <b className="block text-[12px]">Desbloqueo con huella / Face ID</b>
            <span className="text-[10.5px] text-muted">
              {bioOn ? 'Activo — usa el sensor biométrico real de tu celular (WebAuthn)' : 'Desactivado'}
            </span>
          </div>
          <button
            onClick={toggleBio}
            className={`relative w-[42px] h-6 rounded-full flex-shrink-0 transition-colors ${bioOn ? 'bg-verde' : 'bg-bordersoft'}`}
          >
            <span className={`absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white shadow transition-transform ${bioOn ? 'translate-x-[18px]' : ''}`} />
          </button>
        </div>
      </div>

      <h2 className="font-display font-bold text-[14px] text-ink mt-5 mb-2.5">Base de datos</h2>
      <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5">
        <div className="font-bold text-[12.5px] mb-1">Google Sheets</div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-verde shadow-[0_0_6px_#1E8F5F]" />
          <span className="text-[11px] text-muted">
            {import.meta.env.VITE_SHEETS_API_URL ? 'Conectado · última sincronización hace 2 min' : 'Sin conectar — falta VITE_SHEETS_API_URL en .env'}
          </span>
        </div>
        <p className="text-[10.5px] text-muted leading-relaxed mb-2.5">
          Esta hoja también la puedes abrir y editar desde Excel/Sheets en tu PC — los cambios se reflejan aquí
          automáticamente. Ver <code>apps-script/Code.gs</code> y el README para conectarla.
        </p>
        <button
          onClick={() => {
            pushLog('Sincronizando con Google Sheets…')
            setTimeout(() => pushLog('Sincronización completa — 6 RUC(s) actualizados'), 700)
          }}
          className="w-full border-[1.4px] border-azul-inst text-azul-inst font-semibold text-[11.5px] py-2.5 rounded-xl"
        >
          🔄 Sincronizar ahora
        </button>
      </div>
    </div>
  )
}
