import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { SIRE_REPORTS } from '../data/mockData.js'
import ReportTable from '../components/ReportTable.jsx'

const COLUMNS = [
  { key: 'periodo', label: 'Periodo' },
  { key: 'tipo', label: 'Registro' },
  { key: 'comprobante', label: 'Comprobante' },
  { key: 'proveedor', label: 'Proveedor / Cliente' },
  { key: 'monto', label: 'Monto S/', render: (r) => `S/ ${r.monto.toFixed(2)}` },
  { key: 'estado', label: 'Estado' },
]

export default function SireScreen() {
  const { activeRuc, goScreen, pushLog } = useApp()
  const [tipoRegistro, setTipoRegistro] = useState('Compras')
  const [ejecutado, setEjecutado] = useState(false)
  const rows = (SIRE_REPORTS[activeRuc.id] || []).filter((r) => r.tipo === tipoRegistro)

  function ejecutar() {
    pushLog(`SIRE ${tipoRegistro} — ejecutando periodo 2026-06…`)
    setTimeout(() => {
      pushLog(`✓ SIRE ${tipoRegistro} — ${rows.length} comprobante(s) listos para revisar`)
      setEjecutado(true)
    }, 700)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-1.5">
        <button onClick={() => goScreen('modules')} className="w-8 h-8 rounded-[9px] bg-white border border-bordersoft flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="#0B3A60" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="font-display font-bold text-[15px]">SIRE — Compras / Ventas</div>
      </div>
      <div className="text-[11px] text-muted ml-[42px] -mt-1">RUC activo: {activeRuc.razonSocial}</div>

      <div className="px-4 pt-3.5 pb-[130px] space-y-3.5">
        {!ejecutado ? (
          <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-4">
            <div className="mb-3.5">
              <span className="block text-[11px] font-bold mb-1.5">Tipo de registro</span>
              <div className="flex gap-1.5">
                {['Compras', 'Ventas'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTipoRegistro(t)}
                    className={`text-[11.5px] px-3.5 py-2 rounded-lg border ${
                      tipoRegistro === t ? 'bg-azul-inst text-white border-azul-inst' : 'border-bordersoft text-ink'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-3.5">
              <span className="block text-[11px] font-bold mb-1.5">Periodo</span>
              <div className="flex gap-2">
                <select className="flex-1 border border-bordersoft rounded-lg px-2.5 py-2 text-[12px]">
                  <option>2026</option>
                  <option>2025</option>
                </select>
                <select className="flex-1 border border-bordersoft rounded-lg px-2.5 py-2 text-[12px]">
                  <option>Junio</option>
                  <option>Julio</option>
                </select>
              </div>
            </div>
            <button onClick={ejecutar} className="w-full py-3 rounded-xl bg-azul-inst text-white font-semibold text-[12.5px]">
              ⬇ Ver registros
            </button>
          </div>
        ) : (
          <>
            <ReportTable
              columns={COLUMNS}
              rows={rows}
              filenamePrefix={`sire_${tipoRegistro.toLowerCase()}_${activeRuc.ruc}`}
              onDownload={(chosen) => pushLog(`Descargado CSV de SIRE ${tipoRegistro} — ${chosen.length} fila(s)`)}
            />
            <button onClick={() => setEjecutado(false)} className="w-full py-2.5 rounded-xl bg-[#F1F4F8] text-ink font-semibold text-[12px]">
              ← Nueva consulta
            </button>
          </>
        )}
      </div>
    </div>
  )
}
