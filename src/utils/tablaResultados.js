// Lógica pura de la tabla de resultados (sin pantalla): armar el texto para pegar en Excel.
// Excel separa columnas con TAB y filas con salto de línea.

// "1,200.50" -> "1200.50" (así Excel lo reconoce como número). Lo demás queda igual.
const MONTO_CON_MILES = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/

function limpiarCelda(valor) {
  const texto = String(valor ?? '').replace(/[\t\r\n]+/g, ' ').trim()
  return MONTO_CON_MILES.test(texto) ? texto.replace(/,/g, '') : texto
}

// Devuelve el texto listo para pegar en Excel.
export function textoParaExcel(columnas, filas, conEncabezados) {
  const lineas = []
  if (conEncabezados) lineas.push(columnas.map(limpiarCelda).join('\t'))
  for (const fila of filas) lineas.push(fila.map(limpiarCelda).join('\t'))
  return lineas.join('\n')
}

// ¿La columna parece de números/montos? (para alinearla a la derecha)
export function esColumnaNumerica(filas, idx) {
  let vistos = 0
  for (const f of filas) {
    const v = String(f[idx] ?? '').trim()
    if (!v) continue
    if (!/^-?[\d.,]+$/.test(v)) return false
    vistos += 1
    if (vistos >= 20) break
  }
  return vistos > 0
}

// Copia al portapapeles. Primero la forma moderna; si el navegador no deja, la forma antigua.
export async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = texto
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(area)
      return ok
    } catch {
      return false
    }
  }
}
