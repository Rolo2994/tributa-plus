export function construirMensajeDashboard(empresaLabel, kpis, rows) {
  const lineas = []
  lineas.push(`*Estado de cuenta tributaria — ${empresaLabel}*`)
  lineas.push('')
  lineas.push(`Deuda total actualizada: S/ ${kpis.deudaTotalActualizada.toFixed(2)}`)
  lineas.push(`Interés generado: S/ ${kpis.totalInteres.toFixed(2)}`)
  lineas.push(`Tributos vencidos: ${kpis.tributosVencidos}`)
  if (kpis.diasMasAntiguo > 0) lineas.push(`Deuda más antigua: ${kpis.diasMasAntiguo} días de atraso`)
  lineas.push('')
  lineas.push('Detalle:')
  rows.forEach((r) => {
    lineas.push(`• ${r.tributo} (${r.mes}/${r.anio}) — S/ ${r.montoActualizado.toFixed(2)}${r.diasAtraso > 0 ? ` · ${r.diasAtraso}d atraso` : ''}`)
  })
  return lineas.join('\n')
}