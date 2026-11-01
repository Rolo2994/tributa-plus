import React, { useMemo } from 'react'

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Lista de meses [{anio, mes}] desde 'aaaa-mm-dd' hasta 'aaaa-mm-dd' (ambos incluidos).
function mesesDelRango(fi, ff) {
  const [a1, m1] = String(fi).split('-').map(Number)
  const [a2, m2] = String(ff).split('-').map(Number)
  if (!a1 || !m1 || !a2 || !m2) return []
  const lista = []
  let a = a1
  let m = m1
  while (a < a2 || (a === a2 && m <= m2)) {
    lista.push({ anio: a, mes: m })
    m += 1
    if (m > 12) { m = 1; a += 1 }
    if (lista.length > 36) break
  }
  return lista
}

// Resumen compacto: cuántas operaciones hay en cada mes (según la fecha de pago).
// Usa las columnas "AÑO" y "MES" que arma el servidor. Al hacer clic en un mes,
// la tabla de abajo se filtra a ese mes (clic otra vez = quitar el filtro).
//   activo: { anio, mes } | null     onElegir(anio, mes) | onElegir(null)
export default function ResumenMensual({ columnas, filas, fi, ff, activo, onElegir }) {
  const idxAnio = columnas.indexOf('AÑO')
  const idxMes = columnas.indexOf('MES')

  const datos = useMemo(() => {
    if (idxAnio < 0 || idxMes < 0) return null
    const conteo = new Map()
    let sinFecha = 0
    filas.forEach((f) => {
      const a = Number(f[idxAnio])
      const m = Number(f[idxMes])
      if (!a || !m) { sinFecha += 1; return }
      const k = `${a}-${m}`
      conteo.set(k, (conteo.get(k) || 0) + 1)
    })
    // Todos los meses del rango consultado (aunque tengan 0) + cualquier mes extra que haya llegado.
    const meses = mesesDelRango(fi, ff)
    const vistos = new Set(meses.map((x) => `${x.anio}-${x.mes}`))
    Array.from(conteo.keys()).forEach((k) => {
      if (!vistos.has(k)) { const [anio, mes] = k.split('-').map(Number); meses.push({ anio, mes }) }
    })
    meses.sort((x, y) => x.anio - y.anio || x.mes - y.mes)
    return { conteo, meses, sinFecha }
  }, [filas, idxAnio, idxMes, fi, ff])

  if (!datos || datos.meses.length === 0) return null
  const { conteo, meses, sinFecha } = datos
  const total = filas.length

  return (
    <div className="bg-white rounded-xl border border-[#F0F3F7] shadow-card px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="text-[12px] font-bold text-ink">Resumen por mes de pago</div>
        <div className="text-[10.5px] text-muted">Toca un mes para filtrar la tabla</div>
      </div>
      <div className="overflow-x-auto">
        <table className="border-collapse text-[11.5px] w-full">
          <thead>
            <tr>
              <th className="h-7 px-2 text-left text-[10px] font-bold uppercase tracking-wide text-muted whitespace-nowrap">Mes</th>
              {meses.map((x) => (
                <th key={`${x.anio}-${x.mes}`} className="h-7 px-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-muted whitespace-nowrap">
                  {MESES_CORTOS[x.mes - 1]} {String(x.anio).slice(2)}
                </th>
              ))}
              {sinFecha > 0 && <th className="h-7 px-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-muted whitespace-nowrap">Sin fecha</th>}
              <th className="h-7 px-2 text-center text-[10px] font-bold uppercase tracking-wide text-muted whitespace-nowrap">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="h-8 px-2 text-[11px] font-semibold text-ink whitespace-nowrap">Operaciones</td>
              {meses.map((x) => {
                const n = conteo.get(`${x.anio}-${x.mes}`) || 0
                const esActivo = activo && activo.anio === x.anio && activo.mes === x.mes
                return (
                  <td key={`${x.anio}-${x.mes}`} className="p-0.5 text-center">
                    <button
                      type="button"
                      disabled={n === 0}
                      onClick={() => onElegir(esActivo ? null : x)}
                      className={`w-full min-w-[46px] h-7 rounded-md text-[12px] font-bold tabular-nums ${
                        esActivo ? 'bg-azul-inst text-white'
                          : n === 0 ? 'bg-[#F7F9FB] text-muted font-normal'
                            : 'bg-[#EAF1FA] text-azul-inst hover:bg-[#D6E8FF]'
                      }`}
                    >
                      {n}
                    </button>
                  </td>
                )
              })}
              {sinFecha > 0 && <td className="p-0.5 text-center text-[12px] font-bold tabular-nums text-[#8A6A00]">{sinFecha}</td>}
              <td className="px-2 text-center text-[12.5px] font-bold tabular-nums text-ink">{total}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
