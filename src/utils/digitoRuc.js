export const DIGITOS_RUC = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'BC']
export const TIPOS_VENCIMIENTO = ['SIRE', 'DJ Mensual', 'DJ Anual']

/** Misma regla que _parsear_digito_col_i en sunat_launcher.py */
export function obtenerDigitoRuc(ruc) {
  const val = String(ruc?.orden ?? '').trim()
  if (!val || val.toLowerCase() === 'nan') {
    return ruc?.ruc ? ruc.ruc.slice(-1) : '?'
  }
  const asNum = Number(val)
  if (!Number.isNaN(asNum)) return String(Math.trunc(asNum))
  return val.toUpperCase()
}