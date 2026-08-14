function pad(n) { return String(n).padStart(2, '0') }

export function toISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function feriadosPeru(anio) {
  const fijos = [
    [1, 1], [4, 2], [4, 3], [5, 1], [6, 7], [6, 29],
    [7, 23], [7, 28], [7, 29], [8, 6], [8, 30],
    [10, 8], [11, 1], [12, 8], [12, 9], [12, 25],
  ]
  const set = new Set()
  fijos.forEach(([m, d]) => set.add(`${anio}-${pad(m)}-${pad(d)}`))

  // Cálculo de Pascua (algoritmo de Gauss) para Jueves/Viernes Santo — igual que sunat_launcher.py
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mesPascua = Math.floor((h + l - 7 * m + 114) / 31)
  const diaPascua = ((h + l - 7 * m + 114) % 31) + 1
  const pascua = new Date(anio, mesPascua - 1, diaPascua)
  const juevesSanto = new Date(pascua)
  juevesSanto.setDate(pascua.getDate() - 2)
  set.add(toISO(juevesSanto))
  set.add(toISO(pascua))
  return set
}

export function proximoDiaHabil(fecha) {
  const feriados = new Set([...feriadosPeru(fecha.getFullYear()), ...feriadosPeru(fecha.getFullYear() + 1)])
  const sig = new Date(fecha)
  sig.setDate(sig.getDate() + 1)
  while (sig.getDay() === 0 || sig.getDay() === 6 || feriados.has(toISO(sig))) {
    sig.setDate(sig.getDate() + 1)
  }
  return sig
}

/** anio/mes: mes 1-indexado. Devuelve el 5to día hábil de ese mes (vencimiento AFPnet). */
export function quintoDiaHabil(anio, mes) {
  const feriados = new Set([...feriadosPeru(anio), ...feriadosPeru(anio + 1)])
  const d = new Date(anio, mes - 1, 1)
  let count = 0
  while (true) {
    if (d.getDay() !== 0 && d.getDay() !== 6 && !feriados.has(toISO(d))) {
      count++
      if (count === 5) return new Date(d)
    }
    d.setDate(d.getDate() + 1)
  }
}