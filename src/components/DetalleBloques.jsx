import React from 'react'

// Detalle de cada consulta a SUNAT (bloques de hasta 30 días) y registro técnico.
// Sirve para saber, bloque por bloque, qué pasó: datos, sin registros, o un problema.
//   bloques: [{ rango, estado, filas, nota }]    log: ['línea', ...]
const ESTILO = {
  ok: { texto: 'Con datos', clase: 'bg-[#EAF6EF] text-verde' },
  vacio: { texto: 'Sin registros', clase: 'bg-[#F1F4F8] text-muted' },
  dudoso: { texto: 'No confirmado', clase: 'bg-[#FFF6DB] text-[#8A6A00]' },
  error: { texto: 'Error', clase: 'bg-[#FCE9EB] text-rojo-sunat' },
  cancelado: { texto: 'Cancelado', clase: 'bg-[#F1F4F8] text-muted' },
  pendiente: { texto: 'Pendiente', clase: 'bg-[#EAF1FA] text-azul-inst' },
}

export default function DetalleBloques({ bloques, log, terminado }) {
  if (!bloques || bloques.length === 0) return null
  const problemas = bloques.filter((b) => b.estado === 'dudoso' || b.estado === 'error')

  return (
    <div className="flex flex-col gap-3 mb-3">
      {terminado && problemas.length > 0 && (
        <div className="bg-[#FCE9EB] text-rojo-sunat text-[11.5px] rounded-xl px-3 py-2.5">
          <div className="font-bold mb-1">
            {problemas.length} consulta(s) con problema: sus datos pueden faltar en la tabla. Vuelve a consultar esos rangos.
          </div>
          <ul className="list-disc pl-4">
            {problemas.map((b) => (
              <li key={b.rango}><span className="font-semibold">{b.rango}:</span> {b.nota || 'sin detalle'}</li>
            ))}
          </ul>
        </div>
      )}

      <details open={problemas.length > 0 || !terminado} className="bg-white rounded-xl border border-[#F0F3F7] shadow-card px-3.5 py-3">
        <summary className="text-[12px] font-bold text-ink cursor-pointer">
          Detalle por consulta ({bloques.length}) {problemas.length > 0 && <span className="text-rojo-sunat font-semibold">· {problemas.length} con problema</span>}
        </summary>
        <div className="overflow-x-auto mt-2.5 border border-bordersoft rounded-xl">
          <table className="w-full border-collapse text-[11.5px]">
            <thead>
              <tr className="bg-[#F7F9FB]">
                <th className="h-8 px-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted whitespace-nowrap">Rango de pago</th>
                <th className="h-8 px-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted whitespace-nowrap">Resultado</th>
                <th className="h-8 px-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-muted whitespace-nowrap">Filas</th>
                <th className="h-8 px-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted">Nota</th>
              </tr>
            </thead>
            <tbody>
              {bloques.map((b) => {
                const e = ESTILO[b.estado] || ESTILO.pendiente
                return (
                  <tr key={b.rango} className="h-8 border-t border-[#F0F3F7]">
                    <td className="px-2.5 whitespace-nowrap text-ink">{b.rango}</td>
                    <td className="px-2.5"><span className={`inline-block text-[10.5px] font-bold px-2 py-0.5 rounded-full ${e.clase}`}>{e.texto}</span></td>
                    <td className="px-2.5 text-right tabular-nums text-ink">{b.filas ?? '—'}</td>
                    <td className="px-2.5 text-muted">{b.nota}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {log && log.length > 0 && (
          <details className="mt-2.5">
            <summary className="text-[11px] font-semibold text-azul-inst cursor-pointer">Ver registro técnico (lo que hizo el servidor)</summary>
            <pre className="mt-2 max-h-[220px] overflow-auto text-[10.5px] leading-snug bg-[#F7F9FB] border border-bordersoft rounded-lg p-2.5 whitespace-pre-wrap">{log.join('\n')}</pre>
          </details>
        )}
      </details>
    </div>
  )
}
