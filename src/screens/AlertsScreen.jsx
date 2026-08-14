import React, { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { getVencimientos } from '../services/googleSheetsApi.js'
import { proximoDiaHabil, quintoDiaHabil, toISO } from '../utils/diasHabiles.js'
import { DIGITOS_RUC, TIPOS_VENCIMIENTO, obtenerDigitoRuc } from '../utils/digitoRuc.js'
import { MESES } from '../utils/meses.js'
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

export default function AlertsScreen() {
  const {
    pushLog, todosLosRecordatorios, toggleRecordarTributo, editTributoDeRuc, removeTributoDeRuc,
    rucs, tributos, tributosBase, addTributoToRuc,
  } = useApp()

  // ── Recordatorios manuales (ya existía) ──
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
  function abrirEdicion(item) { setPickerOpen(false); setEditingItem(item) }
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

  // ── Cronograma real (SIRE / DJ Mensual / DJ Anual / AFPnet) ──
  const hoy = new Date()
  const mesActualIdx = hoy.getMonth() // 0-indexado
  const mesAnteriorIdx = mesActualIdx > 0 ? mesActualIdx - 1 : 11
  const [mesSel, setMesSel] = useState(MESES[mesAnteriorIdx])
  const [anioSel, setAnioSel] = useState(String(hoy.getFullYear()))
  const [tipoGrid, setTipoGrid] = useState('SIRE')
  const [vencData, setVencData] = useState({ SIRE: {}, 'DJ Mensual': {}, 'DJ Anual': {} })
  const [loadingVenc, setLoadingVenc] = useState(false)
  const [digitoModal, setDigitoModal] = useState(null)
  const [tablaModalOpen, setTablaModalOpen] = useState(false)

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

  const rucsPorDigito = digitoModal
    ? rucs.filter((r) => obtenerDigitoRuc(r) === digitoModal)
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

      <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5 mb-2.5">
        <div className="font-bold text-[12.5px] mb-1 text-rojo-sunat">🔴 Vence hoy — {hoy.toLocaleDateString('es-PE')}</div>
        {cuadroHoy.length === 0 ? (
          <div className="text-[10.5px] text-muted">Nada vence hoy en el periodo seleccionado.</div>
        ) : (
          <div className="text-[10.5px] text-muted leading-relaxed">
            {cuadroHoy.map((c) => `${c.tipo}${c.digitos.length ? ` (dígitos ${c.digitos.join(', ')})` : ''}`).join(' · ')}
          </div>
        )}
      </div>
      <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5 mb-2.5">
        <div className="font-bold text-[12.5px] mb-1" style={{ color: '#D9A404' }}>🟡 Próximo día hábil — {proximoDiaHabil(hoy).toLocaleDateString('es-PE')}</div>
        {cuadroProx.length === 0 ? (
          <div className="text-[10.5px] text-muted">Nada por vencer en el periodo seleccionado.</div>
        ) : (
          <div className="text-[10.5px] text-muted leading-relaxed">
            {cuadroProx.map((c) => `${c.tipo}${c.digitos.length ? ` (dígitos ${c.digitos.join(', ')})` : ''}`).join(' · ')}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 mb-2">
        <h2 className="font-display font-bold text-[14px] text-ink">Vencimientos por dígito</h2>
        <button onClick={() => setTablaModalOpen(true)} className="text-[11px] font-semibold text-azul-inst bg-[#E7EEF7] px-2.5 py-1.5 rounded-full">
          📅 Ver tabla completa
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

        {loadingVenc ? (
          <div className="text-center text-muted text-[12px] py-4">Cargando cronograma…</div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {DIGITOS_RUC.map((d) => {
              const fecha = vencData[tipoGrid]?.[d]
              const estado = estadoDigito(fecha, hoyISO, proxISO)
              return (
                <button key={d} onClick={() => setDigitoModal(d)} className={`rounded-xl px-2 py-2.5 text-center ${COLOR_ESTADO[estado]}`}>
                  <div className="font-display font-bold text-[13px]">{d}</div>
                  <div className="text-[9px] opacity-90">{fecha ? fecha.slice(5) : '—'}</div>
                </button>
              )
            })}
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

      {/* ── Modal: RUCs de un dígito ── */}
      {digitoModal && (
        <div className="absolute inset-0 z-[60] bg-black/50 flex items-end" onClick={() => setDigitoModal(null)}>
          <div className="w-full bg-white rounded-t-2xl p-5 max-h-[80%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-[38px] h-1 bg-[#DCE3EA] rounded mx-auto mb-4" />
            <div className="font-display font-bold text-[14px] mb-3">
              {digitoModal === '__AFP__' ? 'AFPnet — todos los RUCs' : `RUCs con dígito ${digitoModal}`}
            </div>
            {(digitoModal === '__AFP__' ? rucs : rucsPorDigito).map((r) => (
              <div key={r.id} className="py-2.5 border-b border-[#F4F6F9]">
                <div className="text-[12px] font-semibold">{r.razonSocial}</div>
                <div className="font-mono text-[10.5px] text-muted">{r.ruc}</div>
              </div>
            ))}
            {digitoModal !== '__AFP__' && rucsPorDigito.length === 0 && (
              <div className="text-center text-muted text-[12px] py-4">Ningún RUC con este dígito.</div>
            )}
            <button onClick={() => setDigitoModal(null)} className="w-full mt-4 py-3 rounded-xl bg-[#F1F4F8] text-ink font-semibold text-[12.5px]">Cerrar</button>
          </div>
        </div>
      )}

      {/* ── Modal: tabla general (como la ventana flotante del launcher) ── */}
      {tablaModalOpen && (
        <div className="absolute inset-0 z-[60] bg-black/50 flex items-end" onClick={() => setTablaModalOpen(false)}>
          <div className="w-full bg-white rounded-t-2xl p-4 max-h-[85%] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-[38px] h-1 bg-[#DCE3EA] rounded mx-auto mb-3" />
            <div className="font-display font-bold text-[14px] mb-3">Cronograma — {mesSel} {anioSel}</div>
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-1 bg-azul-dark text-white sticky left-0">Tipo</th>
                  {DIGITOS_RUC.map((d) => <th key={d} className="p-1 bg-azul-dark text-white">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {TIPOS_VENCIMIENTO.map((tipo) => (
                  <tr key={tipo}>
                    <td className="p-1 font-semibold bg-[#F7F9FB] sticky left-0">{tipo}</td>
                    {DIGITOS_RUC.map((d) => {
                      const fecha = vencData[tipo]?.[d]
                      const estado = estadoDigito(fecha, hoyISO, proxISO)
                      return (
                        <td key={d} onClick={() => setDigitoModal(d)} className={`p-1 text-center cursor-pointer ${COLOR_ESTADO[estado]}`}>
                          {fecha ? fecha.slice(5) : '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                <tr>
                  <td className="p-1 font-semibold bg-[#F7F9FB] sticky left-0">AFPnet</td>
                  <td colSpan={DIGITOS_RUC.length} className={`p-1 text-center cursor-pointer ${COLOR_ESTADO[estadoDigito(fechaAfpISO, hoyISO, proxISO)]}`} onClick={() => setDigitoModal('__AFP__')}>
                    {fechaAfp.toLocaleDateString('es-PE')} (todos los RUCs)
                  </td>
                </tr>
              </tbody>
            </table>
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