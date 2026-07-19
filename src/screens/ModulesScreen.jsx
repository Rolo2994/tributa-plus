import React from 'react'
import { useApp } from '../context/AppContext.jsx'
import { PAGINAS_LOGIN, PAGINAS_DIRECTAS } from '../data/mockData.js'

const DOT = { ok: 'bg-verde', prox: 'bg-ambar', vencido: 'bg-rojo-sunat' }

const ACCIONES = [
  { id: 'buzon', title: 'Buzón PDF', desc: 'Ver notificaciones y reenviar por WhatsApp' },
  { id: 'validez', title: 'Validez CP', desc: 'Validar comprobantes de pago vía API' },
  { id: 'detracc', title: 'Detracciones', desc: 'Consulta de pago SPOT' },
  { id: 'sire', title: 'SIRE', desc: 'Ver / descargar registros compras y ventas' },
]

export default function ModulesScreen() {
  const { activeRuc, setDrawerOpen, goScreen, pushLog } = useApp()
    if (!activeRuc) {
      return <div className="flex-1 flex items-center justify-center text-muted text-[12px]">Sincronizando…</div>
    }

  function autoLogin(pagina) {
    pushLog(`Iniciando sesión — ${activeRuc.razonSocial} → ${pagina}`)
    pushLog('Usuario y clave leídos de Google Sheets…')
    setTimeout(() => pushLog(`✓ Sesión abierta en ${pagina}`), 800)
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-3.5 pb-[130px]">
      <div onClick={() => setDrawerOpen(true)} className="flex items-center gap-2.5 bg-white rounded-xl border border-bordersoft px-3 py-2.5 cursor-pointer mb-1">
        <span className={`w-3 h-3 rounded-full ${DOT[activeRuc.status]}`} />
        <div>
          <div className="text-[9.5px] text-muted uppercase tracking-wide">RUC activo para acciones</div>
          <div className="text-[12.5px] font-bold text-ink">
            {activeRuc.razonSocial} · {activeRuc.ruc}
          </div>
        </div>
        <svg className="ml-auto text-[#C3CEDA]" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <div className="text-[11px] font-bold text-muted uppercase tracking-wide mt-4 mb-2">Accesos con login automático</div>
      {PAGINAS_LOGIN.map((p) => (
        <div key={p.id} onClick={() => autoLogin(p.nombre)} className="flex items-center gap-3 bg-white rounded-2xl border border-[#F0F3F7] shadow-card px-3.5 py-3.5 mb-2 cursor-pointer">
          <div className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0 ${p.afp ? 'bg-[#E6F5EC] text-verde' : 'bg-[#EAF1FA] text-azul-inst'}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <path d="M8 9h8M8 13h5" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-[13px]">{p.nombre}</div>
            <div className="text-[10.5px] text-muted mt-0.5">{p.desc}</div>
          </div>
          <svg className="ml-auto text-[#C3CEDA] flex-shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      ))}

      <div className="text-[11px] font-bold text-muted uppercase tracking-wide mt-4 mb-2">Acciones</div>
      <div className="grid grid-cols-2 gap-2.5">
        {ACCIONES.map((a) => (
          <div key={a.id} onClick={() => goScreen(a.id)} className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5 cursor-pointer">
            <div className="w-[34px] h-[34px] rounded-[9px] bg-azul-dark text-white flex items-center justify-center mb-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
            </div>
            <div className="font-bold text-[12px]">{a.title}</div>
            <div className="text-[10px] text-muted mt-0.5 leading-tight">{a.desc}</div>
          </div>
        ))}
      </div>

      <div className="text-[11px] font-bold text-muted uppercase tracking-wide mt-4 mb-2">Accesos directos</div>
      <div className="grid grid-cols-2 gap-2">
        {PAGINAS_DIRECTAS.map((d) => (
          <div
            key={d.id}
            onClick={() => pushLog(`Abriendo ${d.nombre}…`)}
            className="bg-[#F1F4F8] text-azul-inst font-semibold text-[11.5px] px-2 py-2.5 rounded-xl text-center border border-bordersoft cursor-pointer"
          >
            {d.nombre}
          </div>
        ))}
      </div>
    </div>
  )
}
