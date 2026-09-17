import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { getTaxStatus, getVencimientos } from '../services/googleSheetsApi.js'
import { listarArchivosSire, calcularPreFv621 } from '../services/sireApi.js'
import { normalizeTaxRow } from '../utils/normalizeTaxRow.js'
import { esCodigoAfp, calcularInteres, diasDeAtraso } from '../utils/interesDeuda.js'
import { obtenerDigitoRuc } from '../utils/digitoRuc.js'
import { quintoDiaHabil, toISO } from '../utils/diasHabiles.js'
import { MESES } from '../utils/meses.js'
import { formatMoney } from '../utils/formatMoney.js'
import { construirMensajeDashboard } from '../utils/construirMensajeDashboard.js'
import CustomSelect from '../components/CustomSelect.jsx'
import DebtTreemap from '../components/DebtTreemap.jsx'
import DashboardShareCard from '../components/DashboardShareCard.jsx'
import PreFv621ShareCard from '../components/PreFv621ShareCard.jsx'
import { PAGINAS_LOGIN, PAGINAS_DIRECTAS } from '../data/mockData.js'

const MES_ABBR = MESES.map((m) => m.slice(0, 3))
const ANIO_ACTUAL = new Date().getFullYear()
const ANIOS_SIRE = [ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2]
const REGIMENES = ['RER (Régimen Especial)', 'MYPE Tributario', 'Régimen General']

const ACCIONES = [
  { id: 'buzon-ejecutar', label: 'Buzón PDF', icon: '📥' },
  { id: 'validez', label: 'Validez CP', icon: '🔎' },
  { id: 'detracc', label: 'Detracciones', icon: '📊' },
  { id: 'sire', label: 'SIRE', icon: '⬇' },
]

const TIPOS_DASHBOARD = [
  { id: 'tributario', label: 'Tributario' },
  { id: 'pre-fv621', label: 'Pre FV621' },
]

function calcularCoeficiente(ingresos, impuesto) {
  const i = Number(ingresos) || 0
  const u = Number(impuesto) || 0
  if (i <= 0) return '1.5'
  return ((u / i) * 100).toFixed(4)
}

