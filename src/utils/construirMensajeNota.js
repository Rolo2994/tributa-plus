export function construirMensajeNota(ruc, nota) {
  const lineas = []
  lineas.push(`*Recordatorio tributario — ${ruc.razonSocial}*`)
  lineas.push(`RUC: ${ruc.ruc}`)
  lineas.push('')
  ;(nota.tributos || []).forEach((t) => {
    const periodo = t.periodoMes && t.periodoAnio ? ` (periodo ${t.periodoMes} ${t.periodoAnio})` : ''
    lineas.push(`• ${t.nombre}${t.tributoAsociado ? ` · ${t.tributoAsociado}` : ''}${periodo}: S/ ${t.monto} (vence ${t.fecha})`)
  })
  if (nota.observaciones) {
    lineas.push('')
    lineas.push(nota.observaciones)
  }
  return lineas.join('\n')
}