/**
 * mockData.js
 * ─────────────────────────────────────────────────────────────
 * Datos simulados para que la app sea 100% interactiva antes de
 * conectarse a Google Sheets. La forma de cada objeto está pensada
 * para calzar 1:1 con las columnas de ruc_lista.xlsx (ver README y
 * apps-script/Code.gs), así que cuando reemplaces esto por la API
 * real, los componentes no deberían necesitar cambios.
 *
 * Hoja principal (ruc_lista.xlsx):
 *   A=RUC  B=RAZON SOCIAL  C=USUARIO  D=CLAVE  E=Grupo
 *   F=fecha SIRE  G=fecha DJ Mensual  H=fecha DJ Anual  I=Orden (dígito)
 * ─────────────────────────────────────────────────────────────
 */

export const GRUPOS = ['Todos', 'Rolando Asesor', 'Enlace Consulting', 'Alquiler']

export const TIPOS_VENCIMIENTO = ['SIRE', 'DJ Mensual', 'DJ Anual']

export const RUCS = [
  {
    id: '20601234561',
    ruc: '20601234561',
    razonSocial: 'Comercial Andina del Sur S.A.C.',
    grupo: 'Rolando Asesor',
    status: 'vencido', // 'ok' | 'prox' | 'vencido'
    usuario: 'CANDINA01',
    clave: '••••••••', // nunca se muestra en claro salvo que el usuario toque "ver"
    afpUsuario: 'AFP-CANDINA',
    afpClave: '••••••••',
    clientIdVcp: 'vcp-client-8841',
    clientSecretVcp: '••••••••',
    tags: [
      { label: 'IGV vencido', tone: 'urgent' },
      { label: 'Renta 15/07', tone: 'warn' },
    ],
  },
  {
    id: '20512309887',
    ruc: '20512309887',
    razonSocial: "Inversiones Q'ente E.I.R.L.",
    grupo: 'Enlace Consulting',
    status: 'prox',
    usuario: 'QENTE02',
    clave: '••••••••',
    afpUsuario: '',
    afpClave: '',
    clientIdVcp: 'vcp-client-2210',
    clientSecretVcp: '••••••••',
    tags: [{ label: 'PLAME 14/07', tone: 'warn' }],
  },
  {
    id: '20495583321',
    ruc: '20495583321',
    razonSocial: 'Textiles Miraflores S.A.',
    grupo: 'Alquiler',
    status: 'ok',
    usuario: 'TEXMIRA',
    clave: '••••••••',
    afpUsuario: 'AFP-TEXMIRA',
    afpClave: '••••••••',
    clientIdVcp: 'vcp-client-5567',
    clientSecretVcp: '••••••••',
    tags: [{ label: 'Al día', tone: 'neutral' }],
  },
  {
    id: '20387712209',
    ruc: '20387712209',
    razonSocial: 'Distribuidora Norte Perú S.R.L.',
    grupo: 'Rolando Asesor',
    status: 'ok',
    usuario: 'DISTNORTE',
    clave: '••••••••',
    afpUsuario: '',
    afpClave: '',
    clientIdVcp: '',
    clientSecretVcp: '',
    tags: [{ label: 'Al día', tone: 'neutral' }],
  },
  {
    id: '20604411278',
    ruc: '20604411278',
    razonSocial: 'Grupo Ferretero Arequipa S.A.C.',
    grupo: 'Enlace Consulting',
    status: 'vencido',
    usuario: 'FERREAQP',
    clave: '••••••••',
    afpUsuario: 'AFP-FERREAQP',
    afpClave: '••••••••',
    clientIdVcp: 'vcp-client-9034',
    clientSecretVcp: '••••••••',
    tags: [{ label: 'ESSALUD vencido', tone: 'urgent' }],
  },
  {
    id: '20455290043',
    ruc: '20455290043',
    razonSocial: 'Panificadora San Blas S.A.C.',
    grupo: 'Alquiler',
    status: 'prox',
    usuario: 'PANSANBLAS',
    clave: '••••••••',
    afpUsuario: '',
    afpClave: '',
    clientIdVcp: '',
    clientSecretVcp: '',
    tags: [{ label: 'ONP 14/07', tone: 'warn' }],
  },
]