export default function DashboardScreen() {
  const { rucs, visibleRucs, groupFilter, activeRuc, setDrawerOpen, pushLog, goScreen } = useApp()

  const [tipoDashboard, setTipoDashboard] = useState('tributario')

  // ══════════════════ Dashboard TRIBUTARIO (sin cambios de lógica) ══════════════════
  const [taxRows, setTaxRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [vencCache, setVencCache] = useState({})
  const [empresaFiltro, setEmpresaFiltro] = useState(null)
  const [vistaGrafico, setVistaGrafico] = useState('tributo')
  const [compartirOpen, setCompartirOpen] = useState(false)
  const [generandoImagen, setGenerandoImagen] = useState(false)

  const shareCardRef = useRef(null)

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
    if (!empresaFiltro) return []
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

  const empresaLabel = empresaFiltro === 'Todas' ? 'Todas las empresas' : (empresas.find(([ruc]) => ruc === empresaFiltro)?.[1] || empresaFiltro)

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
    setCompartirOpen(false)
  }

  async function compartirTexto() {
    const texto = construirMensajeDashboard(empresaLabel, kpis, rowsFiltradas.slice(0, 15))
    setCompartirOpen(false)
    if (navigator.share) {
      try { await navigator.share({ title: `Estado de cuenta — ${empresaLabel}`, text: texto }) } catch {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
    }
  }

  async function compartirImagen() {
    setGenerandoImagen(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(shareCardRef.current, { scale: 2, backgroundColor: '#ffffff' })
      canvas.toBlob(async (blob) => {
        const file = new File([blob], `dashboard_${empresaFiltro === 'Todas' ? 'todas' : empresaFiltro}.png`, { type: 'image/png' })
        setCompartirOpen(false)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: `Dashboard — ${empresaLabel}`, text: empresaLabel })
            pushLog('Imagen del dashboard compartida')
          } catch {}
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = file.name
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          pushLog('Imagen del dashboard descargada — compártela manualmente por WhatsApp')
        }
        setGenerandoImagen(false)
      }, 'image/png')
    } catch (err) {
      pushLog(`✗ No se pudo generar la imagen: ${err?.message || err}`)
      setGenerandoImagen(false)
    }
  }

  function autoLogin(pagina) {
    pushLog(`Iniciando sesión — ${activeRuc?.razonSocial || '—'} → ${pagina}`)
    pushLog('Usuario y clave leídos de Google Sheets…')
    setTimeout(() => pushLog(`✓ Sesión abierta en ${pagina}`), 800)
  }

  // ══════════════════ Dashboard PRE FV621 (nuevo) ══════════════════
  const [anioFv, setAnioFv] = useState(ANIO_ACTUAL)
  const [mesFv, setMesFv] = useState(new Date().getMonth() + 1)
  const [buscandoFv, setBuscandoFv] = useState(false)
  const [archivosCompras, setArchivosCompras] = useState([])
  const [archivosVentas, setArchivosVentas] = useState([])
  const [fileIdCompras, setFileIdCompras] = useState('')
  const [fileIdVentas, setFileIdVentas] = useState('')

  const periodoFv = `${anioFv}${String(mesFv).padStart(2, '0')}`
  const periodoFvLabel = `${MESES[mesFv - 1]} ${anioFv}`

  const [regimen, setRegimen] = useState(REGIMENES[2])
  const [supero300uit, setSupero300uit] = useState(false)
  const [ingresosAnterior, setIngresosAnterior] = useState('0')
  const [impuestoAnterior, setImpuestoAnterior] = useState('0')
  const [prorrataPct, setProrrataPct] = useState('100')
  const [saldoFavorIgv, setSaldoFavorIgv] = useState('0')
  const [creditoEspecial, setCreditoEspecial] = useState('0')
  const [pagosCuentaExceso, setPagosCuentaExceso] = useState('0')

  const usaCoeficiente = regimen.startsWith('Régimen General') || (regimen.startsWith('MYPE') && supero300uit)
  const tasaRenta = regimen.startsWith('RER')
    ? '1.5'
    : regimen.startsWith('MYPE') && !supero300uit
      ? '1.0'
      : calcularCoeficiente(ingresosAnterior, impuestoAnterior)

  const [calculandoFv, setCalculandoFv] = useState(false)
  const [resultadoFv, setResultadoFv] = useState(null)
  const [generandoImagenFv, setGenerandoImagenFv] = useState(false)
  const shareCardFvRef = useRef(null)

  async function buscarArchivosFv() {
    if (!activeRuc) return
    setBuscandoFv(true)
    setResultadoFv(null)
    try {
      const res = await listarArchivosSire(activeRuc.ruc, periodoFv)
      if (!res.ok) {
        pushLog(`✗ ${res.error}`)
        setArchivosCompras([]); setArchivosVentas([])
        return
      }
      const compras = (res.archivos || []).filter((a) => a.registro === 'Compras')
      const ventas = (res.archivos || []).filter((a) => a.registro === 'Ventas')
      setArchivosCompras(compras)
      setArchivosVentas(ventas)
      setFileIdCompras(compras[0]?.file_id || '')
      setFileIdVentas(ventas[0]?.file_id || '')
      if (compras.length === 0) pushLog(`⚠ No hay ZIP de Compras para ${periodoFv} — descárgalo primero desde SIRE.`)
      if (ventas.length === 0) pushLog(`⚠ No hay ZIP de Ventas para ${periodoFv} — descárgalo primero desde SIRE.`)
    } catch (err) {
      pushLog(`✗ Error al buscar archivos: ${err?.message || err}`)
    } finally {
      setBuscandoFv(false)
    }
  }

  useEffect(() => {
    if (tipoDashboard === 'pre-fv621' && activeRuc) buscarArchivosFv()
  }, [tipoDashboard, activeRuc]) // eslint-disable-line

  async function calcularFv() {
    if (!fileIdCompras || !fileIdVentas) {
      pushLog('⚠ Falta el ZIP de Compras y/o Ventas para este periodo.')
      return
    }
    setCalculandoFv(true)
    try {
      const res = await calcularPreFv621({
        ruc: activeRuc.ruc,
        periodo: periodoFv,
        file_id_compras: fileIdCompras,
        file_id_ventas: fileIdVentas,
        regimen,
        prorrata_pct: prorrataPct,
        saldo_favor_igv: saldoFavorIgv,
        credito_especial: creditoEspecial,
        pagos_cuenta_exceso: pagosCuentaExceso,
        tasa_renta: tasaRenta,
      })
      if (!res.ok) {
        pushLog(`✗ ${res.error}`)
        return
      }
      setResultadoFv(res)
      pushLog('✓ Preliminar 621 calculado')
    } catch (err) {
      pushLog(`✗ Error al calcular: ${err?.message || err}`)
    } finally {
      setCalculandoFv(false)
    }
  }

  async function compartirImagenFv() {
    if (!resultadoFv) {
      pushLog('⚠ Calcula el preliminar antes de compartir.')
      return
    }
    setGenerandoImagenFv(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(shareCardFvRef.current, { scale: 2, backgroundColor: '#ffffff' })
      canvas.toBlob(async (blob) => {
        const file = new File([blob], `pre_fv621_${activeRuc.ruc}_${periodoFv}.png`, { type: 'image/png' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: `Pre FV621 — ${activeRuc.razonSocial}`, text: `${activeRuc.razonSocial} — ${periodoFvLabel}` })
            pushLog('Imagen del Pre FV621 compartida')
          } catch {}
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = file.name
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          pushLog('Imagen del Pre FV621 descargada — compártela manualmente por WhatsApp')
        }
        setGenerandoImagenFv(false)
      }, 'image/png')
    } catch (err) {
      pushLog(`✗ No se pudo generar la imagen: ${err?.message || err}`)
      setGenerandoImagenFv(false)
    }
  }

  function alCompartir() {
    if (tipoDashboard === 'tributario') setCompartirOpen(true)
    else compartirImagenFv()
  }

  return (
    <div className="relative flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 pt-4 pb-[130px]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-bold text-[16px] text-ink">Dashboard</h2>
        <button
          onClick={alCompartir}
          disabled={tipoDashboard === 'pre-fv621' && (generandoImagenFv || !resultadoFv)}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-white bg-azul-dark disabled:opacity-50 px-3 py-1.5 rounded-full"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v14" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {tipoDashboard === 'pre-fv621' && generandoImagenFv ? 'Generando…' : 'Compartir'}
        </button>
      </div>

      {/* ── Selector de tipo de dashboard ── */}
      <div className="flex bg-[#F1F4F8] rounded-xl p-[3px] mb-4">
        {TIPOS_DASHBOARD.map((t) => (
          <button
            key={t.id}
            onClick={() => setTipoDashboard(t.id)}
            className={`flex-1 py-2 text-[11.5px] font-semibold rounded-[9px] ${tipoDashboard === t.id ? 'bg-white text-azul-inst shadow' : 'text-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tipoDashboard === 'tributario' ? (
        <>
          <CustomSelect
            title="Filtrar por empresa"
            placeholder="Elige una empresa para comenzar…"
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

          {!loading && !empresaFiltro && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#EAF1FA] flex items-center justify-center mb-4">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0B3A60" strokeWidth="1.6">
                  <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="font-display font-bold text-[14px] text-ink mb-1.5">Elige una empresa para comenzar</div>
              <div className="text-[11.5px] text-muted max-w-[260px]">Selecciona un RUC arriba para ver su deuda pendiente, intereses generados y cronograma actualizado.</div>
            </div>
          )}

          {!loading && empresaFiltro && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
                <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5">
                  <div className="text-[9.5px] text-muted uppercase tracking-wide font-semibold mb-1">Deuda actualizada</div>
                  <div className="font-display font-extrabold text-[18px] text-ink">S/ {formatMoney(kpis.deudaTotalActualizada)}</div>
                </div>
                <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5">
                  <div className="text-[9.5px] text-muted uppercase tracking-wide font-semibold mb-1">Interés generado</div>
                  <div className="font-display font-extrabold text-[18px] text-rojo-sunat">S/ {formatMoney(kpis.totalInteres)}</div>
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
                          <td className="px-2.5 py-2 whitespace-nowrap text-right font-mono">{formatMoney(r.saldoPendiente)}</td>
                          <td className="px-2.5 py-2 whitespace-nowrap text-muted">{r.fechaVenc ? r.fechaVenc.slice(5) : '—'}{r.diasAtraso > 0 && <span className="text-rojo-sunat font-semibold"> ({r.diasAtraso}d)</span>}</td>
                          <td className="px-2.5 py-2 whitespace-nowrap text-right font-mono text-rojo-sunat">{formatMoney(r.interes)}</td>
                          <td className="px-2.5 py-2 whitespace-nowrap text-right font-mono font-semibold text-ink">{formatMoney(r.montoActualizado)}</td>
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
        </>
      ) : (
        // ══════════════════ Vista PRE FV621 ══════════════════
        <>
          {!activeRuc ? (
            <div className="text-center text-muted text-[12px] py-10">Elige un RUC arriba para comenzar.</div>
          ) : (
            <div className="space-y-3.5">
              <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-4">
                <span className="block text-[11px] font-bold mb-1.5">Periodo — {activeRuc.razonSocial}</span>
                <div className="flex gap-2 mb-3">
                  <select value={anioFv} onChange={(e) => setAnioFv(Number(e.target.value))}
                    className="flex-1 border border-bordersoft rounded-lg px-2.5 py-2 text-[12px]">
                    {ANIOS_SIRE.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <select value={mesFv} onChange={(e) => setMesFv(Number(e.target.value))}
                    className="flex-1 border border-bordersoft rounded-lg px-2.5 py-2 text-[12px]">
                    {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                  <button onClick={buscarArchivosFv} disabled={buscandoFv}
                    className="px-3.5 py-2 rounded-lg bg-azul-inst text-white text-[11.5px] font-semibold disabled:opacity-60">
                    {buscandoFv ? '…' : 'Buscar'}
                  </button>
                </div>

                <div className="text-[10.5px] text-muted mb-1">ZIP de Compras encontrado</div>
                {archivosCompras.length === 0 ? (
                  <div className="text-[11px] text-rojo-sunat mb-2.5">
                    Ninguno —{' '}
                    <button onClick={() => goScreen('sire')} className="underline font-semibold">descárgalo desde SIRE</button>
                  </div>
                ) : (
                  <select value={fileIdCompras} onChange={(e) => setFileIdCompras(e.target.value)}
                    className="w-full border border-bordersoft rounded-lg px-2.5 py-2 text-[12px] mb-2.5">
                    {archivosCompras.map((a) => (
                      <option key={a.file_id} value={a.file_id}>{a.nombre} ({a.opcion})</option>
                    ))}
                  </select>
                )}

                <div className="text-[10.5px] text-muted mb-1">ZIP de Ventas encontrado</div>
                {archivosVentas.length === 0 ? (
                  <div className="text-[11px] text-rojo-sunat">
                    Ninguno —{' '}
                    <button onClick={() => goScreen('sire')} className="underline font-semibold">descárgalo desde SIRE</button>
                  </div>
                ) : (
                  <select value={fileIdVentas} onChange={(e) => setFileIdVentas(e.target.value)}
                    className="w-full border border-bordersoft rounded-lg px-2.5 py-2 text-[12px]">
                    {archivosVentas.map((a) => (
                      <option key={a.file_id} value={a.file_id}>{a.nombre} ({a.opcion})</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-4">
                <div className="text-[12px] font-bold mb-2.5">Régimen tributario</div>
                <select value={regimen} onChange={(e) => setRegimen(e.target.value)}
                  className="w-full border border-bordersoft rounded-lg px-2.5 py-2 text-[12px] mb-3">
                  {REGIMENES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>

                {regimen.startsWith('MYPE') && (
                  <label className="flex items-center gap-2 text-[11.5px] mb-2.5">
                    <input type="checkbox" checked={supero300uit} onChange={(e) => setSupero300uit(e.target.checked)} />
                    ¿Ingresos acumulados del ejercicio ya superaron las 300 UIT?
                  </label>
                )}

                {usaCoeficiente && (
                  <div className="mb-2.5 space-y-2">
                    <div className="text-[10.5px] text-muted">Datos ANUALES del ejercicio anterior, para el coeficiente:</div>
                    <CampoNumero label="Ingresos netos del ejercicio anterior (S/)" value={ingresosAnterior} onChange={setIngresosAnterior} />
                    <CampoNumero label="Impuesto calculado del ejercicio anterior (S/)" value={impuestoAnterior} onChange={setImpuestoAnterior} />
                  </div>
                )}

                <div className="text-[11px] font-semibold text-verde mb-3">
                  Tasa de Renta aplicada: {tasaRenta}%
                </div>

                <div className="text-[12px] font-bold mb-2.5 pt-2 border-t border-[#F0F3F7]">Datos que no vienen en el ZIP</div>
                <div className="space-y-2">
                  <CampoNumero label="% de prorrata IGV (100 si no aplica)" value={prorrataPct} onChange={setProrrataPct} />
                  <CampoNumero label="Saldo a favor IGV, periodo anterior (S/)" value={saldoFavorIgv} onChange={setSaldoFavorIgv} />
                  <CampoNumero label="Crédito fiscal especial (S/)" value={creditoEspecial} onChange={setCreditoEspecial} />
                  <CampoNumero label="Pagos a cuenta Renta en exceso (S/)" value={pagosCuentaExceso} onChange={setPagosCuentaExceso} />
                </div>
              </div>

              <button
                onClick={calcularFv}
                disabled={calculandoFv || !fileIdCompras || !fileIdVentas}
                className="w-full bg-verde disabled:opacity-60 text-white text-[13px] font-bold py-3 rounded-2xl"
              >
                {calculandoFv ? 'Calculando…' : 'Calcular preliminar 621'}
              </button>

              {resultadoFv && (
                <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-4 space-y-3">
                  <div className="font-bold text-[13px]">{activeRuc.razonSocial} — {periodoFvLabel}</div>

                  <SeccionCasillas titulo="IGV VENTAS" filas={[
                    ['Ventas Netas Gravadas (Base)', '100', resultadoFv.casillas['100']],
                    ['Ventas Netas Gravadas (IGV)', '101', resultadoFv.casillas['101']],
                    ['No Gravadas', '105', resultadoFv.casillas['105']],
                    ['Exportaciones facturadas', '106', resultadoFv.casillas['106']],
                    ['TOTAL IGV VENTAS', '131', resultadoFv.casillas['131'], true],
                  ]} />

                  <SeccionCasillas titulo="IGV COMPRAS" filas={[
                    ['Destinadas a gravadas exclusiv. (Base)', '107', resultadoFv.casillas['107']],
                    ['Destinadas a gravadas exclusiv. (IGV)', '108', resultadoFv.casillas['108']],
                    ['Destinadas a gravadas y no gravadas (Base)', '110', resultadoFv.casillas['110']],
                    ['Destinadas a gravadas y no gravadas (IGV)', '111', resultadoFv.casillas['111']],
                    ['TOTAL CRÉDITO FISCAL IGV', '178', resultadoFv.casillas['178'], true],
                  ]} />

                  <SeccionCasillas titulo="RENTA" filas={[
                    ['Ingresos Netos', '301', resultadoFv.casillas['301']],
                    ['Pago a cuenta calculado', '312', resultadoFv.casillas['312']],
                    ['Tributo a pagar por Renta', '304', resultadoFv.casillas['304'], true],
                  ]} />

                  <SeccionCasillas titulo="DETERMINACIÓN IGV" filas={[
                    ['Débito fiscal', '-', resultadoFv.casillas['_debito_igv']],
                    ['Crédito fiscal', '-', resultadoFv.casillas['_credito_igv']],
                    ['Saldo a favor periodo anterior', '145', resultadoFv.casillas['145']],
                    ['Tributo a pagar (IGV)', '184', resultadoFv.casillas['184'], true],
                  ]} />

                  {resultadoFv.detracciones?.n_comprobantes > 0 && (
                    <div className="text-[10.5px] text-[#8A6D00] bg-[#FBF1DD] rounded-lg p-2.5">
                      {resultadoFv.detracciones.n_comprobantes} comprobante(s) con detracción por S/ {formatMoney(resultadoFv.detracciones.igv)} de IGV en riesgo — verificar depósito en SPOT.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="flex items-center justify-between mb-2 mt-5">
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

      {/* ── Sheet: 3 opciones de compartir (solo Tributario) ── */}
      {compartirOpen && (
        <div className="absolute inset-0 z-[85] bg-black/55 flex items-end" onClick={() => !generandoImagen && setCompartirOpen(false)}>
          <div className="w-full bg-white rounded-t-[24px] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="w-[38px] h-1 bg-[#DCE3EA] rounded mx-auto mb-4" />
            <div className="font-display font-bold text-[15px] text-ink mb-4">Compartir dashboard</div>

            <button onClick={exportarCSV} className="w-full flex items-center gap-3 text-left px-3.5 py-3.5 rounded-2xl mb-2 bg-[#F7F9FB]">
              <div className="w-10 h-10 rounded-xl bg-[#EAF1FA] text-azul-inst flex items-center justify-center text-[16px]">📄</div>
              <div>
                <div className="font-semibold text-[13px] text-ink">Descargar CSV</div>
                <div className="text-[10.5px] text-muted">Tabla completa, para abrir en Excel</div>
              </div>
            </button>

            <button onClick={compartirTexto} className="w-full flex items-center gap-3 text-left px-3.5 py-3.5 rounded-2xl mb-2 bg-[#F7F9FB]">
              <div className="w-10 h-10 rounded-xl bg-[#EAF6EF] text-verde flex items-center justify-center text-[16px]">💬</div>
              <div>
                <div className="font-semibold text-[13px] text-ink">Enviar resumen (texto)</div>
                <div className="text-[10.5px] text-muted">Mensaje de WhatsApp con los datos principales</div>
              </div>
            </button>

            <button onClick={compartirImagen} disabled={generandoImagen} className="w-full flex items-center gap-3 text-left px-3.5 py-3.5 rounded-2xl bg-[#F7F9FB] disabled:opacity-50">
              <div className="w-10 h-10 rounded-xl bg-[#FBF1DD] text-[#8A6A00] flex items-center justify-center text-[16px]">🖼</div>
              <div>
                <div className="font-semibold text-[13px] text-ink">{generandoImagen ? 'Generando imagen…' : 'Enviar dashboard (imagen)'}</div>
                <div className="text-[10.5px] text-muted">KPIs + tabla como imagen, lista para WhatsApp</div>
              </div>
            </button>

            <button onClick={() => setCompartirOpen(false)} disabled={generandoImagen} className="w-full mt-3 py-3 rounded-xl bg-[#F1F4F8] text-ink font-semibold text-[12.5px]">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Tarjetas invisibles, usadas solo para generar imágenes ── */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
        <DashboardShareCard ref={shareCardRef} empresaLabel={empresaLabel} kpis={kpis} rows={rowsFiltradas} fecha={hoy.toLocaleDateString('es-PE')} treemapData={treemapData} />
        {resultadoFv && (
          <PreFv621ShareCard
            ref={shareCardFvRef}
            empresaLabel={activeRuc?.razonSocial || ''}
            periodoLabel={periodoFvLabel}
            casillas={resultadoFv.casillas}
            detracciones={resultadoFv.detracciones}
            fecha={hoy.toLocaleDateString('es-PE')}
          />
        )}
      </div>
    </div>
  )
}

function CampoNumero({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-ink flex-1">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-24 text-right text-[12px] px-2 py-1.5 rounded-lg border border-bordersoft"
      />
    </div>
  )
}

function SeccionCasillas({ titulo, filas }) {
  return (
    <div>
      <div className="text-[10.5px] font-bold text-white bg-azul-dark rounded-md px-2 py-1 mb-1.5">{titulo}</div>
      {filas.map(([desc, num, valor, negrita], i) => (
        <div key={i} className={`flex items-center justify-between px-2 py-1.5 text-[11.5px] ${i % 2 ? 'bg-[#F7F9FB]' : ''}`}>
          <span className={negrita ? 'font-bold' : ''}>{desc} <span className="text-muted text-[9.5px]">({num})</span></span>
          <span className={`font-mono ${negrita ? 'font-bold' : ''}`}>S/ {formatMoney(Number(valor) || 0)}</span>
        </div>
      ))}
    </div>
  )
}
