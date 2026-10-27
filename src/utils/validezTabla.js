// Reglas y utilidades de la tabla de Validez CP.
// Reglas oficiales: "Manual de Consulta Integrada de Comprobante de Pago por Servicio Web" (SUNAT, v2.0)
//   numRuc: 11 dígitos | codComp: 01,03,04,07,08,R1,R7 | numeroSerie: 4 alfanuméricos
//   numero: entero de hasta 8 dígitos | fechaEmision: dd/mm/aaaa | monto: n(8,2), obligatorio solo en electrónicos

export const MAX_FILAS_TABLA = 1000
export const FILAS_INICIALES = 12
export const TIPOS_VALIDOS = ['01', '03', '04', '07', '08', 'R1', 'R7']
export const TIPOS_TEXTO = '01, 03, 04, 07, 08, R1 o R7'

export const COLUMNAS = [
  { campo: 'ruc_emisor', titulo: 'RUC emisor' },
  { campo: 'tipo', titulo: 'Tipo' },
  { campo: 'serie', titulo: 'Serie' },
  { campo: 'numero', titulo: 'Número' },
  { campo: 'fecha', titulo: 'Fecha' },
  { campo: 'monto', titulo: 'Monto' },
]
export const CAMPOS = COLUMNAS.map((c) => c.campo)

// ── Filas ───────────────────────────────────────────────────────────
export function crearFilaVacia() {
  return { ruc_emisor: '', tipo: '', serie: '', numero: '', fecha: '', monto: '' }
}
export function crearFilasVacias(n = FILAS_INICIALES) {
  return Array.from({ length: n }, crearFilaVacia)
}
export function esFilaVacia(f) {
  return CAMPOS.every((c) => String(f[c] ?? '').trim() === '')
}
// Siempre deja una fila libre al final (hasta el máximo).
export function asegurarFilaLibre(filas) {
  if (filas.length < MAX_FILAS_TABLA && (filas.length === 0 || !esFilaVacia(filas[filas.length - 1]))) {
    return [...filas, crearFilaVacia()]
  }
  return filas
}
export function lineaDesdeFila(f) {
  return CAMPOS.map((c) => String(f[c] ?? '').trim()).join('|')
}

// ── Normalización (arregla lo que se puede arreglar solo) ───────────
function pad2(n) {
  return String(n).padStart(2, '0')
}
function fechaExiste(d, m, y) {
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

export function normalizarRuc(v) {
  return String(v ?? '').replace(/\s+/g, '')
}

export function normalizarTipo(v) {
  let t = String(v ?? '').replace(/\s+/g, '').toUpperCase()
  if (/^\d$/.test(t)) t = `0${t}` // "1" -> "01"
  return t
}

export function normalizarSerie(v) {
  let s = String(v ?? '').replace(/\s+/g, '').toUpperCase()
  if (/^\d{1,3}$/.test(s)) s = s.padStart(4, '0') // Excel borra los ceros: "1" -> "0001"
  return s
}

export function normalizarNumero(v) {
  let n = String(v ?? '').replace(/\s+/g, '')
  if (/^\d+\.0+$/.test(n)) n = n.replace(/\.0+$/, '') // "123.0" -> "123"
  return n
}

// Acepta dd/mm/aaaa, d/m/aaaa, dd-mm-aaaa, dd.mm.aaaa, aaaa-mm-dd, aaaa/mm/dd y números de fecha de Excel.
// Si no la reconoce, la deja tal cual (la validación la marcará).
export function normalizarFecha(v) {
  let t = String(v ?? '').trim()
  if (!t) return ''
  t = t.split(/[ T]/)[0] // quita la hora si viene "16/10/2026 10:30"
  let d
  let m
  let y
  let r = t.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (r) {
    d = Number(r[1]); m = Number(r[2]); y = Number(r[3])
  } else {
    r = t.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/)
    if (r) {
      y = Number(r[1]); m = Number(r[2]); d = Number(r[3])
    } else if (/^\d{5}$/.test(t) && Number(t) >= 36526 && Number(t) <= 60000) {
      const dt = new Date(Date.UTC(1899, 11, 30) + Number(t) * 86400000) // número de fecha de Excel
      y = dt.getUTCFullYear(); m = dt.getUTCMonth() + 1; d = dt.getUTCDate()
    } else {
      return t
    }
  }
  if (!fechaExiste(d, m, y)) return t
  return `${pad2(d)}/${pad2(m)}/${y}`
}