// Colores por tipo de tributo — coherentes con el prototipo HTML
export const TRIBUTO_COLORS = {
  IGV: '#0B3A60',
  Renta: '#C8102E',
  ONP: '#D9A404',
  EsSalud: '#1E8F5F',
  PLAME: '#5A6B80',
  Detracción: '#0B3A60',
  Multa: '#C8102E',
  Fraccionamiento: '#D9A404',
  Otro: '#68788A',
}

// Notas / tributos por RUC — esto es lo que useLocalStorage persiste
// localmente en el navegador antes de sincronizar con Sheets.
export const NOTAS_INICIALES = {
  '20601234561': {
    observaciones:
      'Cliente solicitó reprogramar el pago de renta. Confirmar con gerencia antes del viernes.',
    tributos: [
      { id: 't1', nombre: 'IGV', monto: 2340, fecha: '2026-07-11' },
      { id: 't2', nombre: 'Renta', monto: 890, fecha: '2026-07-15' },
      { id: 't3', nombre: 'ONP', monto: 410, fecha: '2026-07-14' },
      { id: 't4', nombre: 'EsSalud', monto: 380, fecha: '2026-07-14' },
    ],
  },
  '20512309887': {
    observaciones: '',
    tributos: [{ id: 't1', nombre: 'PLAME', monto: 520, fecha: '2026-07-14' }],
  },
  '20495583321': { observaciones: '', tributos: [] },
  '20387712209': { observaciones: '', tributos: [] },
  '20604411278': {
    observaciones: 'Pendiente confirmar cuenta de detracciones actualizada.',
    tributos: [{ id: 't1', nombre: 'EsSalud', monto: 610, fecha: '2026-07-11' }],
  },
  '20455290043': {
    observaciones: '',
    tributos: [{ id: 't1', nombre: 'ONP', monto: 295, fecha: '2026-07-14' }],
  },
}

// Notificaciones del Buzón SUNAT (ya descargadas por el proceso de
// escritorio — la app móvil solo las visualiza y las reenvía, nunca
// vuelve a ejecutar el scraping).
export const NOTIFICACIONES = {
  '20601234561': [
    {
      id: 'n1',
      asunto: 'Comunicación — Inconsistencia en declaración IGV Junio 2026',
      fecha: '11/07/2026',
      hora: '09:14',
      tieneAdjunto: true,
    },
    {
      id: 'n2',
      asunto: 'Esquela de citación — Fiscalización parcial electrónica',
      fecha: '10/07/2026',
      hora: '16:40',
      tieneAdjunto: true,
    },
    {
      id: 'n3',
      asunto: 'Resolución de intendencia — Aplazamiento y/o fraccionamiento',
      fecha: '08/07/2026',
      hora: '11:02',
      tieneAdjunto: true,
    },
    {
      id: 'n4',
      asunto: 'Constancia de presentación — PDT 621 periodo 06-2026',
      fecha: '05/07/2026',
      hora: '08:21',
      tieneAdjunto: true,
    },
  ],
  '20512309887': [
    {
      id: 'n5',
      asunto: 'Constancia de presentación — PLAME periodo 06-2026',
      fecha: '09/07/2026',
      hora: '10:02',
      tieneAdjunto: true,
    },
  ],
  '20604411278': [
    {
      id: 'n6',
      asunto: 'Comunicación — EsSalud pendiente de pago',
      fecha: '11/07/2026',
      hora: '07:55',
      tieneAdjunto: true,
    },
  ],
}

