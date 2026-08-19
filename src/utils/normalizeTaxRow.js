/**
 * Traduce una fila cruda de la hoja "Tax Status" (encabezados tal como
 * están en tu Excel) a la forma que usan los componentes del dashboard.
 */
export function normalizeTaxRow(raw, index) {
  return {
    id: `tax-${index}`,
    codigo: String(raw['CODIGO'] ?? '').trim(),
    ruc: String(raw['RUC'] ?? '').trim(),
    razonSocial: String(raw['RAZON SOCIAL'] ?? '').trim(),
    anio: Number(raw['AÑO'] ?? 0),
    mes: Number(raw['MES'] ?? 0),
    tributo: String(raw['TRIBUTO'] ?? '').trim(),
    importeDeuda: Number(raw['IMPORTE DEUDA'] ?? 0),
    saldoPendiente: Number(raw['SALDO PENDIENTE'] ?? 0),
    estado: String(raw['ESTADO'] ?? '').trim(),
    observaciones: String(raw['OBSERVACIONES'] ?? ''),
  }
}