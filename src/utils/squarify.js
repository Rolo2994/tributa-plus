/**
 * Algoritmo de "squarified treemap": distribuye rectángulos cuya área
 * es proporcional al valor de cada elemento, manteniendo formas lo más
 * cuadradas posible (evita franjas muy alargadas y difíciles de leer).
 * Es el mismo principio que usan los treemaps de herramientas de BI.
 */
export function squarify(data, x, y, w, h) {
  const items = [...data].filter((i) => i.value > 0).sort((a, b) => b.value - a.value)
  const total = items.reduce((s, i) => s + i.value, 0)
  if (total <= 0 || w <= 0 || h <= 0) return []
  const area = w * h
  const scaled = items.map((i) => ({ ...i, _area: (i.value / total) * area }))
  const results = []
  layoutRow(scaled, x, y, w, h, results)
  return results
}

function worstRatio(row, sum, length) {
  const areas = row.map((i) => i._area)
  const areaMax = Math.max(...areas)
  const areaMin = Math.min(...areas)
  const s2 = sum * sum
  const l2 = length * length
  return Math.max((l2 * areaMax) / s2, s2 / (l2 * areaMin))
}

function layoutRow(items, x, y, w, h, results) {
  if (items.length === 0) return
  const vertical = w < h
  const length = vertical ? h : w

  let row = []
  let rowSum = 0
  let bestRatio = Infinity
  let i = 0

  while (i < items.length) {
    const item = items[i]
    const newRow = [...row, item]
    const newSum = rowSum + item._area
    const ratio = worstRatio(newRow, newSum, length)
    if (ratio <= bestRatio) {
      row = newRow
      rowSum = newSum
      bestRatio = ratio
      i++
    } else {
      break
    }
  }

  const thickness = rowSum / length
  let offset = 0
  row.forEach((item) => {
    const itemLength = item._area / thickness
    if (vertical) {
      results.push({ ...item, x, y: y + offset, w: thickness, h: itemLength })
    } else {
      results.push({ ...item, x: x + offset, y, w: itemLength, h: thickness })
    }
    offset += itemLength
  })

  const remaining = items.slice(row.length)
  if (remaining.length) {
    if (vertical) {
      layoutRow(remaining, x + thickness, y, w - thickness, h, results)
    } else {
      layoutRow(remaining, x, y + thickness, w, h - thickness, results)
    }
  }
}