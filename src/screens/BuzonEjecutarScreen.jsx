import React, { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { ejecutarBuzon, consultarEstado } from '../services/buzonApi.js'

export default function BuzonEjecutarScreen() {
  const { rucs, availableGroups, goScreen, pushLog } = useApp()
  const [modo, setModo] = useState('rucs')
  const [selected, setSelected] = useState(new Set())
  const [grupoElegido, setGrupoElegido] = useState(null)
  const [fechaDesde, setFechaDesde] = useState('')
  const [tareaId, setTareaId] = useState(null)
  const [tarea, setTarea] = useState(null)
  const [ejecutando, setEjecutando] = useState(false)
  const intervaloRef = useRef(null)

  useEffect(() => () => clearInterval(intervaloRef.current), [])

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function ejecutar() {
    if (!fechaDesde) {
      pushLog('⚠ Selecciona la fecha desde la que quieres buscar.')
      return
    }
    if (modo === 'rucs' && selected.size === 0) {
      pushLog('⚠ Selecciona al menos un RUC.')
      return
    }
    if (modo === 'grupo' && !grupoElegido) {
      pushLog('⚠ Selecciona un grupo.')
      return
    }
    setEjecutando(true)
    setTarea(null)
    try {
      const payload = {
        ...(modo === 'grupo' ? { grupo: grupoElegido } : { rucs: Array.from(selected) }),
        ...(fechaDesde ? { fechaDesde } : {}),
      }
      const res = await ejecutarBuzon(payload)
      if (!res.ok) {
        pushLog(`✗ No se pudo iniciar: ${res.error}`)
        setEjecutando(false)
        return
      }
      setTareaId(res.tarea_id)
      pushLog(`Procesando ${res.total_rucs} RUC(s)…`)
      intervaloRef.current = setInterval(async () => {
        const est = await consultarEstado(res.tarea_id)
        if (!est.ok) return
        setTarea(est)
        if (est.estado === 'completado') {
          clearInterval(intervaloRef.current)
          setEjecutando(false)
          pushLog(`✓ Completado — ${est.pdfs_subidos_drive} PDF(s) subidos a Drive`)
        }
      }, 4000)
    } catch (err) {
      pushLog(`✗ Error: ${err?.message || err}`)
      setEjecutando(false)
    }
  }

  // Solo interesa mostrar: los que fallaron, o los que sí trajeron PDF.
  // Los que corrieron bien pero sin nada que descargar, se omiten.
  const resultadosRelevantes = (tarea?.resultados || []).filter(
    (r) => r.estado === 'ERROR' || r.pdfs > 0
  )

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-1.5">
        <button onClick={() => goScreen('dashboard')} className="w-8 h-8 rounded-[9px] bg-white border border-bordersoft flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="#0B3A60" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="font-display font-bold text-[15px]">Ejecutar Buzón PDF</div>
      </div>

      <div className="px-4 pt-1">
        <button
          onClick={() => goScreen('buzon')}
          className="w-full text-[12px] font-bold text-white bg-verde py-2.5 rounded-xl mb-3"
        >
          Ver / Enviar PDFs ya descargados
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-1 pb-[110px]">
        <div className="mb-3">
          <label className="text-[11px] font-semibold text-muted block mb-1">Buscar desde (opcional)</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="w-full text-[12.5px] px-3 py-2 rounded-xl border border-bordersoft"
          />
        </div>

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setModo('rucs')}
            className={`flex-1 text-[12px] font-semibold py-2 rounded-xl border ${modo === 'rucs' ? 'bg-azul-inst text-white border-azul-inst' : 'bg-white text-ink border-bordersoft'}`}
          >
            Elegir RUCs
          </button>
          <button
            onClick={() => setModo('grupo')}
            className={`flex-1 text-[12px] font-semibold py-2 rounded-xl border ${modo === 'grupo' ? 'bg-azul-inst text-white border-azul-inst' : 'bg-white text-ink border-bordersoft'}`}
          >
            Elegir grupo
          </button>
        </div>

        {modo === 'grupo' ? (
          <div className="flex flex-col gap-2">
            {availableGroups.filter((g) => g !== 'Todos').map((g) => (
              <button
                key={g}
                onClick={() => setGrupoElegido(g)}
                className={`text-left px-3.5 py-3 rounded-xl border text-[13px] font-semibold ${grupoElegido === g ? 'bg-azul-dark text-white border-azul-dark' : 'bg-white text-ink border-bordersoft'}`}
              >
                {g}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rucs.map((r) => (
              <div
                key={r.id}
                onClick={() => toggle(r.id)}
                className="flex items-center gap-2.5 bg-white rounded-xl border border-[#F0F3F7] p-3 cursor-pointer"
              >
                <span
                  className={`w-[19px] h-[19px] rounded-md border-[1.6px] flex-shrink-0 flex items-center justify-center text-[12px] ${
                    selected.has(r.id) ? 'bg-azul-inst border-azul-inst text-white' : 'border-[#C9D6E4]'
                  }`}
                >
                  {selected.has(r.id) ? '✓' : ''}
                </span>
                <div>
                  <div className="text-[12.5px] font-semibold">{r.razonSocial}</div>
                  <div className="text-[10.5px] text-muted">{r.ruc} · {r.grupo}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tarea && (
          <div className="mt-4 bg-white rounded-xl border border-[#F0F3F7] p-3">
            <div className="text-[12px] font-bold mb-2">
              {tarea.estado === 'completado' ? '✓ Completado' : `Procesando… (${tarea.procesados}/${tarea.total})`}
            </div>

            {resultadosRelevantes.length === 0 && tarea.estado === 'completado' && (
              <div className="text-[11px] text-muted">Sin novedades: no hubo errores ni PDFs nuevos.</div>
            )}

            {resultadosRelevantes.map((r, i) => (
              <div
                key={i}
                className={`text-[11px] mb-1.5 px-2 py-1.5 rounded-lg ${r.estado === 'ERROR' ? 'bg-[#FCE9EB] text-rojo-sunat' : 'bg-[#EAF6EF] text-verde'}`}
              >
                <span className="font-semibold">{r.razon} ({r.ruc})</span> — {r.estado === 'ERROR' ? `Error: ${r.detalle}` : `${r.pdfs} PDF(s) — ${r.detalle}`}
              </div>
            ))}

            {tarea.estado === 'completado' && (
              <div className="text-[12px] font-semibold text-verde mt-1">
                {tarea.pdfs_subidos_drive} PDF(s) subidos a Drive en total
              </div>
            )}
          </div>
        )}
      </div>

      <div className="absolute left-3.5 right-3.5 bottom-3.5 z-[15]">
        <button
          onClick={ejecutar}
          disabled={ejecutando}
          className="w-full bg-azul-dark disabled:opacity-60 text-white text-[13px] font-bold py-3 rounded-2xl shadow-float"
        >
          {ejecutando ? 'Ejecutando…' : 'Ejecutar'}
        </button>
      </div>
    </div>
  )
}