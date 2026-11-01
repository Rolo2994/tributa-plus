import React from 'react'
import { OPCIONES_POR_PAGINA } from '../utils/usePaginacion.js'

const CLASE_BOTON = 'h-7 min-w-[28px] px-2 text-[12px] font-semibold text-ink bg-white border border-bordersoft rounded-lg disabled:opacity-40'

// Pie de tabla: "Mostrando 1–50 de 230", filas por página y botones de página.
//   total: filas que cumplen el filtro      pag: lo que devuelve usePaginacion()
export default function Paginador({ total, pag, className = '' }) {
  const { pagina, setPagina, porPagina, setPorPagina, totalPaginas, desde, hasta } = pag
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 mt-2.5 ${className}`}>
      <div className="text-[10.5px] text-muted">
        {total === 0 ? 'Sin filas' : `Mostrando ${desde + 1}–${hasta} de ${total}`}
      </div>
      <div className="flex-1" />
      <label className="flex items-center gap-1.5 text-[10.5px] text-muted">
        Filas por página
        <select
          value={porPagina}
          onChange={(e) => setPorPagina(Number(e.target.value))}
          className="h-7 text-[12px] text-ink px-1.5 rounded-lg border border-bordersoft bg-white"
        >
          {OPCIONES_POR_PAGINA.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <div className="flex items-center gap-1">
        <button type="button" className={CLASE_BOTON} disabled={pagina <= 1} onClick={() => setPagina(1)} aria-label="Primera página">«</button>
        <button type="button" className={CLASE_BOTON} disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)} aria-label="Página anterior">‹</button>
        <span className="text-[11px] text-ink px-1.5 whitespace-nowrap">Página {pagina} de {totalPaginas}</span>
        <button type="button" className={CLASE_BOTON} disabled={pagina >= totalPaginas} onClick={() => setPagina(pagina + 1)} aria-label="Página siguiente">›</button>
        <button type="button" className={CLASE_BOTON} disabled={pagina >= totalPaginas} onClick={() => setPagina(totalPaginas)} aria-label="Última página">»</button>
      </div>
    </div>
  )
}
