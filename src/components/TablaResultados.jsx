import React, { useMemo, useState } from 'react'
import { textoParaExcel, esColumnaNumerica, copiarTexto } from '../utils/tablaResultados.js'

// ── Medidas (encabezado y filas comparten la misma tabla, así siempre alinean) ──
const FILAS_POR_PAGINA = 200
const ALTURA_MAXIMA = 'max-h-[55vh]'

// Tabla de resultados: se ve en pantalla, se copia para pegar en Excel y se puede descargar.
//   columnas: ['RUC', ...]       filas: [['2010...', ...], ...]
//   onDescargar: () => void      descargando: boolean (opcional)
//   onCopiado: (texto) => void   para avisar con un mensaje (opcional)
//   colorFila: (fila) => 'aviso' | 'error' | undefined  (opcional, pinta la fila)
export default function TablaResultados({
  titulo = 'Resultado', columnas, filas, onDescargar, descargando = false, onCopiado, colorFila,
}) {
  const [buscar, setBuscar] = useState('')
  const [pagina, setPagina] = useState(1)

  const numericas = useMemo(() => columnas.map((_, i) => esColumnaNumerica(filas, i)), [columnas, filas])

  const visibles = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    if (!q) return filas
    return filas.filter((f) => f.some((c) => String(c ?? '').toLowerCase().includes(q)))
  }, [filas, buscar])

  const mostradas = visibles.slice(0, pagina * FILAS_POR_PAGINA)

  async function copiar(conEncabezados) {
    // Se copia lo que se está filtrando (si no hay búsqueda, todo).
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
          onChange={(e) => { setBuscar(e.target.value); setPagina(1) }}
          placeholder="Buscar en la tabla…"
          className="h-8 w-full sm:w-[190px] text-[12px] px-2.5 rounded-lg border border-bordersoft bg-white focus:border-azul-inst"
        />
      </div>

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
      </div>

      <div className={`overflow-auto ${ALTURA_MAXIMA} border border-bordersoft rounded-xl`}>
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="sticky top-0 z-[5] bg-[#F7F9FB]">
              <th className="h-9 w-10 px-2 text-center text-[10px] font-bold uppercase tracking-wide text-muted border-b border-bordersoft">#</th>
              {columnas.map((c, i) => (
                <th key={c + i} className={`h-9 px-2.5 text-[10px] font-bold uppercase tracking-wide text-muted whitespace-nowrap border-b border-bordersoft ${numericas[i] ? 'text-right' : 'text-left'}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mostradas.map((f, r) => (
              <tr key={r} className={`h-9 border-b border-[#F0F3F7] ${FONDO[colorFila?.(f)] || (r % 2 === 0 ? 'bg-white' : 'bg-[#F7FAFF]')}`}>
                <td className="px-2 text-center text-[10.5px] text-muted">{r + 1}</td>
                {columnas.map((c, i) => (
                  <td key={c + i} className={`px-2.5 text-ink whitespace-nowrap ${numericas[i] ? 'text-right tabular-nums' : 'text-left'}`}>
                    {f[i]}
                  </td>
                ))}
              </tr>
            ))}
            {mostradas.length === 0 && (
              <tr><td colSpan={columnas.length + 1} className="text-center text-muted text-[11.5px] py-6">Sin filas para mostrar</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {mostradas.length < visibles.length && (
        <div className="flex items-center justify-between mt-2 text-[10.5px] text-muted">
          <span>Mostrando {mostradas.length} de {visibles.length}. «Copiar» y «Descargar» incluyen todas.</span>
          <button onClick={() => setPagina((p) => p + 1)} className="font-bold text-azul-inst underline">Ver más</button>
        </div>
      )}
    </div>
  )
}
