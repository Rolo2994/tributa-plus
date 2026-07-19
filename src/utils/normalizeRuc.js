/**
 * Traduce una fila cruda del Google Sheet (encabezados tal como están
 * escritos en tu Excel) a la forma que usan los componentes de React.
 */
export function normalizeRuc(raw, index) {
  const ruc = String(raw['RUC'] ?? '').trim()
  return {
    id: ruc || `ruc-${index}`,
    ruc,
    razonSocial: String(raw['RAZON SOCIAL'] ?? '').trim(),
    usuario: raw['USUARIO'] ?? '',
    clave: raw['CLAVE'] ?? '',
    grupo: String(raw['GRUPO'] ?? '').trim() || 'Sin grupo',
    orden: raw['ORDEN'] ?? '',
    afpUsuario: raw['USUARIO AFP NET'] ?? '',
    afpClave: raw['CLAVE AFP NET'] ?? '',
    clientIdVcp: raw['CLIENT_ID_VCP'] ?? '',
    clientSecretVcp: raw['CLIENT_SECRET_VCP'] ?? '',
    idSire: raw['ID SIRE'] ?? '',
    claveSire: raw['CLAVE SIRE'] ?? '',
    status: 'ok', // placeholder — luego lo calculamos según el cronograma
    tags: [],     // placeholder — sin datos de vencimiento todavía
  }
}