import React, { forwardRef } from 'react'
import { formatMoney } from '../utils/formatMoney.js'

/**
 * Versión "para imagen" del Pre FV621 — mismo patrón que
 * DashboardShareCard: medidas fijas en píxeles, sin animaciones,
 * se renderiza fuera de pantalla y html2canvas la convierte en PNG.
 */
const PreFv621ShareCard = forwardRef(function PreFv621ShareCard({ empresaLabel, periodoLabel, mesAnteriorLabel, casillas, detracciones, resumen, fecha }, ref) {
  const c = casillas || {}
  const fmt = (v) => `S/ ${formatMoney(Number(v) || 0)}`

  const TONO_COLOR = { negativo: '#C8102E', positivo: '#1E8E5A', neutro: '#8A6A00' }

  const retencionesPercepcionesTotal = (Number(c['_percepciones_total']) || 0) + (Number(c['_retenciones_total']) || 0)

  const filas = [
    ['Ventas Netas Gravadas', '100', c['100']],
    ['IGV Ventas', '101', c['101']],
    ['Descuento de ventas (IGV)', '103', c['103']],
    ['Compras — Base gravadas', '107', c['107']],
    ['IGV Compras', '178', c['178']],
    [`Saldo a favor IGV (${mesAnteriorLabel || 'anterior'})`, '145', c['145']],
    ['Retenciones y percepciones IGV', '-', retencionesPercepcionesTotal],
    ['Tributo a pagar IGV', '184', c['184']],
    ['Ingresos Netos (Renta)', '301', c['301']],
    ['Pago a cuenta Renta', '312', c['312']],
  ]

  return (
    <div ref={ref} style={{ width: 420, background: '#ffffff', padding: 24, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#0B3A60', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontFamily: 'Sora, sans-serif' }}>T+</div>
        <div>
          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 15, color: '#152233' }}>Preliminar FV621</div>
          <div style={{ fontSize: 12, color: '#0B3A60', fontWeight: 700 }}>
            {empresaLabel} <span style={{ color: '#C3CEDA', fontWeight: 400 }}>·</span> <span style={{ color: '#1E5FA8' }}>{periodoLabel}</span>
          </div>
          <div style={{ fontSize: 9.5, color: '#9AA7B5', marginTop: 1 }}>{fecha}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {(resumen || []).map((k, i) => (
          <div key={i} style={{ background: '#F7F9FB', borderRadius: 12, padding: 12, border: '1px solid #F0F3F7' }}>
            <div style={{ fontSize: 8.5, color: '#68788A', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3, lineHeight: 1.2 }}>{k.subtitulo}</div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 15, color: TONO_COLOR[k.tono] || '#152233' }}>{fmt(k.valor)}</div>
            {k.titulo === 'Detracción sin confirmar depósito' && (
              <div style={{ fontSize: 7.5, color: '#8A6A00', fontWeight: 700, marginTop: 3 }}>(AFECTO A DETRACCIÓN)</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, color: '#68788A', textTransform: 'uppercase', marginBottom: 6 }}>Detalle de casillas</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5, marginBottom: 12 }}>
        <thead>
          <tr style={{ background: '#0B3A60' }}>
            <th style={{ color: '#fff', textAlign: 'left', padding: '6px 8px' }}>Concepto</th>
            <th style={{ color: '#fff', textAlign: 'left', padding: '6px 8px' }}>Casilla</th>
            <th style={{ color: '#fff', textAlign: 'right', padding: '6px 8px' }}>Monto</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(([desc, num, valor], i) => (
            <tr key={num} style={{ background: i % 2 ? '#FAFBFD' : '#fff' }}>
              <td style={{ padding: '6px 8px', fontWeight: 600, color: '#152233' }}>{desc}</td>
              <td style={{ padding: '6px 8px', color: '#68788A' }}>{num}</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: '#152233' }}>{fmt(valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {detracciones?.n_comprobantes > 0 && (
        <div style={{ background: '#FBF1DD', borderRadius: 10, padding: 10, fontSize: 9.5, color: '#8A6A00', marginBottom: 4 }}>
          {detracciones.n_comprobantes} comprobante(s) con detracción por {fmt(detracciones.igv)} de IGV — verificar depósito en SPOT.
        </div>
      )}

      <div style={{ marginTop: 16, paddingTop: 10, borderTop: '1px solid #F0F3F7', fontSize: 9, color: '#C3CEDA', textAlign: 'center' }}>
        Simulación preliminar — no reemplaza la declaración oficial · Generado con Tributa+
      </div>
    </div>
  )
})

export default PreFv621ShareCard
