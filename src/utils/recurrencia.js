export const RECURRENCIAS = [
  { id: 'ninguna', label: 'No se repite' },
  { id: 'diaria', label: 'Todos los días' },
  { id: 'semanal', label: 'Toda las semanas (mismo día)' },
  { id: 'mensual', label: 'Todos los meses (mismo día)' },
  { id: 'anual', label: 'Todos los años (misma fecha)' },
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
      return objetivo.getDay() === inicio.getDay()
    case 'mensual':
      return objetivo.getDate() === inicio.getDate()
    case 'anual':
      return objetivo.getDate() === inicio.getDate() && objetivo.getMonth() === inicio.getMonth()
    default:
      return false
  }
}

export function labelRecurrencia(id) {
  return RECURRENCIAS.find((r) => r.id === id)?.label || 'No se repite'
}