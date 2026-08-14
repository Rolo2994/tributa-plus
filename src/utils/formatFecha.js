import { MESES } from './meses.js'

const MES_ABBR = MESES.map((m) => m.slice(0, 3))

/** A partir de "yyyy-MM-dd" devuelve { dia, mes } para mostrar en dos líneas, sin guion. */
export function diaMes(fechaISO) {
  if (!fechaISO) return { dia: '—', mes: '' }
  const [, mm, dd] = fechaISO.split('-')
  const mesIdx = Number(mm) - 1
  return { dia: String(Number(dd)), mes: MES_ABBR[mesIdx] || '' }
}