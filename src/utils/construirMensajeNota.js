export function construirMensajeNota(ruc, nota) {
  const lineas = []
  lineas.push(`*Recordatorio tributario — ${ruc.razonSocial}*`)
  lineas.push(`RUC: ${ruc.ruc}`)
  lineas.push('')
  ;(nota.tributos || []).forEach((t) => {
    lineas.push(`• ${t.nombre}: S/ ${t.monto} (vence ${t.fecha})`)
  })
  if (nota.observaciones) {
    lineas.push('')
    lineas.push(nota.observaciones)
  }
  return lineas.join('\n')
}