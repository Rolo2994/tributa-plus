import React from 'react'

// Barra de búsqueda para las tablas donde se escribe/pega (comprobantes).
//   opciones: [{ valor, texto, cant }]   estado: valor elegido   visibles / total: contadores
export default function BarraFiltroTabla({
  buscar, onBuscar, estado, onEstado, opciones, visibles, total, placeholder = 'Buscar en la tabla…',
}) {
  const hayFiltro = buscar.trim() !== '' || estado !== 'todos'
  return (
    <div className="flex flex-wrap items-center gap-2 mb-2.5">
      <input
        value={buscar}
        onChange={(e) => onBuscar(e.target.value)}
        placeholder={placeholder}
        className="h-8 flex-1 min-w-[160px] sm:max-w-[260px] text-[12px] px-2.5 rounded-lg border border-bordersoft bg-white focus:border-azul-inst"
      />
      <select
        value={estado}
        onChange={(e) => onEstado(e.target.value)}
        className="h-8 text-[12px] text-ink px-2 rounded-lg border border-bordersoft bg-white"
        aria-label="Filtrar por estado"
      >
        {opciones.map((o) => <option key={o.valor} value={o.valor}>{o.texto} ({o.cant})</option>)}
      </select>
      {hayFiltro && (
        <>
          <span className="text-[10.5px] text-muted">{visibles} de {total} fila(s)</span>
          <button
            type="button"
            onClick={() => { onBuscar(''); onEstado('todos') }}
            className="text-[11px] font-semibold text-azul-inst underline"
          >
            Quitar filtros
          </button>
        </>
      )}
    </div>
  )
}
