import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { clearBiometric, hasRegisteredCredential } from '../hooks/useWebAuthn.js'
import PinSetupModal from '../components/PinSetupModal.jsx'
import { tienePinConfigurado } from '../hooks/usePinAuth.js'

export default function SettingsScreen() {
  const { 
    groupFilter, 
    setGroupFilter, 
    vencimientoTipo, 
    setVencimientoTipo, 
    pushLog, 
    availableGroups,
    notifPermission, 
    requestNotifPermission,
    sincronizarDatos, 
    syncing,
  } = useApp()
  
  const [bioOn, setBioOn] = useState(hasRegisteredCredential())
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [pinConfigurado, setPinConfigurado] = useState(tienePinConfigurado())

  const TIPOS_VENCIMIENTO = ['SIRE', 'DJ Mensual', 'DJ Anual']

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-[130px]">
      <h2 className="font-bold text-[14px] mb-2.5">Filtros de la lista de RUCs</h2>

      {/* Bloque de Grupos */}
      <div className="bg-white rounded-2xl p-3.5 mb-2.5 shadow-sm">
        <div className="font-bold text-[12.5px] mb-2">Grupo</div>
        <div className="flex flex-wrap gap-1.5">
          {availableGroups && Array.isArray(availableGroups) ? (
            availableGroups.map((g) => (
              <button 
                key={g} 
                onClick={() => { setGroupFilter(g); pushLog(`Filtro: ${g}`) }}
                className={`text-[11.5px] px-3.5 py-2 rounded-full border ${groupFilter === g ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
              >
                {g}
              </button>
            ))
          ) : (
            <span className="text-xs text-gray-400">Cargando grupos...</span>
          )}
        </div>
      </div>

      {/* Bloque de Vencimiento */}
      <div className="bg-white rounded-2xl p-3.5 mb-2.5 shadow-sm">
        <div className="font-bold text-[12.5px] mb-2">Tipo de vencimiento</div>
        <div className="flex bg-gray-100 rounded-[11px] p-[3px]">
          {TIPOS_VENCIMIENTO.map((t) => (
            <button 
              key={t} 
              onClick={() => { setVencimientoTipo(t); pushLog(`Vencimiento: ${t}`) }}
              className={`flex-1 py-2 text-[11.5px] rounded-[9px] ${vencimientoTipo === t ? 'bg-white shadow' : 'text-gray-500'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Bloque de Seguridad (PIN) */}
      <div className="bg-white rounded-2xl p-3.5 mb-2.5 shadow-sm">
        <div className="font-bold text-[12.5px] mb-1">Seguridad</div>
        <div className="flex items-center justify-between py-2.5 border-t border-[#F1F4F8] mt-1">
          <div>
            <b className="block text-[12px]">{pinConfigurado ? 'Cambiar mi PIN' : 'Configurar mi PIN'}</b>
            <span className="text-[10.5px] text-muted">{pinConfigurado ? 'Ya tienes un PIN configurado' : 'Aún no configuraste un PIN — cualquier código desbloquea'}</span>
          </div>
          <button onClick={() => setPinModalOpen(true)} className="text-[11px] font-semibold text-azul-inst bg-[#EAF1FA] px-3 py-2 rounded-lg flex-shrink-0">
            {pinConfigurado ? 'Cambiar' : 'Configurar'}
          </button>
        </div>
      </div>

      {/* Bloque de Notificaciones */}
      <div className="bg-white rounded-2xl p-3.5 mb-2.5 shadow-sm">
        <div className="font-bold text-[12.5px] mb-1">Notificaciones</div>
        <div className="text-[10.5px] text-muted mb-2.5">
          {notifPermission === 'granted' && '✓ Activadas — recibirás avisos de tus recordatorios.'}
          {notifPermission === 'denied' && 'Bloqueadas por el navegador. Actívalas manualmente en Ajustes del sitio.'}
          {notifPermission === 'default' && 'Aún no activadas.'}
        </div>
        {notifPermission === 'default' && (
          <button
            onClick={requestNotifPermission}
            className="w-full py-2.5 rounded-xl bg-azul-inst text-white font-semibold text-[12px]"
          >
            🔔 Activar notificaciones
          </button>
        )}
      </div>

      {/* Bloque de Sincronización */}
      <div className="bg-white rounded-2xl p-3.5 mb-2.5 shadow-sm">
        <div className="font-bold text-[12.5px] mb-1">Sincronización</div>
        <div className="text-[10.5px] text-muted mb-2.5">
          Trae los datos más recientes de Google Sheets (RUCs, tributos y notas de todos los dispositivos).
        </div>
        <button
          onClick={sincronizarDatos}
          disabled={syncing}
          className="w-full py-2.5 rounded-xl bg-azul-inst text-white font-semibold text-[12px] disabled:opacity-50"
        >
          {syncing ? 'Sincronizando…' : '🔄 Sincronizar ahora'}
        </button>
      </div>

      <PinSetupModal open={pinModalOpen} onClose={() => setPinModalOpen(false)} onSaved={() => setPinConfigurado(true)} />
    </div>
  )
}