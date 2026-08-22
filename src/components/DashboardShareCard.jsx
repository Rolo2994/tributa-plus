import React, { forwardRef } from 'react'
import { formatMoney } from '../utils/formatMoney.js'

const MES_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/**
 * Versión "para imagen" del dashboard — se renderiza fuera de pantalla
 * y html2canvas la convierte en PNG para enviar por WhatsApp. Por eso
 * usa medidas fijas en píxeles (no depende del tamaño real de pantalla)
 * y evita animaciones/transparencias que no capturan bien.
 */
const DashboardShareCard = forwardRef(function DashboardShareCard({ empresaLabel, kpis, rows, fecha }, ref) {
  return (
    <div ref={ref} style={{ width: 420, background: '#ffffff', padding: 24, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#0B3A60', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontFamily: 'Sora, sans-serif' }}>T+</div>
        <div>
          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 15, color: '#152233' }}>Estado de cuenta tributaria</div>
          <div style={{ fontSize: 11, color: '#68788A' }}>{empresaLabel} · {fecha}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Deuda actualizada', value: `S/ ${formatMoney(kpis.deudaTotalActualizada)}`, color: '#152233' },
          { label: 'Interés generado', value: `S/ ${formatMoney(kpis.totalInteres)}`, color: '#C8102E' },
          { label: 'Deuda más antigua', value: `${kpis.diasMasAntiguo} días`, color: '#152233' },
          { label: 'Tributos vencidos', value: String(kpis.tributosVencidos), color: '#D9A404' },
        ].map((k) => (
          <div key={k.label} style={{ background: '#F7F9FB', borderRadius: 12, padding: 12, border: '1px solid #F0F3F7' }}>
            <div style={{ fontSize: 9, color: '#68788A', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 17, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, color: '#68788A', textTransform: 'uppercase', marginBottom: 6 }}>Detalle de tributos pendientes</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
        <thead>
          <tr style={{ background: '#0B3A60' }}>
            <th style={{ color: '#fff', textAlign: 'left', padding: '6px 8px' }}>Tributo</th>
            <th style={{ color: '#fff', textAlign: 'left', padding: '6px 8px' }}>Periodo</th>
            <th style={{ color: '#fff', textAlign: 'right', padding: '6px 8px' }}>Actualizado</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 12).map((r, i) => (
            <tr key={r.id} style={{ background: r.diasAtraso > 0 ? '#FCE9EB' : i % 2 ? '#FAFBFD' : '#fff' }}>
              <td style={{ padding: '6px 8px', fontWeight: 600, color: '#152233' }}>{r.tributo}</td>
              <td style={{ padding: '6px 8px', color: '#68788A' }}>{MES_ABBR[r.mes - 1] || r.mes}/{r.anio}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: '#152233' }}>S/ {formatMoney(r.montoActualizado)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 12 && (
        <div style={{ fontSize: 9.5, color: '#68788A', marginTop: 6, textAlign: 'center' }}>+ {rows.length - 12} tributo(s) más — ver detalle completo en Tributa+</div>
      )}

      <div style={{ marginTop: 16, paddingTop: 10, borderTop: '1px solid #F0F3F7', fontSize: 9, color: '#C3CEDA', textAlign: 'center' }}>
        Generado con Tributa+
      </div>
    </div>
  )
})

export default DashboardShareCard