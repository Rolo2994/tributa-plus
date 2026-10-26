// Lógica pura (sin React) de la tabla de "Descarga de comprobantes SUNAT".
// Es la misma que usa la tabla de la app de escritorio (descarga_cpe.py):
// mismas columnas, mismas validaciones y la misma normalización.

export const MAX_FILAS = 500 // mismo tope que el servidor
export const FILAS_INICIALES = 12
export const PLANTILLA_DEFECTO = '{op}-{ruc}-{serie}-{numero}'
export const PLACEHOLDERS = ['op', 'ruc', 'tipo', 'serie', 'numero']
export const CODIGOS_VALIDOS = ['01', '03', '07', '08', '20', '40', 'R1', 'R7']

// Campo (como lo espera el servidor) + título que ve el usuario.
export const COLUMNAS = [
  { campo: 'op', titulo: 'Cód. operación' },
  { campo: 'ruc_emisor', titulo: 'RUC emisor' },
  { campo: 'tipo', titulo: 'Tipo' },
  { campo: 'serie', titulo: 'Serie' },
  { campo: 'numero', titulo: 'Número' },
]
export const CAMPOS = COLUMNAS.map((c) => c.campo)

export const filaVacia = () => ({ op: '', ruc_emisor: '', tipo: '', serie: '', numero: '' })

export function esFilaVacia(fila) {
  return CAMPOS.every((campo) => !String(fila[campo] ?? '').trim())
}

export function crearFilasVacias(cantidad = FILAS_INICIALES) {
  return Array.from({ length: cantidad }, filaVacia)
}

// Deja siempre una fila libre al final, para seguir escribiendo.
export function asegurarFilaLibre(filas) {
  if (filas.length >= MAX_FILAS) return filas
  if (filas.length === 0 || !esFilaVacia(filas[filas.length - 1])) return [...filas, filaVacia()]
  return filas
}

// ── Normalización ───────────────────────────────────────────────────
function limpiarTexto(valor) {
  return String(valor ?? '')
    .replace(/ /g, ' ') // espacio "duro" que mete Excel
    .trim()
    .replace(/^"(.*)"$/, '$1') // comillas con las que Excel envuelve algunas celdas
    .trim()
}

// Tipo "1" -> "01"; serie siempre en mayúsculas. (Igual que la app de escritorio.)
export function normalizarCampo(campo, valor) {
  const v = limpiarTexto(valor)
  if (campo === 'tipo') {
    const t = v.toUpperCase()
    return /^\d$/.test(t) ? `0${t}` : t
  }
  if (campo === 'serie') return v.toUpperCase()
  return v
}

// ── Validación (mismas reglas que el servidor y que el escritorio) ──
// Un ERROR bloquea la fila; un AVISO solo informa.
export function validarFila(fila) {
  const errores = []
  const avisos = []
  if (esFilaVacia(fila)) return { errores, avisos, vacia: true }

  const op = String(fila.op ?? '').trim()
  const ruc = String(fila.ruc_emisor ?? '').trim()
  const tipo = String(fila.tipo ?? '').trim().toUpperCase()
  const serie = String(fila.serie ?? '').trim().toUpperCase()
  const numero = String(fila.numero ?? '').trim()

  if (!op) avisos.push('Código de operación vacío')

  if (!ruc) errores.push('RUC vacío')
  else if (!/^\d+$/.test(ruc)) errores.push('RUC contiene caracteres no numéricos')
  else if (ruc.length !== 11) errores.push(`RUC debe tener 11 dígitos (tiene ${ruc.length})`)

  const tipoNorm = /^\d$/.test(tipo) ? `0${tipo}` : tipo
  if (!tipoNorm) errores.push('Tipo de comprobante vacío')
  else if (!CODIGOS_VALIDOS.includes(tipoNorm)) errores.push(`Tipo '${tipoNorm}' no reconocido`)

  if (!serie) errores.push('Serie vacía')
  if (!numero) errores.push('Número vacío')
  else if (!/^\d+$/.test(numero)) errores.push('Número debe ser numérico')

  if (serie && ['01', '07', '08'].includes(tipoNorm) && !['F', 'E'].includes(serie[0])) {
    avisos.push('Serie no sigue la convención habitual de Factura (F/E)')
  }
  if (serie && tipoNorm === '03' && !['B', 'E'].includes(serie[0])) {
    avisos.push('Serie no sigue la convención habitual de Boleta (B/E)')
  }
  if (serie && tipoNorm === '20' && serie[0] !== 'R') avisos.push('Serie no sigue la convención habitual de Retención (R)')
  if (serie && tipoNorm === '40' && serie[0] !== 'P') avisos.push('Serie no sigue la convención habitual de Percepción (P)')

  return { errores, avisos, vacia: false }
}

