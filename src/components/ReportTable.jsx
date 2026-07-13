import React, { useState } from 'react'

/**
 * ReportTable
 * ─────────────────────────────────────────────────────────────
 * Tabla interactiva para reportes de SIRE y Detracciones. Por
 * defecto SOLO renderiza en pantalla — no descarga nada. La
 * descarga real (CSV) solo ocurre si el usuario toca el botón
 * "Descargar seleccionados", usando un Blob + URL.createObjectURL
 * generado en el momento (no hay archivos escondidos guardándose
 * solos en el dispositivo).
 *
 * `columns`: [{ key, label, render?(row) }]
 * `rows`: array de objetos de datos (mock o reales)
 */
export default function ReportTable({ columns, rows, filenamePrefix = 'reporte', onDownload }) {
  const [selected, setSelected] = useState(() => new Set())
  const [detailRow, setDetailRow] = useState(null)

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))))
  }

  function downloadSelected() {
    const chosen = rows.filter((r) => selected.has(r.id))
    if (chosen.length === 0) return
    const header = columns.map((c) => c.label).join(',')
    const lines = chosen.map((r) => columns.map((c) => String(r[c.key] ?? '')).join(','))
    const csv = [header, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    onDownload && onDownload(chosen)
  }

  return (
    <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-azul-dark">
        <label className="flex items-center gap-2 text-white text-[11px] font-semibold">
          <input
            type="checkbox"
            checked={rows.length > 0 && selected.size === rows.length}
            onChange={toggleAll}
            className="w-3.5 h-3.5"
          />
          {rows.length} fila(s)
        </label>
        <button
          onClick={downloadSelected}
          disabled={selected.size === 0}
          className="text-[10.5px] font-semibold text-white bg-white/10 disabled:opacity-40 px-2.5 py-1.5 rounded-md"
        >
          ⬇ Descargar seleccionados ({selected.size})
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-[#F1F5FA] text-muted text-left">
              <th className="w-8" />
              {columns.map((c) => (
                <th key={c.key} className="px-2.5 py-2 font-semibold whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.id}
                onClick={() => setDetailRow(r)}
                className={`border-t border-[#F1F4F8] cursor-pointer ${selected.has(r.id) ? 'bg-[#E9F1FB]' : i % 2 ? 'bg-[#FAFBFD]' : 'bg-white'}`}
              >
                <td className="px-2.5 py-2" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="w-3.5 h-3.5" />
                </td>
                {columns.map((c) => (
                  <td key={c.key} className="px-2.5 py-2 whitespace-nowrap text-ink">
                    {c.render ? c.render(r) : r[c.key]}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-6 text-center text-muted">
                  Sin resultados para este RUC todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detailRow && (
        <div className="absolute inset-0 z-[55] bg-black/50 flex items-end" onClick={() => setDetailRow(null)}>
          <div className="w-full bg-white rounded-t-2xl p-5 max-h-[70%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-[38px] h-1 bg-[#DCE3EA] rounded mx-auto mb-4" />
            <div className="font-display font-bold text-[14px] text-ink mb-3">Detalle de fila</div>
            {columns.map((c) => (
              <div key={c.key} className="flex justify-between py-2 border-b border-[#F1F4F8] text-[12px]">
                <span className="text-muted">{c.label}</span>
                <span className="text-ink font-medium">{c.render ? c.render(detailRow) : detailRow[c.key]}</span>
              </div>
            ))}
            <button onClick={() => setDetailRow(null)} className="w-full mt-4 py-3 rounded-xl bg-[#F1F4F8] text-ink font-semibold text-[12.5px]">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