// "S/ 1,200.50" -> "1200.50" | "118" -> "118.00" | "1.200,50" -> "1200.50"
export function normalizarMonto(v) {
  const original = String(v ?? '').trim()
  if (!original) return ''
  let t = original.replace(/s\/\.?|us\$|usd|\$/gi, '').replace(/[^\d.,-]/g, '')
  if (!t) return original
  const negativo = t.startsWith('-')
  t = t.replace(/-/g, '')
  if (t.includes('.') && t.includes(',')) {
    if (t.lastIndexOf('.') > t.lastIndexOf(',')) t = t.replace(/,/g, '') // 1,200.50
    else t = t.replace(/\./g, '').replace(',', '.') // 1.200,50
  } else if (t.includes(',')) {
    if (/^\d{1,3}(,\d{3})+$/.test(t)) t = t.replace(/,/g, '') // 1,200
    else t = t.replace(',', '.') // 118,50
  } else if (/^\d{1,3}(\.\d{3}){2,}$/.test(t)) {
    t = t.replace(/\./g, '') // 1.234.567
  }
  if (/^\d+(\.\d{1,2})?$/.test(t)) t = Number(t).toFixed(2)
  return (negativo ? '-' : '') + t
}

export function normalizarCampo(campo, valor) {
  switch (campo) {
    case 'ruc_emisor': return normalizarRuc(valor)
    case 'tipo': return normalizarTipo(valor)
    case 'serie': return normalizarSerie(valor)
    case 'numero': return normalizarNumero(valor)
    case 'fecha': return normalizarFecha(valor)
    case 'monto': return normalizarMonto(valor)
    default: return String(valor ?? '').trim()
  }
}

export function normalizarFila(f) {
  const salida = {}
  CAMPOS.forEach((c) => { salida[c] = normalizarCampo(c, f[c]) })
  return salida
}

// ── Validación ──────────────────────────────────────────────────────
// Dígito verificador del RUC (módulo 11).
function rucDigitoCorrecto(ruc) {
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  let suma = 0
  for (let i = 0; i < 10; i += 1) suma += Number(ruc[i]) * pesos[i]
  let d = 11 - (suma % 11)
  if (d === 10) d = 0
  else if (d === 11) d = 1
  return d === Number(ruc[10])
}

// Devuelve { vacia, errores:[], avisos:[] } para una fila YA normalizada.
export function validarFila(f) {
  const errores = []
  const avisos = []
  if (esFilaVacia(f)) return { vacia: true, errores, avisos }

  // RUC emisor
  const ruc = String(f.ruc_emisor || '')
  if (!ruc) errores.push('RUC vacío')
  else if (!/^\d+$/.test(ruc)) errores.push('RUC solo debe tener dígitos')
  else if (ruc.length !== 11) errores.push(`RUC debe tener 11 dígitos (tiene ${ruc.length})`)
  else if (!rucDigitoCorrecto(ruc)) avisos.push('RUC con dígito verificador inválido (¿error de tipeo?)')
  else if (!['10', '15', '16', '17', '20'].includes(ruc.slice(0, 2))) avisos.push('RUC con prefijo poco usual')

  // Tipo
  const tipo = String(f.tipo || '')
  if (!tipo) errores.push('Tipo vacío')
  else if (!TIPOS_VALIDOS.includes(tipo)) errores.push(`Tipo «${tipo}» no válido (usa ${TIPOS_TEXTO})`)

  // Serie
  const serie = String(f.serie || '')
  if (!serie) errores.push('Serie vacía')
  else if (!/^[A-Z0-9]{4}$/.test(serie)) errores.push('Serie debe tener 4 caracteres (letras o números)')

  // Número
  const numero = String(f.numero || '')
  if (!numero) errores.push('Número vacío')
  else if (!/^\d+$/.test(numero)) errores.push('Número debe ser numérico')
  else {
    const sinCeros = numero.replace(/^0+/, '')
    if (sinCeros === '') errores.push('Número no puede ser 0')
    else if (sinCeros.length > 8) errores.push('Número excede 8 dígitos')
  }

  // Fecha
  const fecha = String(f.fecha || '')
  if (!fecha) errores.push('Fecha vacía')
  else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) errores.push('Fecha debe ser dd/mm/aaaa')
  else {
    const [d, m, y] = fecha.split('/').map(Number)
    if (!fechaExiste(d, m, y)) errores.push('Fecha no existe en el calendario')
    else if (new Date(Date.UTC(y, m - 1, d)) > new Date()) avisos.push('Fecha futura')
  }

  // Monto
  const monto = String(f.monto || '')
  if (!monto) {
    if (/^[A-Z]/.test(serie)) avisos.push('Monto vacío: SUNAT lo exige en comprobantes electrónicos (serie con letra)')
  } else if (!/^\d{1,8}(\.\d{1,2})?$/.test(monto)) {
    errores.push('Monto inválido (máximo 2 decimales, sin letras ni negativos)')
  }

  return { vacia: false, errores, avisos }
}