// Cache por identidad: una fila que no cambió no se vuelve a validar
// (con 500 filas, cada tecla solo revalida la fila editada).
const cacheValidacion = new WeakMap()
export function validarFilaCacheada(fila) {
  let r = cacheValidacion.get(fila)
  if (!r) {
    r = validarFila(fila)
    cacheValidacion.set(fila, r)
  }
  return r
}

export function validarPlantilla(plantilla) {
  const texto = String(plantilla ?? '').trim()
  if (!texto) return 'Escribe cómo se llamarán los archivos.'
  const sinValidos = texto.replace(new RegExp(`\\{(${PLACEHOLDERS.join('|')})\\}`, 'g'), '')
  if (sinValidos.includes('{') || sinValidos.includes('}')) {
    return `Usa solo ${PLACEHOLDERS.map((p) => `{${p}}`).join(', ')}.`
  }
  return ''
}

// Ejemplo del nombre que resultará (sin extensión), para mostrarlo en pantalla.
export function nombreEjemplo(plantilla, fila) {
  const f = fila || { op: '1', ruc_emisor: '20100049181', tipo: '01', serie: 'F001', numero: '123' }
  const valores = { op: f.op, ruc: f.ruc_emisor, tipo: f.tipo, serie: f.serie, numero: f.numero }
  return String(plantilla ?? '').replace(/\{(\w+)\}/g, (_, k) => valores[k] ?? '')
}

// ── Lo que se copia de Excel ────────────────────────────────────────
// Excel entrega texto con TAB entre columnas y salto de línea entre filas.
export function parsearPortapapeles(texto) {
  const lineas = String(texto ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  while (lineas.length && lineas[lineas.length - 1].trim() === '') lineas.pop()
  return lineas.map((linea) => linea.split('\t').map(limpiarTexto))
}

// ¿La primera fila pegada es un encabezado ("RUC", "Serie"...)?  Se omite.
export function pareceEncabezado(celdas) {
  if (!celdas || celdas.length === 0) return false
  const hayRucReal = celdas.some((c) => /^\d{11}$/.test(c))
  const hayPalabra = celdas.some((c) => /ruc|serie|n[úu]mero|tipo|operaci/i.test(c))
  return !hayRucReal && hayPalabra
}

// Pega una matriz de celdas a partir de (filaIni, colIni), como hace Excel.
// Devuelve las filas nuevas y datos para avisar al usuario.
export function aplicarPegado(filas, filaIni, colIni, matriz) {
  let datos = matriz
  let omitioEncabezado = false
  if (datos.length > 0 && pareceEncabezado(datos[0])) {
    datos = datos.slice(1)
    omitioEncabezado = true
  }

  const resultado = filas.slice()
  let columnasIgnoradas = 0
  let filasRecortadas = 0

  datos.forEach((celdas, r) => {
    const destino = filaIni + r
    if (destino >= MAX_FILAS) {
      filasRecortadas += 1
      return
    }
    while (resultado.length <= destino) resultado.push(filaVacia())
    const nueva = { ...resultado[destino] }
    celdas.forEach((valor, c) => {
      const campo = CAMPOS[colIni + c]
      if (!campo) {
        columnasIgnoradas = Math.max(columnasIgnoradas, celdas.length - c)
        return
      }
      nueva[campo] = normalizarCampo(campo, valor)
    })
    resultado[destino] = nueva
  })

  return {
    filas: asegurarFilaLibre(resultado),
    filasPegadas: datos.length - filasRecortadas,
    filasRecortadas,
    columnasIgnoradas,
    omitioEncabezado,
  }
}

// ── Resultado de cada fila (lo que informa el servidor) ─────────────
// Igual que la app de escritorio: éxito = todo lo pedido se descargó.
export function filaExitosa(resultado, pedido) {
  if (!resultado) return false
  const okPdf = !pedido.pdf || resultado.pdf_ok
  const okXml = !pedido.xml || resultado.xml_ok
  const okCdr = !pedido.cdr || resultado.cdr_ok
  return Boolean(okPdf && okXml && okCdr)
}

// Texto para pegar de vuelta en Excel / en la tabla: solo las filas que fallaron.
export function textoFallidos(filas, indices, resultados, pedido) {
  return indices
    .filter((idx) => resultados[idx] && !filaExitosa(resultados[idx], pedido))
    .map((idx) => {
      const f = filas[idx]
      const motivo = resultados[idx].error || 'motivo desconocido'
      return [f.op, f.ruc_emisor, f.tipo, f.serie, f.numero, `(${motivo})`].join('\t')
    })
    .join('\n')
}
