import React, { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { getTaxStatus, getVencimientos } from '../services/googleSheetsApi.js'
import { normalizeTaxRow } from '../utils/normalizeTaxRow.js'
import { esCodigoAfp, calcularInteres, diasDeAtraso } from '../utils/interesDeuda.js'
import { obtenerDigitoRuc } from '../utils/digitoRuc.js'
import { quintoDiaHabil, toISO } from '../utils/diasHabiles.js'
import { MESES } from '../utils/meses.js'
import { construirMensajeDashboard } from '../utils/construirMensajeDashboard.js'
import CustomSelect from '../components/CustomSelect.jsx'
import DebtTreemap from '../components/DebtTreemap.jsx'
import { PAGINAS_LOGIN, PAGINAS_DIRECTAS } from '../data/mockData.js'

const MES_ABBR = MESES.map((m) => m.slice(0, 3))

const ACCIONES = [
  { id: 'buzon', label: 'Buzón PDF', icon: '📥' },
  { id: 'validez', label: 'Validez CP', icon: '🔎' },
  { id: 'detracc', label: 'Detracciones', icon: '📊' },
  { id: 'sire', label: 'SIRE', icon: '⬇' },
]

export default function DashboardScreen() {
  const { rucs, activeRuc, setDrawerOpen, pushLog, goScreen } = useApp()

  const [taxRows, setTaxRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [vencCache, setVencCache] = useState({})
  const [empresaFiltro, setEmpresaFiltro] = useState('Todas')
  const [vistaGrafico, setVistaGrafico] = useState('tributo') // 'tributo' | 'periodo'

  useEffect(() => {
    let cancel = false
    async function load() {
      setLoading(true)
      setErrorMsg('')
      try {
        const res = await getTaxStatus()
        if (cancel) return
        if (res?.ok && Array.isArray(res.data)) {
          setTaxRows(res.data.map(normalizeTaxRow))
        } else {
          setErrorMsg(res?.error || 'No se pudo leer la hoja "Tax Status"')
        }
      } catch (err) {
        if (!cancel) setErrorMsg(err?.message || String(err))
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    load()
    return () => { cancel = true }
  }, [])

  useEffect(() => {
    const pares = new Set()
    taxRows.forEach((r) => {
      if (!esCodigoAfp(r.tributo) && r.mes >= 1 && r.mes <= 12 && r.anio) {
        pares.add(`${r.anio}-${r.mes}`)
      }
    })
    const faltantes = [...pares].filter((k) => !(k in vencCache))
    if (faltantes.length === 0) return

    let cancel = false
    async function loadVenc() {
      try {
        const resultados = await Promise.all(
          faltantes.map(async (k) => {
            const [anio, mes] = k.split('-')
            const res = await getVencimientos('DJ Mensual', MESES[Number(mes) - 1], anio)
            return [k, res?.ok ? res.data : {}]
          })
        )
        if (cancel) return
        setVencCache((prev) => {
          const next = { ...prev }
          resultados.forEach(([k, data]) => { next[k] = data })
          return next
        })
      } catch (err) {
        pushLog(`✗ Error cargando cronograma para el dashboard: ${err?.message || err}`)
      }
    }
    loadVenc()
    return () => { cancel = true }
  }, [taxRows]) // eslint-disable-line

  const hoy = new Date()
  const hoyISO = toISO(hoy)

  const rowsCalculadas = useMemo(() => {
    return taxRows.map((row) => {
      const afp = esCodigoAfp(row.tributo)
      let fechaVenc = null

      if (afp) {
        if (row.mes >= 1 && row.mes <= 12 && row.anio) {
          const mesSig = row.mes === 12 ? 1 : row.mes + 1
          const anioSig = row.mes === 12 ? row.anio + 1 : row.anio
          fechaVenc = toISO(quintoDiaHabil(anioSig, mesSig))
        }
      } else {
        const key = `${row.anio}-${row.mes}`
        const mapa = vencCache[key]
        if (mapa) {
          const rucObj = rucs.find((r) => r.ruc === row.ruc) || { ruc: row.ruc, orden: '' }
          const digito = obtenerDigitoRuc(rucObj)
          fechaVenc = mapa[digito] || null
        }
      }

      const dias = diasDeAtraso(fechaVenc, hoyISO)
      const interes = calcularInteres(row.saldoPendiente, dias, afp)
      const montoActualizado = row.saldoPendiente + interes

      return { ...row, esAfp: afp, fechaVenc, diasAtraso: dias, interes, montoActualizado }
    })
  }, [taxRows, vencCache, rucs, hoyISO])

  const empresas = useMemo(() => {
    const map = new Map()
    rowsCalculadas.forEach((r) => {
      if (!map.has(r.ruc)) map.set(r.ruc, r.razonSocial)
    })
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [rowsCalculadas])

  const rowsFiltradas = useMemo(() => {
    if (empresaFiltro === 'Todas') return rowsCalculadas
    return rowsCalculadas.filter((r) => r.ruc === empresaFiltro)
  }, [rowsCalculadas, empresaFiltro])

  const kpis = useMemo(() => {
    const totalInteres = rowsFiltradas.reduce((s, r) => s + r.interes, 0)
    const deudaTotalActualizada = rowsFiltradas.reduce((s, r) => s + r.montoActualizado, 0)
    const diasMasAntiguo = rowsFiltradas.reduce((max, r) => Math.max(max, r.diasAtraso), 0)
    const tributosVencidos = rowsFiltradas.filter((r) => r.diasAtraso > 0).length
    return { totalInteres, deudaTotalActualizada, diasMasAntiguo, tributosVencidos }
  }, [rowsFiltradas])

  const treemapData = useMemo(() => {
    const grupos = new Map()
    rowsFiltradas.forEach((r) => {
      const key = vistaGrafico === 'tributo' ? r.tributo : `${MES_ABBR[r.mes - 1] || '?'} ${r.anio}`
      grupos.set(key, (grupos.get(key) || 0) + r.montoActualizado)
    })
    return [...grupos.entries()].map(([label, value]) => ({ label, value }))
  }, [rowsFiltradas, vistaGrafico])

  function exportarCSV() {
    const header = ['Código', 'RUC', 'Razón Social', 'Tributo', 'Periodo', 'Saldo pendiente', 'Vencimiento', 'Días atraso', 'Interés', 'Monto actualizado']
    const lines = rowsFiltradas.map((r) => [
      r.codigo, r.ruc, r.razonSocial, r.tributo, `${r.mes}/${r.anio}`,
      r.saldoPendiente.toFixed(2), r.fechaVenc || '', r.diasAtraso, r.interes.toFixed(2), r.montoActualizado.toFixed(2),
    ].join(','))
    const csv = [header.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `deuda_${empresaFiltro === 'Todas' ? 'todas' : empresaFiltro}_${hoyISO}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    pushLog(`Descargado CSV de deuda — ${rowsFiltradas.length} fila(s)`)
  }

  async function compartirWhatsApp() {
    const empresaLabel = empresaFiltro === 'Todas' ? 'Todos los RUCs' : (empresas.find(([ruc]) => ruc === empresaFiltro)?.[1] || empresaFiltro)
    const texto = construirMensajeDashboard(empresaLabel, kpis, rowsFiltradas.slice(0, 15))
    if (navigator.share) {
      try { await navigator.share({ title: `Estado de cuenta — ${empresaLabel}`, text: texto }) } catch {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
    }
  }

  function autoLogin(pagina) {
    pushLog(`Iniciando sesión — ${activeRuc?.razonSocial || '—'} → ${pagina}`)
    pushLog('Usuario y clave leídos de Google Sheets…')
    setTimeout(() => pushLog(`✓ Sesión abierta en ${pagina}`), 800)
  }

  return (
    <div className="relative flex-1 overflow-y-auto px-4 pt-4 pb-[130px]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-bold text-[16px] text-ink">Dashboard tributario</h2>
        <div className="flex gap-2">
          <button onClick={exportarCSV} className="text-[11px] font-semibold text-azul-inst bg-[#E7EEF7] px-2.5 py-1.5 rounded-full">⬇ CSV</button>
          <button onClick={compartirWhatsApp} className="text-[11px] font-semibold text-white bg-[#25D366] px-2.5 py-1.5 rounded-full flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M21 11.5a8.4 8.4 0 01-9 8.4A8.5 8.5 0 013 12a8.5 8.5 0 0117-.5Z" /></svg>
            Enviar
          </button>
        </div>
      </div>

      <CustomSelect
        title="Filtrar por empresa"
        value={empresaFiltro}
        onChange={setEmpresaFiltro}
        options={[{ value: 'Todas', label: `Todas las empresas (${empresas.length})` }, ...empresas.map(([ruc, nombre]) => ({ value: ruc, label: `${nombre} — ${ruc}` }))]}
        className="w-full mb-4"
      />

      {errorMsg && (
        <div className="mb-3 text-[10.5px] bg-[#FCE9EB] text-rojo-sunat px-3 py-2 rounded-lg">
          No se pudo cargar el dashboard: {errorMsg}
        </div>
      )}
      {loading && rowsCalculadas.length === 0 && (
        <div className="text-center text-muted text-[12px] py-8">Cargando deuda pendiente…</div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5">
              <div className="text-[9.5px] text-muted uppercase tracking-wide font-semibold mb-1">Deuda actualizada</div>
              <div className="font-display font-extrabold text-[19px] text-ink">S/ {kpis.deudaTotalActualizada.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5">
              <div className="text-[9.5px] text-muted uppercase tracking-wide font-semibold mb-1">Interés generado</div>
              <div className="font-display font-extrabold text-[19px] text-rojo-sunat">S/ {kpis.totalInteres.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5">
              <div className="text-[9.5px] text-muted uppercase tracking-wide font-semibold mb-1">Deuda más antigua</div>
              <div className="font-display font-extrabold text-[19px] text-ink">{kpis.diasMasAntiguo}<span className="text-[11px] font-semibold text-muted"> días</span></div>
            </div>
            <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5">
              <div className="text-[9.5px] text-muted uppercase tracking-wide font-semibold mb-1">Tributos vencidos</div>
              <div className="font-display font-extrabold text-[19px] text-ambar">{kpis.tributosVencidos}</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-[12.5px] text-ink">Composición de la deuda</div>
              <div className="flex bg-[#F1F4F8] rounded-lg p-[3px]">
                <button onClick={() => setVistaGrafico('tributo')} className={`px-2.5 py-1.5 text-[10.5px] font-semibold rounded-md ${vistaGrafico === 'tributo' ? 'bg-white text-azul-inst shadow' : 'text-muted'}`}>Por tributo</button>
                <button onClick={() => setVistaGrafico('periodo')} className={`px-2.5 py-1.5 text-[10.5px] font-semibold rounded-md ${vistaGrafico === 'periodo' ? 'bg-white text-azul-inst shadow' : 'text-muted'}`}>Por periodo</button>
              </div>
            </div>
            <DebtTreemap items={treemapData} />
          </div>

          <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card overflow-hidden mb-5">
            <div className="px-3.5 py-2.5 bg-azul-dark text-white text-[11px] font-semibold">{rowsFiltradas.length} tributo(s) pendiente(s)</div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10.5px]">
                <thead>
                  <tr className="bg-[#F1F5FA] text-muted text-left">
                    <th className="px-2.5 py-2 font-semibold whitespace-nowrap">Tributo</th>
                    <th className="px-2.5 py-2 font-semibold whitespace-nowrap">Periodo</th>
                    <th className="px-2.5 py-2 font-semibold whitespace-nowrap text-right">Deuda</th>
                    <th className="px-2.5 py-2 font-semibold whitespace-nowrap">Vence</th>
                    <th className="px-2.5 py-2 font-semibold whitespace-nowrap text-right">Interés</th>
                    <th className="px-2.5 py-2 font-semibold whitespace-nowrap text-right">Actualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsFiltradas.map((r, i) => (
                    <tr key={r.id} className={`border-t border-[#F1F4F8] ${r.diasAtraso > 0 ? 'bg-[#FCE9EB]/40' : i % 2 ? 'bg-[#FAFBFD]' : 'bg-white'}`}>
                      <td className="px-2.5 py-2 whitespace-nowrap text-ink font-semibold">{r.tributo}</td>
                      <td className="px-2.5 py-2 whitespace-nowrap text-muted">{MES_ABBR[r.mes - 1] || r.mes}/{r.anio}</td>
                      <td className="px-2.5 py-2 whitespace-nowrap text-right font-mono">{r.saldoPendiente.toFixed(2)}</td>
                      <td className="px-2.5 py-2 whitespace-nowrap text-muted">{r.fechaVenc ? r.fechaVenc.slice(5) : '—'}{r.diasAtraso > 0 && <span className="text-rojo-sunat font-semibold"> ({r.diasAtraso}d)</span>}</td>
                      <td className="px-2.5 py-2 whitespace-nowrap text-right font-mono text-rojo-sunat">{r.interes.toFixed(2)}</td>
                      <td className="px-2.5 py-2 whitespace-nowrap text-right font-mono font-semibold text-ink">{r.montoActualizado.toFixed(2)}</td>
                    </tr>
                  ))}
                  {rowsFiltradas.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-muted">Sin deuda pendiente para este filtro.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="flex items-center justify-between mb-2">
        <div className="font-display font-bold text-[14px] text-ink">Acciones</div>
        <button onClick={() => setDrawerOpen(true)} className="text-[10.5px] font-semibold text-azul-inst bg-[#E7EEF7] px-2.5 py-1.5 rounded-full truncate max-w-[160px]">
          {activeRuc ? activeRuc.razonSocial : 'Elegir RUC'}
        </button>
      </div>

      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 mb-3">
        {ACCIONES.map((a) => (
          <button key={a.id} onClick={() => goScreen(a.id)} className="flex-shrink-0 w-[84px] bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3 text-center">
            <div className="text-[22px] mb-1">{a.icon}</div>
            <div className="text-[10px] font-semibold text-ink leading-tight">{a.label}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 mb-3">
        {PAGINAS_LOGIN.map((p) => (
          <button key={p.id} onClick={() => autoLogin(p.nombre)} className="flex-shrink-0 w-[130px] bg-[#F7F9FB] rounded-2xl border border-bordersoft p-3 text-left">
            <div className="text-[10.5px] font-semibold text-ink leading-tight">{p.nombre}</div>
            <div className="text-[9px] text-muted mt-1 leading-tight">{p.desc}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {PAGINAS_DIRECTAS.map((d) => (
          <button key={d.id} onClick={() => pushLog(`Abriendo ${d.nombre}…`)} className="bg-[#F1F4F8] text-azul-inst font-semibold text-[11px] px-2 py-2.5 rounded-xl text-center border border-bordersoft">
            {d.nombre}
          </button>
        ))}
      </div>
    </div>
  )
}