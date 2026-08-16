import React, { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { getVencimientos } from '../services/googleSheetsApi.js'
import { proximoDiaHabil, quintoDiaHabil, toISO } from '../utils/diasHabiles.js'
import { DIGITOS_RUC, TIPOS_VENCIMIENTO, obtenerDigitoRuc } from '../utils/digitoRuc.js'
import { MESES } from '../utils/meses.js'
import { diaMes } from '../utils/formatFecha.js'
import TributoForm from '../components/TributoForm.jsx'
import GroupFilterBar from '../components/GroupFilterBar.jsx'
import RucCard from '../components/RucCard.jsx'

const COLOR_ESTADO = {
  hoy: 'bg-rojo-sunat text-white',
  proximo: 'bg-ambar text-white',
  vencido: 'bg-[#3A3A3A] text-white',
  futuro: 'bg-[#EAF1FA] text-azul-inst',
  sin: 'bg-[#F1F4F8] text-muted',
}

function estadoDigito(fechaISO, hoyISO, proxISO) {
  if (!fechaISO) return 'sin'
  if (fechaISO < hoyISO) return 'vencido'
  if (fechaISO === hoyISO) return 'hoy'
  if (fechaISO === proxISO) return 'proximo'
  return 'futuro'
}

function DigitButton({ digito, fechaISO, estado, onClick }) {
  const { dia, mes } = diaMes(fechaISO)
  return (
    <button onClick={onClick} className={`rounded-xl text-center px-2 py-2.5 ${COLOR_ESTADO[estado]}`}>
      <div className="font-display font-extrabold text-[19px] leading-none">{digito}</div>
      <div className="text-[9px] opacity-90 mt-1">{fechaISO ? `${dia} ${mes}` : '—'}</div>
    </button>
  )
}

export default function InicioScreen() {
  const {
    pushLog, todosLosRecordatorios, toggleRecordarTributo, editTributoDeRuc, removeTributoDeRuc,
    rucs, visibleRucs, groupFilter, setGroupFilter, availableGroups, tributos, tributosBase,
    vencimientoTipo, setVencimientoTipo, setNotesSheetRucId,
  } = useApp()

  const hoy = new Date()
  const mesActualIdx = hoy.getMonth()
  const mesAnteriorIdx = mesActualIdx > 0 ? mesActualIdx - 1 : 11
  const [mesSel, setMesSel] = useState(MESES[mesAnteriorIdx])
  const [anioSel, setAnioSel] = useState(String(hoy.getFullYear()))
  const [tipoGrid, setTipoGrid] = useState('SIRE')
  const [vencData, setVencData] = useState({ SIRE: {}, 'DJ Mensual': {}, 'DJ Anual': {} })
  const [loadingVenc, setLoadingVenc] = useState(false)
  const [digitoModal, setDigitoModal] = useState(null)
  const [tablaModalOpen, setTablaModalOpen] = useState(false)
  const [recordModalTipo, setRecordModalTipo] = useState(null)
  const [editingItem, setEditingItem] = useState(null)

  useEffect(() => {
    let cancel = false
    async function load() {
      setLoadingVenc(true)
      try {
        const [sire, mensual, anual] = await Promise.all([
          getVencimientos('SIRE', mesSel, anioSel),
          getVencimientos('DJ Mensual', mesSel, anioSel),
          getVencimientos('DJ Anual', mesSel, anioSel),
        ])
        if (cancel) return
        setVencData({
          SIRE: sire?.ok ? sire.data : {},
          'DJ Mensual': mensual?.ok ? mensual.data : {},
          'DJ Anual': anual?.ok ? anual.data : {},
        })
      } catch (err) {
        pushLog(`✗ Error cargando cronograma: ${err?.message || err}`)
      } finally {
        if (!cancel) setLoadingVenc(false)
      }
    }
    load()
    return () => { cancel = true }
  }, [mesSel, anioSel])

  const hoyISO = toISO(hoy)
  const proxISO = toISO(proximoDiaHabil(hoy))

  const fechaAfp = useMemo(() => {
    const idx = MESES.indexOf(mesSel) + 1
    const anio = Number(anioSel)
    const mesSig = idx < 12 ? idx + 1 : 1
    const anioSig = idx < 12 ? anio : anio + 1
    return quintoDiaHabil(anioSig, mesSig)
  }, [mesSel, anioSel])
  const fechaAfpISO = toISO(fechaAfp)

  const { cuadroHoy, cuadroProx } = useMemo(() => {
    const ch = [], cp = []
    TIPOS_VENCIMIENTO.forEach((tipo) => {
      const data = vencData[tipo] || {}
      const dh = DIGITOS_RUC.filter((d) => data[d] === hoyISO)
      const dp = DIGITOS_RUC.filter((d) => data[d] === proxISO)
      if (dh.length) ch.push({ tipo, digitos: dh })
      if (dp.length) cp.push({ tipo, digitos: dp })
    })
    if (fechaAfpISO === hoyISO) ch.push({ tipo: 'AFPnet', digitos: [] })
    if (fechaAfpISO === proxISO) cp.push({ tipo: 'AFPnet', digitos: [] })
    return { cuadroHoy: ch, cuadroProx: cp }
  }, [vencData, hoyISO, proxISO, fechaAfpISO])

  const activos = todosLosRecordatorios.filter((r) => r.recordar)
  const recordatoriosHoy = activos.filter((r) => r.fecha === hoyISO)
  const recordatoriosProx = activos.filter((r) => r.fecha === proxISO)

  const rucsBase = groupFilter === 'Todos' ? rucs : visibleRucs
  const rucsPorDigito = digitoModal && digitoModal !== '__AFP__'
    ? rucsBase.filter((r) => obtenerDigitoRuc(r) === digitoModal)
    : []

  function abrirEdicion(item) { setRecordModalTipo(null); setEditingItem(item) }
  function handleEditar(data) {
    if (!editingItem) return
    editTributoDeRuc(editingItem.rucId, editingItem.id, data)
    pushLog(`Recordatorio actualizado: ${data.nombre}`)
    setEditingItem(null)
  }
  function handleEliminar(item) {
    if (!window.confirm(`¿Eliminar el recordatorio "${item.nombre}" de ${item.rucNombre}?`)) return
    removeTributoDeRuc(item.rucId, item.id)
    pushLog(`Recordatorio eliminado: ${item.nombre}`)
    setEditingItem(null)
  }

  return (
    <div className="relative flex-1 overflow-y-auto px-4 pt-4 pb-[130px]">
      <h2 className="font-display font-bold text-[14px] text-ink mb-2.5">Cronograma — {mesSel} {anioSel}</h2>

      <div
        onClick={() => (cuadroHoy.length || recordatoriosHoy.length) && setRecordModalTipo('hoy')}
        className={`bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5 mb-2.5 ${(cuadroHoy.length || recordatoriosHoy.length) ? 'cursor-pointer' : ''}`}
      >
        <div className="font-bold text-[12.5px] mb-1 text-rojo-sunat">🔴 Vence hoy — {hoy.toLocaleDateString('es-PE')}</div>
        {cuadroHoy.length === 0 ? (
          <div className="text-[10.5px] text-muted">Nada vence hoy en el periodo seleccionado.</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {cuadroHoy.map((c) => (
              <span key={c.tipo} className="text-[10.5px] font-semibold bg-[#FCE9EB] text-rojo-sunat px-2.5 py-1 rounded-full">
                {c.tipo}{c.digitos.length ? ` · ${c.digitos.join(', ')}` : ''}
              </span>
            ))}
          </div>
        )}
        {recordatoriosHoy.length > 0 && (
          <div className="text-[10.5px] font-semibold text-rojo-sunat mt-1.5">＋ {recordatoriosHoy.length} recordatorio(s) creados para hoy — toca para ver</div>
        )}
      </div>

      <div
        onClick={() => (cuadroProx.length || recordatoriosProx.length) && setRecordModalTipo('prox')}
        className={`bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5 mb-2.5 ${(cuadroProx.length || recordatoriosProx.length) ? 'cursor-pointer' : ''}`}
      >
        <div className="font-bold text-[12.5px] mb-1" style={{ color: '#D9A404' }}>🟡 Próximo día hábil — {proximoDiaHabil(hoy).toLocaleDateString('es-PE')}</div>
        {cuadroProx.length === 0 ? (
          <div className="text-[10.5px] text-muted">Nada por vencer en el periodo seleccionado.</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {cuadroProx.map((c) => (
              <span key={c.tipo} className="text-[10.5px] font-semibold bg-[#FBF1DD] text-[#8A6A00] px-2.5 py-1 rounded-full">
                {c.tipo}{c.digitos.length ? ` · ${c.digitos.join(', ')}` : ''}
              </span>
            ))}
          </div>
        )}
        {recordatoriosProx.length > 0 && (
          <div className="text-[10.5px] font-semibold" style={{ color: '#8A6A00' }}>＋ {recordatoriosProx.length} recordatorio(s) creados — toca para ver</div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 mb-2">
        <h2 className="font-display font-bold text-[14px] text-ink">Vencimientos por dígito</h2>
        <button onClick={() => setTablaModalOpen(true)} className="text-[11px] font-semibold text-azul-inst bg-[#E7EEF7] px-2.5 py-1.5 rounded-full">
          📅 Ver todo el cronograma
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5 mb-2.5">
        <div className="flex gap-2 mb-2.5">
          <select value={mesSel} onChange={(e) => setMesSel(e.target.value)} className="flex-1 text-[12px] border border-bordersoft rounded-lg p-2 bg-white">
            {MESES.map((m) => <option key={m}>{m}</option>)}
          </select>
          <select value={anioSel} onChange={(e) => setAnioSel(e.target.value)} className="w-20 text-[12px] border border-bordersoft rounded-lg p-2 bg-white">
            {[hoy.getFullYear() - 1, hoy.getFullYear(), hoy.getFullYear() + 1].map((a) => <option key={a} value={String(a)}>{a}</option>)}
          </select>
        </div>
        <div className="flex bg-[#F1F4F8] rounded-[11px] p-[3px] mb-3">
          {TIPOS_VENCIMIENTO.map((t) => (
            <button key={t} onClick={() => setTipoGrid(t)} className={`flex-1 py-2 text-[11.5px] font-semibold rounded-[9px] ${tipoGrid === t ? 'bg-white text-azul-inst shadow' : 'text-muted'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="mb-3">
          <div className="text-[10.5px] font-semibold text-ink mb-1.5">Filtrar RUCs de cada dígito por grupo:</div>
          <GroupFilterBar />
        </div>

        {loadingVenc ? (
          <div className="text-center text-muted text-[12px] py-4">Cargando cronograma…</div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {DIGITOS_RUC.map((d) => (
              <DigitButton key={d} digito={d} fechaISO={vencData[tipoGrid]?.[d]} estado={estadoDigito(vencData[tipoGrid]?.[d], hoyISO, proxISO)} onClick={() => setDigitoModal(d)} />
            ))}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-[#F1F4F8] flex items-center justify-between">
          <div className="text-[11px] font-semibold text-ink">AFPnet (todos los RUCs)</div>
          <button onClick={() => setDigitoModal('__AFP__')} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg ${COLOR_ESTADO[estadoDigito(fechaAfpISO, hoyISO, proxISO)]}`}>
            {fechaAfp.toLocaleDateString('es-PE')}
          </button>
        </div>
      </div>

      {recordModalTipo && (
        <div className="absolute inset-0 z-[60] bg-black/50 flex items-end" onClick={() => setRecordModalTipo(null)}>
          <div className="w-full bg-white rounded-t-2xl p-5 max-h-[80%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-[38px] h-1 bg-[#DCE3EA] rounded mx-auto mb-4" />
            <div className="font-display font-bold text-[14px] mb-3">
              Recordatorios — {recordModalTipo === 'hoy' ? 'vence hoy' : 'próximo día hábil'}
            </div>
            {(recordModalTipo === 'hoy' ? recordatoriosHoy : recordatoriosProx).map((r) => (
              <div
                key={`${r.rucId}-${r.id}`}
                onClick={() => abrirEdicion(r)}
                className="flex items-center gap-3 bg-white rounded-2xl p-3.5 mb-2.5 border border-[#F0F3F7] shadow-card cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className={`w-9 h-9 rounded-[10px] flex-shrink-0 flex items-center justify-center font-display font-bold text-[11px] text-white ${recordModalTipo === 'hoy' ? 'bg-rojo-sunat' : 'bg-ambar'}`}>
                  {r.nombre.slice(0, 3).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold text-ink truncate flex items-center gap-1.5">
                    {r.esTarea && <span className="text-[9px] bg-[#EFE9FB] text-[#5B3FA8] font-bold px-1.5 py-[1px] rounded">TAREA</span>}
                    {r.nombre}{r.tributoAsociado ? ` · ${r.tributoAsociado}` : ''}
                  </div>
                  <div className="text-[10.5px] text-muted mt-0.5 truncate">{r.rucNombre} · {r.rucNumero}</div>
                  <div className="text-[10px] text-muted mt-0.5">{r.hora}{r.monto ? ` · S/ ${r.monto}` : ''}</div>
                </div>
                <svg className="text-[#C3CEDA] flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            ))}
            {(recordModalTipo === 'hoy' ? recordatoriosHoy : recordatoriosProx).length === 0 && (
              <div className="text-center text-muted text-[12px] py-4">Sin recordatorios para esta fecha.</div>
            )}
            <button onClick={() => setRecordModalTipo(null)} className="w-full mt-4 py-3 rounded-xl bg-[#F1F4F8] text-ink font-semibold text-[12.5px]">Cerrar</button>
          </div>
        </div>
      )}

      {digitoModal && (
        <div className="absolute inset-0 z-[60] bg-black/50 flex items-end" onClick={() => setDigitoModal(null)}>
          <div className="w-full bg-white rounded-t-2xl p-5 max-h-[80%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-[38px] h-1 bg-[#DCE3EA] rounded mx-auto mb-4" />
            <div className="font-display font-bold text-[14px] mb-1">
              {digitoModal === '__AFP__' ? 'AFPnet — todos los RUCs' : `RUCs con dígito ${digitoModal}`}
            </div>
            <div className="text-[10.5px] text-muted mb-3">Grupo: {groupFilter}</div>
            {(digitoModal === '__AFP__' ? rucsBase : rucsPorDigito).map((r) => (
              <RucCard key={r.id} ruc={r} onClick={() => { setDigitoModal(null); setNotesSheetRucId(r.id) }} />
            ))}
            {digitoModal !== '__AFP__' && rucsPorDigito.length === 0 && (
              <div className="text-center text-muted text-[12px] py-4">Ningún RUC con este dígito en el grupo seleccionado.</div>
            )}
            <button onClick={() => setDigitoModal(null)} className="w-full mt-4 py-3 rounded-xl bg-[#F1F4F8] text-ink font-semibold text-[12.5px]">Cerrar</button>
          </div>
        </div>
      )}

      {tablaModalOpen && (
        <div className="absolute inset-0 z-[60] bg-white flex flex-col">
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3.5 border-b border-bordersoft">
            <div>
              <div className="font-display font-bold text-[16px] text-ink">Cronograma completo</div>
              <div className="text-[12px] text-muted">{mesSel} {anioSel}</div>
            </div>
            <button onClick={() => setTablaModalOpen(false)} className="w-9 h-9 rounded-full bg-[#F1F4F8] text-ink flex items-center justify-center text-[16px]">
              ✕
            </button>
          </div>

          {/* Encabezado de columnas — fijo, no scrollea */}
          <div className="flex-shrink-0 px-4 pt-3">
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr>
                  <th className="w-[70px] text-center p-2 bg-azul-dark text-white rounded-l-lg text-[12px]">Dígito</th>
                  {TIPOS_VENCIMIENTO.map((t) => (
                    <th key={t} className="p-2 bg-azul-dark text-white text-center text-[12px]">
                      {t === 'DJ Mensual' ? 'Mensual' : t === 'DJ Anual' ? 'Anual' : t}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>

          {/* Filas de dígitos — esta es la única parte que scrollea */}
          <div className="flex-1 overflow-y-auto px-4">
            <table className="w-full border-collapse table-fixed">
              <tbody>
                {DIGITOS_RUC.map((d) => (
                  <tr key={d} className="border-b border-[#F1F4F8]">
                    <td className="w-[70px] p-1.5 align-middle">
                      <button
                        onClick={() => { setTablaModalOpen(false); setDigitoModal(d) }}
                        className="w-full h-14 rounded-xl bg-[#F1F4F8] text-ink font-display font-bold text-[20px] flex items-center justify-center"
                      >
                        {d}
                      </button>
                    </td>
                    {TIPOS_VENCIMIENTO.map((t) => {
                      const fechaISO = vencData[t]?.[d]
                      const { dia, mes } = diaMes(fechaISO)
                      const estado = estadoDigito(fechaISO, hoyISO, proxISO)
                      return (
                        <td key={t} className="p-1.5 align-middle">
                          <div className={`w-full h-14 rounded-xl flex flex-col items-center justify-center leading-none ${COLOR_ESTADO[estado]}`}>
                            {fechaISO ? (
                              <>
                                <span className="text-[18px] font-bold">{dia}</span>
                                <span className="text-[11px] opacity-90 mt-0.5">{mes}</span>
                              </>
                            ) : (
                              <span className="text-[14px] opacity-80">—</span>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* AFPnet — fijo abajo, no scrollea */}
          <div className="flex-shrink-0 px-4 py-3 border-t border-bordersoft">
            <button
              onClick={() => { setTablaModalOpen(false); setDigitoModal('__AFP__') }}
              className="w-full flex items-center justify-between bg-[#F7F9FB] rounded-xl px-4 py-3.5"
            >
              <span className="font-semibold text-[14px] text-ink">AFPnet (todos los RUCs)</span>
              <span className={`text-[13px] font-bold px-3 py-1.5 rounded-lg ${COLOR_ESTADO[estadoDigito(fechaAfpISO, hoyISO, proxISO)]}`}>
                {fechaAfp.toLocaleDateString('es-PE')}
              </span>
            </button>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="absolute inset-0 z-[60] bg-black/50 flex items-end" onClick={() => setEditingItem(null)}>
          <div className="w-full bg-white rounded-t-2xl p-5 max-h-[80%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-[38px] h-1 bg-[#DCE3EA] rounded mx-auto mb-4" />
            <div className="font-display font-bold text-[14px] mb-1">{editingItem.rucNombre}</div>
            <div className="font-mono text-[11px] text-muted mb-3">{editingItem.rucNumero}</div>
            <TributoForm tributos={tributos} tributosBase={tributosBase} initial={editingItem} onSubmit={handleEditar} onCancel={() => setEditingItem(null)} />
            <button onClick={() => handleEliminar(editingItem)} className="w-full mt-2.5 py-3 rounded-xl bg-[#FCE9EB] text-rojo-sunat font-semibold text-[12.5px]">
              🗑 Eliminar este recordatorio
            </button>
          </div>
        </div>
      )}
    </div>
  )
}