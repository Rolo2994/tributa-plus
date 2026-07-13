import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { DETRACC_REPORTS } from '../data/mockData.js'
import ReportTable from '../components/ReportTable.jsx'

const COLUMNS = [
  { key: 'fecha', label: 'Fecha' },
  { key: 'numeroConstancia', label: 'N° Constancia' },
  { key: 'tipoBien', label: 'Tipo de bien/servicio' },
  { key: 'cuenta', label: 'Cuenta' },
  { key: 'monto', label: 'Monto S/', render: (r) => `S/ ${r.monto.toFixed(2)}` },
]

/**
 * Consulta de Detracciones — se ejecuta (simulado) y el resultado se
 * queda RENDERIZADO en pantalla dentro de ReportTable. No se
 * descarga nada hasta que el usuario elige filas y toca "Descargar
 * seleccionados".
 */
export default function DetraccScreen() {
  const { activeRuc, goScreen, pushLog } = useApp()
  const [ejecutado, setEjecutado] = useState(false)
  const rows = DETRACC_REPORTS[activeRuc.id] || []

  function ejecutar() {
    pushLog('Consultando pagos de detracciones…')
    setTimeout(() => {
      pushLog(`✓ Consulta completa — ${rows.length} constancia(s) encontradas`)
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
        <div className="font-display font-bold text-[15px]">Consulta de Detracciones</div>
      </div>
      <div className="text-[11px] text-muted ml-[42px] -mt-1">RUC activo: {activeRuc.razonSocial}</div>

      <div className="px-4 pt-3.5 pb-[130px] space-y-3.5">
        {!ejecutado ? (
          <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-4">
            <div className="mb-3.5">
              <span className="block text-[11px] font-bold mb-1.5">Rango de fechas</span>
              <div className="flex gap-2">
                <input type="date" defaultValue="2026-07-01" className="flex-1 border border-bordersoft rounded-lg px-2.5 py-2 text-[12px]" />
                <input type="date" defaultValue="2026-07-11" className="flex-1 border border-bordersoft rounded-lg px-2.5 py-2 text-[12px]" />
              </div>
            </div>
            <div className="mb-3.5">
              <span className="block text-[11px] font-bold mb-1.5">Tipo de cuenta</span>
              <div className="flex gap-1.5 flex-wrap">
                {['Convencional', 'IVAP', 'Ley 30737'].map((t, i) => (
                  <span key={t} className={`text-[11px] px-3 py-2 rounded-lg border ${i === 0 ? 'bg-azul-inst text-white border-azul-inst' : 'border-bordersoft'}`}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <button onClick={ejecutar} className="w-full py-3 rounded-xl bg-azul-inst text-white font-semibold text-[12.5px]">
              ⚡ Ejecutar consulta
            </button>
          </div>
        ) : (
          <>
            <ReportTable columns={COLUMNS} rows={rows} filenamePrefix={`detracciones_${activeRuc.ruc}`} onDownload={(chosen) => pushLog(`Descargado CSV de detracciones — ${chosen.length} fila(s)`)} />
            <button onClick={() => setEjecutado(false)} className="w-full py-2.5 rounded-xl bg-[#F1F4F8] text-ink font-semibold text-[12px]">
              ← Nueva consulta
            </button>
          </>
        )}
      </div>
    </div>
  )
}
