import React, { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { getVencimientos } from '../services/googleSheetsApi.js'
import { proximoDiaHabil, quintoDiaHabil, toISO } from '../utils/diasHabiles.js'
import { DIGITOS_RUC, TIPOS_VENCIMIENTO, obtenerDigitoRuc } from '../utils/digitoRuc.js'
import { MESES } from '../utils/meses.js'
import { diaMes } from '../utils/formatFecha.js'
import TributoForm from '../components/TributoForm.jsx'

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

/** Botón de dígito — el dígito es lo grande/protagonista, la fecha va chica debajo. */
function DigitButton({ digito, fechaISO, estado, onClick, compact }) {
  const { dia, mes } = diaMes(fechaISO)
  return (
    <button onClick={onClick} className={`rounded-xl text-center ${compact ? 'px-1.5 py-2' : 'px-2 py-2.5'} ${COLOR_ESTADO[estado]}`}>
      <div className={`font-display font-extrabold ${compact ? 'text-[16px]' : 'text-[19px]'} leading-none`}>{digito}</div>
      <div className="text-[9px] opacity-90 mt-1">{fechaISO ? `${dia} ${mes}` : '—'}</div>
    </button>
  )
}

export default function AlertsScreen() {
  const {
    pushLog, todosLosRecordatorios, toggleRecordarTributo, editTributoDeRuc, removeTributoDeRuc,
    rucs, visibleRucs, groupFilter, setGroupFilter, availableGroups, tributos, tributosBase, addTributoToRuc,
  } = useApp()

  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [rucElegido, setRucElegido] = useState(null)
  const [editingItem, setEditingItem] = useState(null)

  const activos = todosLosRecordatorios.filter((r) => r.recordar)
  const inactivos = todosLosRecordatorios.filter((r) => !r.recordar)

  const rucsFiltrados = rucs.filter(
    (r) => r.ruc.includes(search) || r.razonSocial.toLowerCase().includes(search.toLowerCase())
  )

  function abrirPicker() { setEditingItem(null); setRucElegido(null); setSearch(''); setPickerOpen(true) }
  function abrirEdicion(item) { setPickerOpen(false); setRecordModalTipo(null); setEditingItem(item) }
  function handleAgregar(data) {
    if (!rucElegido) return
    addTributoToRuc(rucElegido.id, data)
    pushLog(`Recordatorio agregado para ${rucElegido.razonSocial}: ${data.nombre}`)
    setPickerOpen(false)
  }
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
  const [acordeonAbierto, setAcordeonAbierto] = useState('SIRE')
  const [recordModalTipo, setRecordModalTipo] = useState(null)

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

  const recordatoriosHoy = activos.filter((r) => r.fecha === hoyISO)
  const recordatoriosProx = activos.filter((r) => r.fecha === proxISO)

  const rucsBase = groupFilter === 'Todos' ? rucs : visibleRucs
  const rucsPorDigito = digitoModal && digitoModal !== '__AFP__'
    ? rucsBase.filter((r) => obtenerDigitoRuc(r) === digitoModal)
    : []

  function renderCard(r) {
    const activo = r.recordar
    return (
      <div key={`${r.rucId}-${r.id}`} className={`bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5 mb-2.5 ${activo ? '' : 'opacity-60'}`}>
        <div className="flex items-center justify-between gap-2">
          <div onClick={() => abrirEdicion(r)} className="min-w-0 flex-1 cursor-pointer">
            <div className="text-[12px] font-semibold text-ink truncate flex items-center gap-1.5">
              {r.esTarea && <span className="text-[9px] bg-[#EFE9FB] text-[#5B3FA8] font-bold px-1.5 py-[1px] rounded">TAREA</span>}
              {r.nombre}{r.tributoAsociado ? ` · ${r.tributoAsociado}` : ''}
            </div>
            <div className="text-[10.5px] text-muted mt-0.5 truncate">{r.rucNombre} · {r.rucNumero}</div>
            <div className="text-[10px] text-muted">{r.periodoMes} {r.periodoAnio} · {r.fecha} {r.hora}{r.monto ? ` · S/ ${r.monto}` : ''}</div>
          </div>
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button onClick={() => toggleRecordarTributo(r.rucId, r.id)} className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-full ${activo ? 'text-rojo-sunat bg-[#FCE9EB]' : 'text-verde bg-[#EAF6EF]'}`}>
              {activo ? 'Desactivar' : 'Reactivar'}
            </button>
            <button onClick={() => handleEliminar(r)} className="text-[10px] font-semibold px-2.5 py-1.5 rounded-full text-muted bg-[#F1F4F8]">
              🗑 Eliminar
            </button>
          </div>
        </div>
      </div>
    )
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
          <div className="text-[10.5px] text-muted leading-relaxed">
            {cuadroHoy.map((c) => `${c.tipo}${c.digitos.length ? ` (dígitos ${c.digitos.join(', ')})` : ''}`).join(' · ')}
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
          <div className="text-[10.5px] text-muted leading-relaxed">
            {cuadroProx.map((c) => `${c.tipo}${c.digitos.length ? ` (dígitos ${c.digitos.join(', ')})` : ''}`).join(' · ')}
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
          <div className="flex flex-wrap gap-1.5">
            {availableGroups.map((g) => (
              <button
                key={g}
                onClick={() => setGroupFilter(g)}
                className={`text-[10.5px] font-semibold px-3 py-1.5 rounded-full border ${groupFilter === g ? 'bg-azul-inst text-white border-azul-inst' : 'bg-white text-ink border-bordersoft'}`}
              >
                {g}
              </button>
            ))}
          </div>
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

      <div className="flex items-center justify-between mt-5 mb-2.5">
        <h2 className="font-display font-bold text-[14px] text-ink">Recordatorios activos</h2>
        <button onClick={abrirPicker} className="text-[11px] font-semibold text-azul-inst bg-[#E7EEF7] px-2.5 py-1.5 rounded-full">
          ＋ Agregar recordatorio
        </button>
      </div>
      {activos.length === 0 && <div className="text-center text-muted text-[12px] py-4">Sin recordatorios activos.</div>}
      {activos.map(renderCard)}

      <h2 className="font-display font-bold text-[14px] text-ink mt-5 mb-2.5">Recordatorios desactivados</h2>
      {inactivos.length === 0 && <div className="text-center text-muted text-[12px] py-4">Sin recordatorios desactivados.</div>}
      {inactivos.map(renderCard)}

      {recordModalTipo && (
        <div className="absolute inset-0 z-[60] bg-black/50 flex items-end" onClick={() => setRecordModalTipo(null)}>
          <div className="w-full bg-white rounded-t-2xl p-5 max-h-[80%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-[38px] h-1 bg-[#DCE3EA] rounded mx-auto mb-4" />
            <div className="font-display font-bold text-[14px] mb-3">
              Recordatorios — {recordModalTipo === 'hoy' ? 'vence hoy' : 'próximo día hábil'}
            </div>
            {(recordModalTipo === 'hoy' ? recordatoriosHoy : recordatoriosProx).map((r) => (
              <div key={`${r.rucId}-${r.id}`} onClick={() => abrirEdicion(r)} className="py-2.5 border-b border-[#F4F6F9] cursor-pointer">
                <div className="text-[12px] font-semibold">{r.nombre}{r.tributoAsociado ? ` · ${r.tributoAsociado}` : ''}</div>
                <div className="text-[10.5px] text-muted">{r.rucNombre} · {r.rucNumero}</div>
                <div className="text-[10px] text-muted">{r.hora}{r.monto ? ` · S/ ${r.monto}` : ''}</div>
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
              <div key={r.id} className="py-2.5 border-b border-[#F4F6F9]">
                <div className="text-[12px] font-semibold">{r.razonSocial}</div>
                <div className="font-mono text-[10.5px] text-muted">{r.ruc}</div>
              </div>
            ))}
            {digitoModal !== '__AFP__' && rucsPorDigito.length === 0 && (
              <div className="text-center text-muted text-[12px] py-4">Ningún RUC con este dígito en el grupo seleccionado.</div>
            )}
            <button onClick={() => setDigitoModal(null)} className="w-full mt-4 py-3 rounded-xl bg-[#F1F4F8] text-ink font-semibold text-[12.5px]">Cerrar</button>
          </div>
        </div>
      )}

      {/* ── Ventana general: acordeón vertical (un bloque por tipo, cronograma completo) ── */}
      {tablaModalOpen && (
        <div className="absolute inset-0 z-[60] bg-black/50 flex items-end" onClick={() => setTablaModalOpen(false)}>
          <div className="w-full bg-white rounded-t-2xl p-4 max-h-[88%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-[38px] h-1 bg-[#DCE3EA] rounded mx-auto mb-3" />
            <div className="font-display font-bold text-[14px] mb-1">Cronograma completo</div>
            <div className="text-[11px] text-muted mb-3">{mesSel} {anioSel}</div>

            {TIPOS_VENCIMIENTO.map((tipo) => {
              const abierto = acordeonAbierto === tipo
              return (
                <div key={tipo} className="mb-2.5 border border-bordersoft rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setAcordeonAbierto(abierto ? null : tipo)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[#F7F9FB]"
                  >
                    <span className="font-semibold text-[12.5px] text-ink">{tipo}</span>
                    <span className="text-muted text-[12px]">{abierto ? '▾' : '▸'}</span>
                  </button>
                  {abierto && (
                    <div className="p-3 grid grid-cols-4 gap-2">
                      {DIGITOS_RUC.map((d) => (
                        <DigitButton
                          key={d}
                          digito={d}
                          fechaISO={vencData[tipo]?.[d]}
                          estado={estadoDigito(vencData[tipo]?.[d], hoyISO, proxISO)}
                          onClick={() => { setTablaModalOpen(false); setDigitoModal(d) }}
                          compact
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            <div className="border border-bordersoft rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-[#F7F9FB]">
                <span className="font-semibold text-[12.5px] text-ink">AFPnet (todos los RUCs)</span>
                <button
                  onClick={() => { setTablaModalOpen(false); setDigitoModal('__AFP__') }}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-lg ${COLOR_ESTADO[estadoDigito(fechaAfpISO, hoyISO, proxISO)]}`}
                >
                  {fechaAfp.toLocaleDateString('es-PE')}
                </button>
              </div>
            </div>

            <button onClick={() => setTablaModalOpen(false)} className="w-full mt-4 py-3 rounded-xl bg-[#F1F4F8] text-ink font-semibold text-[12.5px]">Cerrar</button>
          </div>
        </div>
      )}

      {pickerOpen && (
        <div className="absolute inset-0 z-[60] bg-black/50 flex items-end" onClick={() => setPickerOpen(false)}>
          <div className="w-full bg-white rounded-t-2xl p-5 max-h-[80%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-[38px] h-1 bg-[#DCE3EA] rounded mx-auto mb-4" />
            {!rucElegido ? (
              <>
                <div className="font-display font-bold text-[14px] mb-3">Elige un RUC</div>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar RUC o razón social…" className="w-full mb-3 rounded-[10px] border border-bordersoft px-3 py-2.5 text-[12px]" />
                {rucsFiltrados.map((r) => (
                  <div key={r.id} onClick={() => setRucElegido(r)} className="py-2.5 border-b border-[#F4F6F9] cursor-pointer">
                    <div className="text-[12px] font-semibold">{r.razonSocial}</div>
                    <div className="font-mono text-[10.5px] text-muted">{r.ruc}</div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="font-display font-bold text-[14px] mb-1">{rucElegido.razonSocial}</div>
                <div className="font-mono text-[11px] text-muted mb-3">{rucElegido.ruc}</div>
                <TributoForm tributos={tributos} tributosBase={tributosBase} onSubmit={handleAgregar} onCancel={() => setRucElegido(null)} />
              </>
            )}
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