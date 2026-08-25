import { useEffect, useMemo, useState } from 'react'
import { getVencimientos } from '../services/googleSheetsApi.js'
import { proximoDiaHabil, quintoDiaHabil, toISO } from '../utils/diasHabiles.js'
import { DIGITOS_RUC, TIPOS_VENCIMIENTO } from '../utils/digitoRuc.js'
import { MESES } from '../utils/meses.js'

export function useVencimientosHoy(pushLog) {
  const hoy = new Date()
  const hoyISO = toISO(hoy)
  const proxISO = toISO(proximoDiaHabil(hoy))

  const mesActualIdx = hoy.getMonth()
  const anioActual = hoy.getFullYear()
  const mesAnteriorIdx = mesActualIdx > 0 ? mesActualIdx - 1 : 11
  const anioMesAnterior = mesActualIdx > 0 ? anioActual : anioActual - 1

  const [vencData, setVencData] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancel = false
    async function load() {
      setLoading(true)
      try {
        const combos = [
          [MESES[mesActualIdx], anioActual],
          [MESES[mesAnteriorIdx], anioMesAnterior],
        ]
        const resultados = await Promise.all(
          combos.flatMap(([mesNombre, anio]) =>
            TIPOS_VENCIMIENTO.map(async (tipo) => {
              const res = await getVencimientos(tipo, mesNombre, anio)
              return { tipo, data: res?.ok ? res.data : {} }
            })
          )
        )
        if (cancel) return
        const merged = {}
        resultados.forEach(({ tipo, data }) => {
          merged[tipo] = { ...(merged[tipo] || {}), ...data }
        })
        setVencData(merged)
      } catch (err) {
        pushLog && pushLog(`✗ Error cargando cronograma: ${err?.message || err}`)
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    load()
    return () => { cancel = true }
  }, []) // eslint-disable-line

  const fechaAfpISO = useMemo(() => toISO(quintoDiaHabil(anioActual, mesActualIdx + 1)), [anioActual, mesActualIdx])

  const { cuadroHoy, cuadroProx } = useMemo(() => {
    const ch = [], cp = []
    TIPOS_VENCIMIENTO.forEach((tipo) => {
      const data = vencData[tipo] || {}
      const dh = DIGITOS_RUC.filter((d) => data[d] === hoyISO)
      const dp = DIGITOS_RUC.filter((d) => data[d] === proxISO)
      if (dh.length) ch.push({ tipo, digitos: dh })
      if (dp.length) cp.push({ tipo, digitos: dp })
    })
    if (fechaAfpISO === hoyISO) ch.push({ tipo: 'AFPnet', digitos: [] })
    if (fechaAfpISO === proxISO) cp.push({ tipo: 'AFPnet', digitos: [] })
    return { cuadroHoy: ch, cuadroProx: cp }
  }, [vencData, hoyISO, proxISO, fechaAfpISO])

  return { hoy, hoyISO, proxISO, cuadroHoy, cuadroProx, loading }
}