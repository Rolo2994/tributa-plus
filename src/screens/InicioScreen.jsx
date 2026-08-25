import React, { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { getVencimientos } from '../services/googleSheetsApi.js'
import { proximoDiaHabil, quintoDiaHabil, toISO } from '../utils/diasHabiles.js'
import { DIGITOS_RUC, TIPOS_VENCIMIENTO, obtenerDigitoRuc } from '../utils/digitoRuc.js'
import { MESES } from '../utils/meses.js'
import { diaMes } from '../utils/formatFecha.js'
import TributoForm from '../components/TributoForm.jsx'
import CustomSelect from '../components/CustomSelect.jsx'
import GroupFilterBar from '../components/GroupFilterBar.jsx'
import { PAGINAS_LOGIN, PAGINAS_DIRECTAS } from '../data/mockData.js'

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
    pushLog, todosLosRecordatorios, editTributoDeRuc, removeTributoDeRuc,
    rucs, visibleRucs, groupFilter, availableGroups, tributos, tributosBase,
    vencimientoTipo, setVencimientoTipo, activeRuc,
  } = useApp()

  const hoy = new Date()
  const mesActualIdx = hoy.getMonth()
  const mesAnteriorIdx = mesActualIdx > 0 ? mesActualIdx - 1 : 11
  const [mesSel, setMesSel] = useState(MESES[mesAnteriorIdx])
  const [anioSel, setAnioSel] = useState(String(hoy.getFullYear()))
  const tipoGrid = vencimientoTipo
  const setTipoGrid = setVencimientoTipo
  const [vencData, setVencData] = useState({ SIRE: {}, 'DJ Mensual': {}, 'DJ Anual': {} })
  const [loadingVenc, setLoadingVenc] = useState(false)
  const [digitoModal, setDigitoModal] = useState(null)
  const [tablaModalOpen, setTablaModalOpen] = useState(false)
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

  const rucsBase = groupFilter === 'Todos' ? rucs : visibleRucs
  const rucsPorDigito = digitoModal && digitoModal !== '__AFP__'
    ? rucsBase.filter((r) => obtenerDigitoRuc(r) === digitoModal)
    : []

  function abrirEdicion(item) { setEditingItem(item) }
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
    <div className="relative flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 md:px-8 pt-4 pb-[130px] md:pb-8">
      <h2 className="font-display font-bold text-[14px] text-ink mb-2.5">Cronograma — {mesSel} {anioSel}</h2>

      {/* ── Accesos rápidos compactos (login + directos) ── */}
      <div className="mb-4">
        <div className="text-[11px] font-bold text-muted uppercase tracking-wide mb-2">Accesos rápidos — {activeRuc?.razonSocial || 'elige un RUC'}</div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {PAGINAS_LOGIN.map((p) => (
            <button
              key={p.id}
              onClick={() => { pushLog(`Iniciando sesión — ${activeRuc?.razonSocial || '—'} → ${p.nombre}`); setTimeout(() => pushLog(`✓ Sesión abierta en ${p.nombre}`), 700) }}
              className="flex-shrink-0 w-[108px] bg-white rounded-xl border border-[#F0F3F7] shadow-card p-2.5 text-left"
            >
              <div className="text-[10px] font-semibold text-ink leading-tight">{p.nombre}</div>
            </button>
          ))}
          {PAGINAS_DIRECTAS.map((d) => (
            <button
              key={d.id}
              onClick={() => pushLog(`Abriendo ${d.nombre}…`)}
              className="flex-shrink-0 w-[108px] bg-[#F1F4F8] rounded-xl border border-bordersoft p-2.5 text-center"
            >
              <div className="text-[10px] font-semibold text-azul-inst leading-tight">{d.nombre}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 mb-2">
        <h2 className="font-display font-bold text-[14px] text-ink">Vencimientos por dígito</h2>
        <button onClick={() => setTablaModalOpen(true)} className="text-[11px] font-semibold text-azul-inst bg-[#E7EEF7] px-2.5 py-1.5 rounded-full">
          📅 Ver todo el cronograma
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#F0F3F7] shadow-card p-3.5 mb-2.5">
        <div className="flex gap-2 mb-2.5">
          <CustomSelect title="Mes" value={mesSel} onChange={setMesSel} options={MESES} className="flex-1" />
          <CustomSelect
            title="Año"
            value={anioSel}
            onChange={setAnioSel}
            options={[hoy.getFullYear() - 1, hoy.getFullYear(), hoy.getFullYear() + 1].map((a) => String(a))}
            className="w-24"
          />
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
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
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