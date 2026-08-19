export const TASA_SUNAT_MENSUAL = 0.009 // 0.9% mensual
export const TASA_AFP_MENSUAL = 0.014 // 1.4% mensual

// Los únicos códigos de AFP en la hoja "Tax Status" son textos (no numéricos).
const CODIGOS_AFP = ['INTEGRA', 'PROFUTURO', 'HABITAT', 'PRIMA']

export function esCodigoAfp(codigo) {
  return CODIGOS_AFP.includes(String(codigo).toUpperCase().trim())
}

function toUTC(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** Días de atraso: empieza a contar desde el día SIGUIENTE al vencimiento. */
export function diasDeAtraso(fechaVencISO, hoyISO) {
  if (!fechaVencISO) return 0
  const diff = Math.floor((toUTC(hoyISO) - toUTC(fechaVencISO)) / 86400000)
  return diff > 0 ? diff : 0
}

/**
 * Interés = monto × (tasa mensual ÷ 30) × días de atraso.
 * SUNAT: se redondea al entero más cercano (0.5 sube, 0.49 baja — igual
 * que Math.round en números positivos).
 * AFP: no se redondea, se deja con decimales.
 */
export function calcularInteres(monto, dias, esAfp) {
  if (dias <= 0 || !monto) return 0
  const tasaMensual = esAfp ? TASA_AFP_MENSUAL : TASA_SUNAT_MENSUAL
  const tasaDiaria = tasaMensual / 30
  const bruto = monto * tasaDiaria * dias
  return esAfp ? bruto : Math.round(bruto)
}