export const RECURRENCIAS = [
  { id: 'ninguna', label: 'No se repite' },
  { id: 'diaria', label: 'Todos los días' },
  { id: 'semanal', label: 'Semanalmente (elige los días)' },
  { id: 'mensual', label: 'Todos los meses (mismo día)' },
  { id: 'anual', label: 'Todos los años (misma fecha)' },
]

// dow = día de la semana según Date.getDay(): 0=domingo, 1=lunes, ... 6=sábado
export const DIAS_SEMANA = [
  { dow: 1, label: 'L' },
  { dow: 2, label: 'M' },
  { dow: 3, label: 'M' },
  { dow: 4, label: 'J' },
  { dow: 5, label: 'V' },
  { dow: 6, label: 'S' },
  { dow: 0, label: 'D' },
]

/** ¿Este recordatorio "suena" en la fecha dada (yyyy-MM-dd)? */
export function ocurreEnFecha(item, fechaISO) {
  if (!item.fecha) return false
  if (!item.recurrencia || item.recurrencia === 'ninguna') return item.fecha === fechaISO

  const inicio = new Date(item.fecha + 'T00:00:00')
  const objetivo = new Date(fechaISO + 'T00:00:00')
  if (objetivo < inicio) return false

  switch (item.recurrencia) {
    case 'diaria':
      return true
    case 'semanal':
      if (Array.isArray(item.diasSemana) && item.diasSemana.length > 0) {
        return item.diasSemana.includes(objetivo.getDay())
      }
      return objetivo.getDay() === inicio.getDay()
    case 'mensual':
      return objetivo.getDate() === inicio.getDate()
    case 'anual':
      return objetivo.getDate() === inicio.getDate() && objetivo.getMonth() === inicio.getMonth()
    default:
      return false
  }
}

export function labelRecurrencia(item) {
  const base = RECURRENCIAS.find((r) => r.id === item?.recurrencia)?.label
  if (item?.recurrencia === 'semanal' && Array.isArray(item.diasSemana) && item.diasSemana.length > 0) {
    const nombres = item.diasSemana
      .slice()
      .sort((a, b) => a - b)
      .map((dow) => DIAS_SEMANA.find((d) => d.dow === dow)?.label || '')
    return `Semanal: ${nombres.join(' ')}`
  }
  return base || 'No se repite'
}