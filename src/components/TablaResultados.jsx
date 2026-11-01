import React, { useMemo, useState } from 'react'
import { textoParaExcel, esColumnaNumerica, copiarTexto } from '../utils/tablaResultados.js'
import { usePaginacion } from '../utils/usePaginacion.js'
import Paginador from './Paginador.jsx'

// ── Medidas (encabezado, filtros y filas comparten la misma tabla, así siempre alinean) ──
const ALTURA_MAXIMA = 'max-h-[55vh]'
const MAX_VALORES_LISTA = 12 // columnas con pocos valores distintos usan lista desplegable

const CLASE_TH = 'h-9 px-2.5 text-[10px] font-bold uppercase tracking-wide text-muted whitespace-nowrap bg-[#F7F9FB] border-b border-bordersoft sticky top-0 z-[5]'
const CLASE_TH_FILTRO = 'h-9 px-1.5 bg-[#F7F9FB] border-b border-bordersoft sticky top-9 z-[5]'
const CLASE_CAJA_FILTRO = 'w-full h-7 text-[11.5px] normal-case font-normal text-ink px-1.5 rounded-md border border-bordersoft bg-white focus:border-azul-inst'

// Tabla de resultados: se ve en pantalla, se filtra, se pagina, se copia para Excel y se descarga.
//   columnas: ['RUC', ...]       filas: [['2010...', ...], ...]
//   onDescargar: () => void      descargando: boolean (opcional)
//   onCopiado: (texto) => void   para avisar con un mensaje (opcional)
//   colorFila: (fila) => 'aviso' | 'error' | undefined  (opcional, pinta la fila)
//   filtroExterno: { condiciones: [{ col, valor }], etiqueta }  (opcional, p. ej. un mes elegido en el resumen)
//   onQuitarFiltroExterno: () => void
//   claveTabla: nombre para recordar las "filas por página" elegidas
export default function TablaResultados({
  titulo = 'Resultado', columnas, filas, onDescargar, descargando = false, onCopiado, colorFila,
  filtroExterno, onQuitarFiltroExterno, claveTabla = 'resultados',
}) {
  const [buscar, setBuscar] = useState('')
  const [filtros, setFiltros] = useState({}) // { indiceColumna: texto o valor elegido }
  const [verFiltros, setVerFiltros] = useState(true)

  const numericas = useMemo(() => columnas.map((_, i) => esColumnaNumerica(filas, i)), [columnas, filas])

  // Columnas con pocos valores distintos (Estado, Tipo, Año, Mes…): lista desplegable en vez de texto.
  const listas = useMemo(() => columnas.map((_, i) => {
    const valores = new Set()
    for (const f of filas) {
      valores.add(String(f[i] ?? ''))
      if (valores.size > MAX_VALORES_LISTA) return null
    }
    return valores.size > 1 ? Array.from(valores).sort((a, b) => a.localeCompare(b, 'es', { numeric: true })) : null
  }), [columnas, filas])

  const visibles = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    const activos = Object.entries(filtros).filter(([, v]) => String(v).trim() !== '')
    const condiciones = filtroExterno?.condiciones || []
    if (!q && activos.length === 0 && condiciones.length === 0) return filas
    return filas.filter((f) => {
      for (const c of condiciones) if (String(f[c.col] ?? '') !== String(c.valor)) return false
      for (const [i, v] of activos) {
        const celda = String(f[i] ?? '')
        if (listas[i]) { if (celda !== v) return false } else if (!celda.toLowerCase().includes(String(v).trim().toLowerCase())) return false
      }
      if (q && !f.some((c) => String(c ?? '').toLowerCase().includes(q))) return false
      return true
    })
  }, [filas, buscar, filtros, listas, filtroExterno])

  const pag = usePaginacion(visibles.length, 50, claveTabla)
  const mostradas = visibles.slice(pag.desde, pag.hasta)
  const hayFiltros = buscar.trim() !== '' || Object.values(filtros).some((v) => String(v).trim() !== '')

  function cambiarFiltro(i, valor) {
    setFiltros((prev) => ({ ...prev, [i]: valor }))
    pag.setPagina(1)
  }

  function quitarFiltros() {
    setBuscar('')
    setFiltros({})
    pag.setPagina(1)
  }

  async function copiar(conEncabezados) {
    // Se copia lo que está filtrado (todas las páginas). Sin filtros, todo.
    const texto = textoParaExcel(columnas, visibles, conEncabezados)
    const ok = await copiarTexto(texto)
    onCopiado?.(ok
      ? `Copiado: ${visibles.length} fila(s)${conEncabezados ? ' con encabezados' : ''}. Pégalo en Excel con Ctrl+V`
      : 'No se pudo copiar. Prueba con el botón de descargar el Excel')
  }

  const FONDO = { aviso: 'bg-[#FFF6DB]', error: 'bg-[#FCE9EB]' }

  return (
    <div className="bg-white rounded-xl border border-[#F0F3F7] shadow-card p-3.5">
      <div className="flex flex-wrap items-center gap-2 mb-2.5">
        <div className="text-[12px] font-bold text-ink">{titulo}</div>
        <div className="text-[10.5px] text-muted">
          {visibles.length === filas.length ? `${filas.length} fila(s)` : `${visibles.length} de ${filas.length} fila(s)`}
        </div>
        <div className="flex-1" />
        <input
          value={buscar}
          onChange={(e) => { setBuscar(e.target.value); pag.setPagina(1) }}
          placeholder="Buscar en toda la tabla…"
          className="h-8 w-full sm:w-[210px] text-[12px] px-2.5 rounded-lg border border-bordersoft bg-white focus:border-azul-inst"
        />
        <button
          type="button"
          onClick={() => setVerFiltros((v) => !v)}
          className="h-8 text-[11.5px] font-semibold text-ink bg-white border border-bordersoft px-3 rounded-lg"
        >
          {verFiltros ? 'Ocultar filtros' : 'Filtros por columna'}
        </button>
      </div>

      {(hayFiltros || filtroExterno) && (
        <div className="flex flex-wrap items-center gap-2 mb-2.5">
          {filtroExterno && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-azul-inst bg-[#EAF1FA] border border-[#C9D6E4] rounded-full pl-2.5 pr-1.5 py-0.5">
              {filtroExterno.etiqueta}
              <button type="button" onClick={onQuitarFiltroExterno} aria-label="Quitar filtro de mes" className="w-4 h-4 rounded-full text-[10px] leading-none hover:bg-white">✕</button>
            </span>
          )}
          {hayFiltros && (
            <button type="button" onClick={quitarFiltros} className="text-[11px] font-semibold text-azul-inst underline">Quitar filtros de la tabla</button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-2.5">
        <button onClick={() => copiar(false)} disabled={visibles.length === 0} className="text-[11.5px] font-bold text-white bg-azul-inst px-3 py-1.5 rounded-lg disabled:opacity-60">
          📋 Copiar para Excel
        </button>
        <button onClick={() => copiar(true)} disabled={visibles.length === 0} className="text-[11.5px] font-semibold text-azul-inst bg-[#EAF1FA] border border-[#C9D6E4] px-3 py-1.5 rounded-lg disabled:opacity-60">
          Copiar con encabezados
        </button>
        {onDescargar && (
          <button onClick={onDescargar} disabled={descargando} className="text-[11.5px] font-semibold text-ink bg-white border border-bordersoft px-3 py-1.5 rounded-lg disabled:opacity-60">
            {descargando ? 'Descargando…' : '⬇ Descargar Excel'}
          </button>
        )}
        {(hayFiltros || filtroExterno) && <span className="text-[10.5px] text-muted">«Copiar» usa solo las filas filtradas.</span>}
      </div>

      <div className={`overflow-auto ${ALTURA_MAXIMA} border border-bordersoft rounded-xl`}>
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr>
              <th className={`${CLASE_TH} w-10 text-center`}>#</th>
              {columnas.map((c, i) => (
                <th key={c + i} className={`${CLASE_TH} ${numericas[i] ? 'text-right' : 'text-left'}`}>{c}</th>
              ))}
            </tr>
            {verFiltros && (
              <tr>
                <th className={CLASE_TH_FILTRO} />
                {columnas.map((c, i) => (
                  <th key={c + i} className={CLASE_TH_FILTRO}>
                    {listas[i] ? (
                      <select value={filtros[i] ?? ''} onChange={(e) => cambiarFiltro(i, e.target.value)} className={CLASE_CAJA_FILTRO} aria-label={`Filtrar ${c}`}>
                        <option value="">Todos</option>
                        {listas[i].map((v) => <option key={v} value={v}>{v === '' ? '(vacío)' : v}</option>)}
                      </select>
                    ) : (
                      <input
                        value={filtros[i] ?? ''}
                        onChange={(e) => cambiarFiltro(i, e.target.value)}
                        placeholder="Filtrar…"
                        className={`${CLASE_CAJA_FILTRO} min-w-[84px]`}
                        aria-label={`Filtrar ${c}`}
                      />
                    )}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {mostradas.map((f, r) => (
              <tr key={pag.desde + r} className={`h-9 border-b border-[#F0F3F7] ${FONDO[colorFila?.(f)] || (r % 2 === 0 ? 'bg-white' : 'bg-[#F7FAFF]')}`}>
                <td className="px-2 text-center text-[10.5px] text-muted">{pag.desde + r + 1}</td>
                {columnas.map((c, i) => (
                  <td key={c + i} className={`px-2.5 text-ink whitespace-nowrap ${numericas[i] ? 'text-right tabular-nums' : 'text-left'}`}>
                    {f[i]}
                  </td>
                ))}
              </tr>
            ))}
            {mostradas.length === 0 && (
              <tr><td colSpan={columnas.length + 1} className="text-center text-muted text-[11.5px] py-6">Ninguna fila cumple los filtros</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Paginador total={visibles.length} pag={pag} />
    </div>
  )
}
