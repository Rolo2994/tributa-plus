import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'

export default function ValidezScreen() {
  const { activeRuc, goScreen, pushLog } = useApp()
  const [archivo, setArchivo] = useState('')

  const tieneCreds = !!activeRuc.clientIdVcp

  function ejecutar() {
    if (!tieneCreds) {
      pushLog(`✗ ${activeRuc.ruc} no tiene CLIENT_ID_VCP/CLIENT_SECRET_VCP configurado.`)
      return
    }
    pushLog('Validando comprobantes vía API SUNAT…')
    setTimeout(() => pushLog('42 comprobante(s) validados — reporte generado'), 900)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-1.5">
        <button onClick={() => goScreen('modules')} className="w-8 h-8 rounded-[9px] bg-white border border-bordersoft flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="#0B3A60" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="font-display font-bold text-[15px]">Validez CP</div>
      </div>
      <div className="text-[11px] text-muted ml-[42px] -mt-1">RUC activo: {activeRuc.razonSocial}</div>

      <div className="px-4 pt-3.5 pb-[130px]">
        <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-4">
          <div className="mb-3.5">
            <span className="block text-[11px] font-bold mb-1.5">Archivo de comprobantes</span>
            <button
              onClick={() => {
                setArchivo('comprobantes_junio.txt')
                pushLog('Archivo seleccionado: comprobantes_junio.txt')
              }}
              className="w-full bg-[#F1F4F8] text-azul-inst font-semibold text-[11.5px] py-2.5 rounded-xl border border-bordersoft"
            >
              📎 {archivo || 'Elegir archivo (.txt / .csv)'}
            </button>
          </div>
          <div className="mb-3.5">
            <span className="block text-[11px] font-bold mb-1.5">Credenciales API</span>
            <p className="text-[10.5px] text-muted leading-relaxed">
              {tieneCreds
                ? 'Se usa el CLIENT_ID / CLIENT_SECRET guardado en la hoja para este RUC. No requiere clave SOL.'
                : 'Este RUC no tiene credenciales de API registradas en la hoja (columnas CLIENT_ID_VCP / CLIENT_SECRET_VCP).'}
            </p>
          </div>
          <button onClick={ejecutar} className="w-full py-3 rounded-xl bg-azul-inst text-white font-semibold text-[12.5px]">
            🔎 Ejecutar validación
          </button>
        </div>
      </div>
    </div>
  )
}
