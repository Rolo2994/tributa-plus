cat > /home/claude/tributa-plus/src/utils/construirMensajeDashboard.js << 'EOF'
import { formatMoney } from './formatMoney.js'

export function construirMensajeDashboard(empresaLabel, kpis, rows) {
  const lineas = []
  lineas.push(`*Estado de cuenta tributaria — ${empresaLabel}*`)
  lineas.push('')
  lineas.push(`Deuda total actualizada: S/ ${formatMoney(kpis.deudaTotalActualizada)}`)
  lineas.push(`Interés generado: S/ ${formatMoney(kpis.totalInteres)}`)
  lineas.push(`Tributos vencidos: ${kpis.tributosVencidos}`)
  if (kpis.diasMasAntiguo > 0) lineas.push(`Deuda más antigua: ${kpis.diasMasAntiguo} días de atraso`)
  lineas.push('')
  lineas.push('Detalle:')
  rows.forEach((r) => {
    lineas.push(`• ${r.tributo} (${r.mes}/${r.anio}) — S/ ${formatMoney(r.montoActualizado)}${r.diasAtraso > 0 ? ` · ${r.diasAtraso}d atraso` : ''}`)
  })
  return lineas.join('\n')
}
EOF
echo OK