/** Formatea un monto con separador de miles y 2 decimales, estilo peruano (1,234.56). */
export function formatMoney(n) {
  return (Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}