// Cache por objeto de fila: la fila solo se vuelve a validar cuando cambia.
const cacheValidacion = new WeakMap()
export function validarFilaCacheada(f) {
  let v = cacheValidacion.get(f)
  if (!v) {
    v = validarFila(f)
    cacheValidacion.set(f, v)
  }
  return v
}

// Índices de filas repetidas (misma combinación RUC + tipo + serie + número).
export function marcarDuplicados(filas) {
  const vistos = new Set()
  const repetidos = new Set()
  filas.forEach((f, i) => {
    if (esFilaVacia(f)) return
    const clave = `${f.ruc_emisor}|${f.tipo}|${f.serie}|${String(f.numero).replace(/^0+/, '')}`
    if (vistos.has(clave)) repetidos.add(i)
    else vistos.add(clave)
  })
  return repetidos
}

// ── Pegado ──────────────────────────────────────────────────────────
// Detecta solo si viene de Excel (tabuladores) o del txt (palotes |).
export function parsearPortapapeles(texto) {
  const lineas = String(texto || '').replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '')
  if (lineas.length === 0) return []
  const sep = lineas.some((l) => l.includes('\t')) ? '\t' : lineas.some((l) => l.includes('|')) ? '|' : null
  if (!sep) return lineas.map((l) => [l])
  return lineas.map((l) => {
    const cols = l.split(sep)
    while (cols.length > CAMPOS.length && !String(cols[cols.length - 1]).trim()) cols.pop()
    return cols
  })
}

function parecenEncabezado(cols) {
  const primera = String(cols[0] ?? '').trim()
  if (!primera || /^\d/.test(primera)) return false
  return cols.some((c) => /ruc|tipo|serie|n[uú]mero|fecha|monto|comprobante/i.test(String(c)))
}

// Reparte la matriz pegada desde (filaIni, colIni), normaliza y devuelve el resumen.
export function aplicarPegado(filas, filaIni, colIni, matriz) {
  let datos = matriz
  let omitioEncabezado = false
  if ((datos.length > 1 || (datos[0] && datos[0].length > 1)) && parecenEncabezado(datos[0])) {
    datos = datos.slice(1)
    omitioEncabezado = true
  }
  const sig = filas.slice()
  let filasPegadas = 0
  let filasRecortadas = 0
  let columnasIgnoradas = 0
  datos.forEach((cols, i) => {
    const idx = filaIni + i
    if (idx >= MAX_FILAS_TABLA) {
      filasRecortadas += 1
      return
    }
    while (sig.length <= idx) sig.push(crearFilaVacia())
    const nueva = { ...sig[idx] }
    cols.forEach((valor, j) => {
      const col = colIni + j
      if (col < CAMPOS.length) nueva[CAMPOS[col]] = valor
    })
    columnasIgnoradas = Math.max(columnasIgnoradas, colIni + cols.length - CAMPOS.length)
    sig[idx] = normalizarFila(nueva)
    filasPegadas += 1
  })
  return { filas: asegurarFilaLibre(sig), filasPegadas, filasRecortadas, columnasIgnoradas, omitioEncabezado }
}

// ── Análisis de un archivo .txt ─────────────────────────────────────
// Devuelve las líneas ya normalizadas (para enviar) y el resumen por archivo.
export function analizarArchivo(lineas) {
  const lineasEnviar = []
  const problemas = []
  let correctas = 0
  let conAviso = 0
  let conError = 0
  let ajustadas = 0

  lineas.forEach((linea, i) => {
    const cols = linea.split('|')
    while (cols.length > CAMPOS.length && !String(cols[cols.length - 1]).trim()) cols.pop()
    if (cols.length < 5) {
      conError += 1
      lineasEnviar.push(linea)
      problemas.push({ n: i + 1, linea, errores: ['Menos de 5 campos (RUC|tipo|serie|número|fecha|monto)'], avisos: [] })
      return
    }
    const cruda = {}
    CAMPOS.forEach((c, k) => { cruda[c] = String(cols[k] ?? '').trim() })
    const norm = normalizarFila(cruda)
    if (CAMPOS.some((c) => norm[c] !== cruda[c])) ajustadas += 1
    const v = validarFila(norm)
    lineasEnviar.push(lineaDesdeFila(norm))
    if (v.errores.length) {
      conError += 1
      problemas.push({ n: i + 1, linea, errores: v.errores, avisos: v.avisos })
    } else if (v.avisos.length) {
      conAviso += 1
      problemas.push({ n: i + 1, linea, errores: [], avisos: v.avisos })
    } else {
      correctas += 1
    }
  })

  return { total: lineas.length, correctas, conAviso, conError, ajustadas, lineasEnviar, problemas }
}