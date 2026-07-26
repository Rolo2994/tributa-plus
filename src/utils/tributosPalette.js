const PALETTE = ['#0B3A60', '#C8102E', '#D9A404', '#1E8F5F', '#5A6B80', '#7C3AED', '#0891B2', '#DB2777', '#EA580C', '#4D7C0F']
const GRUPOS_ESPECIALES = ['FRACCIONAMIENTO', 'DETRACCION', 'MULTA']

/**
 * Convierte las filas crudas de la hoja "Tributos" en objetos listos
 * para la app, asignando un color automático por cada Declaración
 * distinta (según el orden en que aparece por primera vez en tu Excel).
 */
export function normalizeTributos(raw) {
  const declOrder = []
  return raw.map((r, i) => {
    const nombre = String(r['TRIBUTO'] ?? '').trim()
    const declaracion = String(r['DECLARACION'] ?? '').trim()
    if (declaracion && !declOrder.includes(declaracion)) declOrder.push(declaracion)
    const color = declaracion ? PALETTE[declOrder.indexOf(declaracion) % PALETTE.length] : '#68788A'
    const esBase = !GRUPOS_ESPECIALES.includes(declaracion.toUpperCase())
    return { id: nombre || `trib-${i}`, nombre, declaracion, color, esBase }
  })
}