// Reportes SIRE simulados — cada fila representa un comprobante
export const SIRE_REPORTS = {
  '20601234561': [
    { id: 's1', periodo: '2026-06', tipo: 'Compras', comprobante: 'F001-00234', proveedor: 'Distribuidora ABC S.A.C.', monto: 1180.5, estado: 'Aceptado' },
    { id: 's2', periodo: '2026-06', tipo: 'Compras', comprobante: 'F002-00987', proveedor: 'Ferretería Central E.I.R.L.', monto: 430.0, estado: 'Aceptado' },
    { id: 's3', periodo: '2026-06', tipo: 'Compras', comprobante: 'B001-01023', proveedor: 'Transportes Rápido S.A.', monto: 210.75, estado: 'Observado' },
    { id: 's4', periodo: '2026-06', tipo: 'Ventas', comprobante: 'F010-00456', proveedor: 'Cliente Retail Norte S.A.C.', monto: 3450.0, estado: 'Aceptado' },
  ],
  '20495583321': [
    { id: 's5', periodo: '2026-06', tipo: 'Ventas', comprobante: 'F005-00112', proveedor: 'Boutique Andina S.A.C.', monto: 980.0, estado: 'Aceptado' },
  ],
}

// Reportes de Consulta de Detracciones simulados
export const DETRACC_REPORTS = {
  '20601234561': [
    { id: 'd1', fecha: '2026-07-02', numeroConstancia: '05-2026-1234567', tipoBien: 'Servicios generales', monto: 96.0, cuenta: 'Convencional' },
    { id: 'd2', fecha: '2026-06-25', numeroConstancia: '05-2026-1198342', tipoBien: 'Transporte de carga', monto: 62.4, cuenta: 'Convencional' },
  ],
  '20604411278': [
    { id: 'd3', fecha: '2026-07-01', numeroConstancia: '05-2026-1240981', tipoBien: 'Materiales de construcción', monto: 154.2, cuenta: 'Convencional' },
  ],
}

// Cronograma de vencimientos (resumen para la pantalla de Alertas)
export const CRONOGRAMA_HOY = {
  fecha: '11/07',
  items: [
    { tipo: 'IGV', digitos: ['1', '8'] },
    { tipo: 'ESSALUD', digitos: ['1'] },
  ],
}
export const CRONOGRAMA_PROX = {
  fecha: '14/07',
  items: [
    { tipo: 'PLAME', digitos: ['3', '7'] },
    { tipo: 'ONP', digitos: ['0'] },
  ],
}

// Contactos para el flujo de "elegir a quién enviar" (Buzón PDF)
export const CONTACTOS = [
  { id: 'c1', nombre: 'Contabilidad — Comercial Andina', sub: '+51 987 654 321', iniciales: 'CA' },
  { id: 'c2', nombre: 'Gerencia — Comercial Andina', sub: '+51 912 345 678', iniciales: 'GA' },
  { id: 'c3', nombre: 'Rolando Asesor (grupo)', sub: 'Grupo de WhatsApp', iniciales: 'RA' },
]

// Accesos con login automático (RUC/usuario/clave según el RUC activo)
export const PAGINAS_LOGIN = [
  { id: 'tramites', nombre: 'Trámites y Consultas', desc: 'Usa USUARIO y CLAVE guardados del RUC activo' },
  { id: 'declaracion', nombre: 'Declaración y Pago', desc: 'PDT, formularios virtuales, pagos' },
  { id: 'anual', nombre: 'Declaración Anual', desc: 'Renta anual — e-Renta' },
  { id: 'afpnet', nombre: 'AFPnet — Empleador', desc: 'Usuario/clave AFP distintos al SOL', afp: true },
]

// Accesos directos (sin login)
export const PAGINAS_DIRECTAS = [
  { id: 'tc', nombre: 'Tipo de Cambio' },
  { id: 'ruc', nombre: 'Consulta RUC' },
  { id: 'bn', nombre: 'Banco de la Nación' },
  { id: 'mpv', nombre: 'Mesa de Partes' },
]
