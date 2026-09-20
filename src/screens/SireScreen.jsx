import React, { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { ejecutarSire, consultarEstado, listarArchivosSire } from '../services/sireApi.js'
import { obtenerEstadoWorkspace } from '../services/buzonApi.js'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const ANIO_ACTUAL = new Date().getFullYear()
const ANIOS = [ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2]

export default function SireScreen() {
  const { activeRuc, rucs, availableGroups, goScreen, pushLog } = useApp()

  // Antes era un solo "registro" (Compras O Ventas). Ahora es un
  // conjunto — se puede pedir Compras Y Ventas al mismo tiempo.
  const [registrosElegidos, setRegistrosElegidos] = useState(new Set(['Compras']))
  const [opcion, setOpcion] = useState('Propuesta')
  const [anio, setAnio] = useState(ANIO_ACTUAL)
  const [mesIni, setMesIni] = useState(new Date().getMonth() + 1)
  const [mesFin, setMesFin] = useState(new Date().getMonth() + 1)
  const [formato, setFormato] = useState('TXT')

  // Para quién se descarga: el RUC activo, una selección de varios, o un grupo entero.
  const [destino, setDestino] = useState('activo') // 'activo' | 'rucs' | 'grupo'
  const [rucsElegidos, setRucsElegidos] = useState(new Set())
  const [grupoElegido, setGrupoElegido] = useState(null)

  // Una tarea por cada registro pedido: { Compras: {tareaId, estado, ...}, Ventas: {...} }
  const [tareas, setTareas] = useState({})
  const [ejecutando, setEjecutando] = useState(false)
  const intervaloRef = useRef(null)

  const [archivos, setArchivos] = useState([])
  const [cargandoArchivos, setCargandoArchivos] = useState(false)
  const [driveConectado, setDriveConectado] = useState(true) // optimista mientras carga, para no parpadear

  useEffect(() => () => clearInterval(intervaloRef.current), [])

  useEffect(() => {
    const wsId = localStorage.getItem('ezwork_workspace_id')
    if (!wsId) return
    obtenerEstadoWorkspace(wsId).then((res) => {
      if (res.ok) setDriveConectado(!!res.drive_conectado)
    }).catch(() => {})
  }, [])

  async function cargarArchivos() {
    if (!activeRuc) return
    setCargandoArchivos(true)
    try {
      const res = await listarArchivosSire(activeRuc.ruc)
      if (res.ok) {
        setArchivos(res.archivos || [])
      } else {
        pushLog(`✗ ${res.error}`)
      }
    } catch (err) {
      pushLog(`✗ Error al listar archivos SIRE: ${err?.message || err}`)
    } finally {
      setCargandoArchivos(false)
    }
  }

  useEffect(() => { cargarArchivos() }, [activeRuc]) // eslint-disable-line

  const opcionesDisponibles = ['Propuesta', 'Preliminar', 'Excluidos']

  function toggleRegistro(r) {
    setRegistrosElegidos((prev) => {
      const next = new Set(prev)
      if (next.has(r)) {
        if (next.size > 1) next.delete(r) // no dejar la selección vacía
      } else {
        next.add(r)
      }
      return next
    })
  }

  function toggleRucElegido(id) {
    setRucsElegidos((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function ejecutar() {
    if (mesFin < mesIni) {
      pushLog('⚠ El mes final no puede ser anterior al mes inicial.')
      return
    }
    if (registrosElegidos.size === 0) {
      pushLog('⚠ Elige Compras y/o Ventas.')
      return
    }
    if (destino === 'rucs' && rucsElegidos.size === 0) {
      pushLog('⚠ Elige al menos un RUC.')
      return
    }
    if (destino === 'grupo' && !grupoElegido) {
      pushLog('⚠ Elige un grupo.')
      return
    }
    const periodos = []
    for (let m = mesIni; m <= mesFin; m++) periodos.push({ anio, mes: m })

    const base =
      destino === 'grupo' ? { grupo: grupoElegido }
      : destino === 'rucs' ? { rucs: Array.from(rucsElegidos) }
      : { ruc: activeRuc.ruc }

    setEjecutando(true)
    const nuevasTareas = {}

    // Se dispara una descarga por cada registro elegido — corren en
    // paralelo del lado del servidor (cada una es su propia tarea con
    // su propio tarea_id), y aquí las mostramos juntas.
    for (const registro of registrosElegidos) {
      try {
        const res = await ejecutarSire({ ...base, registro, opcion, periodos, formato })
        if (!res.ok) {
          pushLog(`✗ No se pudo iniciar ${registro}: ${res.error}`)
          continue
        }
        nuevasTareas[registro] = { tareaId: res.tarea_id, estado: 'en_cola', procesados: 0, total: res.total, resultados: [] }
        pushLog(`SIRE ${registro} — ${opcion} — procesando ${res.total_rucs || 1} RUC(s) × ${res.total_periodos} periodo(s)…`)
      } catch (err) {
        pushLog(`✗ Error al iniciar ${registro}: ${err?.message || err}`)
      }
    }

    setTareas(nuevasTareas)

    if (Object.keys(nuevasTareas).length === 0) {
      setEjecutando(false)
      return
    }

    intervaloRef.current = setInterval(async () => {
      const actual = nuevasTareas // referencia estable a las tareas activas de esta corrida
      const pendientes = Object.entries(actual).filter(([, t]) => t.estado !== 'completado')
      const resultados = await Promise.all(
        pendientes.map(async ([registro, t]) => {
          const est = await consultarEstado(t.tareaId)
          return [registro, est]
        })
      )
      setTareas((prev) => {
        const siguiente = { ...prev }
        for (const [registro, est] of resultados) {
          if (est?.ok) {
            siguiente[registro] = { ...siguiente[registro], ...est }
            actual[registro] = siguiente[registro] // mantener la referencia local sincronizada
          }
        }
        const quedanPendientes = Object.values(siguiente).some((t) => t.estado !== 'completado')
        if (!quedanPendientes) {
          clearInterval(intervaloRef.current)
          setEjecutando(false)
          pushLog('✓ Descarga(s) SIRE completada(s)')
          cargarArchivos()
        }
        return siguiente
      })
    }, 4000)
  }

  // Reintenta solo los periodos que fallaron para un registro dado —
  // no hace falta repetir la selección completa de RUCs/periodos.
  async function reintentarFallidos(registro) {
    const tarea = tareas[registro]
    if (!tarea) return
    const fallidos = (tarea.resultados || []).filter((r) => r.estado === 'ERROR')
    if (fallidos.length === 0) return

    const periodosFallidos = [...new Set(fallidos.map((r) => r.periodo))].map((p) => ({
      anio: Number(p.slice(0, 4)),
      mes: Number(p.slice(4, 6)),
    }))
    const rucsFallidos = [...new Set(fallidos.map((r) => r.ruc).filter(Boolean))]
    const base = rucsFallidos.length > 0 ? { rucs: rucsFallidos } : { ruc: activeRuc.ruc }

    setEjecutando(true)
    try {
      const res = await ejecutarSire({ ...base, registro, opcion, periodos: periodosFallidos, formato })
      if (!res.ok) {
        pushLog(`✗ No se pudo reintentar ${registro}: ${res.error}`)
        setEjecutando(false)
        return
      }
      pushLog(`Reintentando ${registro} — ${periodosFallidos.length} periodo(s) que habían fallado…`)
      const tareaNueva = { tareaId: res.tarea_id, estado: 'en_cola', procesados: 0, total: res.total, resultados: [] }
      setTareas((prev) => ({ ...prev, [registro]: tareaNueva }))

      intervaloRef.current = setInterval(async () => {
        const est = await consultarEstado(res.tarea_id)
        if (!est?.ok) return
        setTareas((prev) => ({ ...prev, [registro]: { ...prev[registro], ...est } }))
        if (est.estado === 'completado') {
          clearInterval(intervaloRef.current)
          setEjecutando(false)
          pushLog(`✓ Reintento de ${registro} completado`)
          cargarArchivos()
        }
      }, 4000)
    } catch (err) {
      pushLog(`✗ Error al reintentar ${registro}: ${err?.message || err}`)
      setEjecutando(false)
    }
  }

  if (!activeRuc) {
    return <div className="flex-1 flex items-center justify-center text-muted text-[12px]">Sincronizando…</div>
  }

  // Solo interesa mostrar: los que fallaron, o los que sí trajeron archivo.
  function resultadosRelevantes(tarea) {
    return (tarea.resultados || []).filter((r) => r.estado === 'ERROR' || r.estado === 'OK')
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-1.5">
        <button onClick={() => goScreen('dashboard')} className="w-8 h-8 rounded-[9px] bg-white border border-bordersoft flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="#0B3A60" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="font-display font-bold text-[15px]">SIRE — Compras / Ventas</div>
      </div>
      <div className="text-[11px] text-muted ml-[42px] -mt-1">RUC activo: {activeRuc.razonSocial}</div>

      {!driveConectado && (
        <div className="mx-4 mt-3 bg-[#FCE9EB] text-rojo-sunat text-[11px] rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
          <span>Tu Google Drive no está conectado — SIRE necesita subir los archivos ahí.</span>
          <button onClick={() => goScreen('settings')} className="font-bold underline whitespace-nowrap">Ir a Ajustes</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pt-3.5 pb-[130px] space-y-3.5">
        <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-4">
          <div className="mb-3.5">
            <span className="block text-[11px] font-bold mb-1.5">¿Para quién?</span>
            <div className="flex bg-[#F1F4F8] rounded-lg p-[3px]">
              {[
                { id: 'activo', label: 'RUC activo' },
                { id: 'rucs', label: 'Varios RUCs' },
                { id: 'grupo', label: 'Grupo' },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDestino(d.id)}
                  className={`flex-1 py-2 text-[11px] font-semibold rounded-[8px] ${destino === d.id ? 'bg-white text-azul-inst shadow' : 'text-muted'}`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {destino === 'rucs' && (
              <div className="mt-2.5 max-h-[180px] overflow-y-auto border border-bordersoft rounded-lg divide-y divide-[#F1F4F8]">
                {rucs.map((r) => (
                  <div key={r.id} onClick={() => toggleRucElegido(r.id)} className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer">
                    <span className={`w-[16px] h-[16px] rounded-[4px] border-[1.5px] flex-shrink-0 flex items-center justify-center text-[10px] ${
                      rucsElegidos.has(r.id) ? 'bg-azul-inst border-azul-inst text-white' : 'border-[#C9D6E4]'
                    }`}>
                      {rucsElegidos.has(r.id) ? '✓' : ''}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[11.5px] font-semibold truncate">{r.razonSocial}</div>
                      <div className="text-[10px] text-muted">{r.ruc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {destino === 'grupo' && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {availableGroups.filter((g) => g !== 'Todos').map((g) => (
                  <button
                    key={g}
                    onClick={() => setGrupoElegido(g)}
                    className={`text-[11.5px] px-3 py-1.5 rounded-lg border ${grupoElegido === g ? 'bg-azul-dark text-white border-azul-dark' : 'border-bordersoft text-ink'}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mb-3.5 pt-3 border-t border-[#F0F3F7]">
            <span className="block text-[11px] font-bold mb-1.5">Tipo de registro (puedes elegir ambos)</span>
            <div className="flex gap-1.5">
              {['Compras', 'Ventas'].map((t) => (
                <button
                  key={t}
                  onClick={() => toggleRegistro(t)}
                  className={`flex items-center gap-1.5 text-[11.5px] px-3.5 py-2 rounded-lg border ${
                    registrosElegidos.has(t) ? 'bg-azul-inst text-white border-azul-inst' : 'border-bordersoft text-ink'
                  }`}
                >
                  <span className={`w-[15px] h-[15px] rounded-[4px] border-[1.5px] flex-shrink-0 flex items-center justify-center text-[10px] ${
                    registrosElegidos.has(t) ? 'bg-white text-azul-inst border-white' : 'border-current'
                  }`}>
                    {registrosElegidos.has(t) ? '✓' : ''}
                  </span>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3.5">
            <span className="block text-[11px] font-bold mb-1.5">Opción</span>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {opcionesDisponibles.map((o) => (
                <button
                  key={o}
                  onClick={() => setOpcion(o)}
                  className={`text-[11.5px] px-3.5 py-2 rounded-lg border ${
                    opcion === o ? 'bg-azul-inst text-white border-azul-inst' : 'border-bordersoft text-ink'
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
            <div className="text-[10.5px] text-muted bg-[#F7F9FB] rounded-lg px-2.5 py-2 leading-snug">
              <b>Propuesta</b> = antes de trabajar el SIRE (la única que sirve para Pre FV621).{' '}
              <b>Preliminar</b>/<b>Excluidos</b> = después de haberlo trabajado.
            </div>
          </div>

          <div className="mb-3.5">
            <span className="block text-[11px] font-bold mb-1.5">Periodo</span>
            <div className="flex gap-2 mb-2">
              <select
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                className="flex-1 border border-bordersoft rounded-lg px-2.5 py-2 text-[12px]"
              >
                {ANIOS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex gap-2 items-center">
              <select
                value={mesIni}
                onChange={(e) => setMesIni(Number(e.target.value))}
                className="flex-1 border border-bordersoft rounded-lg px-2.5 py-2 text-[12px]"
              >
                {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <span className="text-[11px] text-muted">hasta</span>
              <select
                value={mesFin}
                onChange={(e) => setMesFin(Number(e.target.value))}
                className="flex-1 border border-bordersoft rounded-lg px-2.5 py-2 text-[12px]"
              >
                {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-1">
            <span className="block text-[11px] font-bold mb-1.5">Formato</span>
            <div className="flex gap-1.5">
              {['TXT', 'CSV'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFormato(f)}
                  className={`text-[11.5px] px-3.5 py-2 rounded-lg border ${
                    formato === f ? 'bg-azul-inst text-white border-azul-inst' : 'border-bordersoft text-ink'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {Object.entries(tareas).map(([registro, tarea]) => (
          <div key={registro} className="bg-white rounded-xl border border-[#F0F3F7] p-3">
            <div className="text-[12px] font-bold mb-2">
              {registro} — {tarea.estado === 'completado' ? '✓ Completado' : `Procesando… (${tarea.procesados}/${tarea.total})`}
            </div>
            {resultadosRelevantes(tarea).map((r, i) => (
              <div
                key={i}
                className={`text-[11px] mb-1.5 px-2 py-1.5 rounded-lg ${r.estado === 'ERROR' ? 'bg-[#FCE9EB] text-rojo-sunat' : 'bg-[#EAF6EF] text-verde'}`}
              >
                <span className="font-semibold">{r.ruc ? `${r.ruc} — ` : ''}{r.periodo} — {r.registro} {r.opcion}</span> — {r.estado === 'ERROR' ? `Error: ${r.detalle}` : r.detalle}
              </div>
            ))}
            {tarea.estado === 'completado' && tarea.resultados.some((r) => r.estado === 'ERROR') && (
              <button
                onClick={() => reintentarFallidos(registro)}
                disabled={ejecutando}
                className="w-full mt-1 text-[11px] font-semibold text-white bg-rojo-sunat disabled:opacity-60 py-2 rounded-lg"
              >
                ↻ Reintentar solo lo que falló ({tarea.resultados.filter((r) => r.estado === 'ERROR').length})
              </button>
            )}
          </div>
        ))}

        <div>
          <div className="text-[11px] font-bold text-muted uppercase tracking-wide mb-2">
            Ya descargados — {activeRuc.razonSocial}
          </div>
          {cargandoArchivos && <div className="text-[11px] text-muted py-2">Cargando…</div>}
          {!cargandoArchivos && archivos.length === 0 && (
            <div className="text-[11px] text-muted py-2">Todavía no hay descargas SIRE para este RUC.</div>
          )}
          {!cargandoArchivos && archivos.map((a) => (
            <div key={a.file_id} className="flex items-center justify-between bg-white rounded-xl border border-[#F0F3F7] p-3 mb-2">
              <div className="min-w-0">
                <div className="text-[12px] font-semibold truncate">{a.periodo} — {a.registro} ({a.opcion})</div>
                <div className="text-[10.5px] text-muted truncate">{a.nombre}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute left-3.5 right-3.5 bottom-3.5 z-[15]">
        <button
          onClick={ejecutar}
          disabled={ejecutando || !driveConectado}
          className="w-full bg-azul-dark disabled:opacity-60 text-white text-[13px] font-bold py-3 rounded-2xl shadow-float"
        >
          {!driveConectado ? 'Conecta tu Drive primero' : ejecutando ? 'Descargando…' : `⬇ Ejecutar descarga SIRE (${[...registrosElegidos].join(' + ')})`}
        </button>
      </div>
    </div>
  )
}
