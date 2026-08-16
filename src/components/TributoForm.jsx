import React, { useState } from 'react'
import CustomSelect from './CustomSelect.jsx'
import CustomTimePicker from './CustomTimePicker.jsx'
import { RECURRENCIAS } from '../utils/recurrencia.js'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const PERIODOS = [...MESES, 'Anual']

export default function TributoForm({ tributos, tributosBase, onSubmit, onCancel, initial }) {
  const hoy = new Date()
  const [tipo, setTipo] = useState(initial?.esTarea ? 'tarea' : 'tributo')
  const [form, setForm] = useState({
    nombre: initial?.nombre || (initial?.esTarea ? '' : tributos[0]?.nombre || ''),
    monto: initial?.monto ?? '',
    fecha: initial?.fecha || '',
    hora: initial?.hora || '09:00',
    periodoMes: initial?.periodoMes || MESES[hoy.getMonth()],
    periodoAnio: initial?.periodoAnio || String(hoy.getFullYear()),
    tributoAsociado: initial?.tributoAsociado || (tributosBase[0]?.nombre || ''),
    recurrencia: initial?.recurrencia || 'ninguna',
  })

  const seleccionado = tipo === 'tributo' ? tributos.find((t) => t.nombre === form.nombre) : null
  const necesitaAsociado = tipo === 'tributo' && seleccionado && !seleccionado.esBase

  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }))

  function cambiarTipo(nuevoTipo) {
    setTipo(nuevoTipo)
    if (nuevoTipo === 'tributo' && !tributos.some((t) => t.nombre === form.nombre)) set('nombre', tributos[0]?.nombre || '')
    if (nuevoTipo === 'tarea' && tributos.some((t) => t.nombre === form.nombre)) set('nombre', '')
  }

  function submit() {
    if (!form.fecha) return
    if (tipo === 'tarea' && !form.nombre.trim()) return
    onSubmit({
      ...form,
      monto: form.monto === '' ? 0 : Number(form.monto),
      esTarea: tipo === 'tarea',
      tributoAsociado: necesitaAsociado ? form.tributoAsociado : '',
    })
  }

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-[#F7F9FB] border border-bordersoft rounded-xl">
      <div className="w-full flex gap-1.5">
        <button type="button" onClick={() => cambiarTipo('tributo')} className={`flex-1 text-[11.5px] font-semibold py-2 rounded-lg border ${tipo === 'tributo' ? 'bg-azul-inst text-white border-azul-inst' : 'bg-white text-ink border-bordersoft'}`}>
          Tributo
        </button>
        <button type="button" onClick={() => cambiarTipo('tarea')} className={`flex-1 text-[11.5px] font-semibold py-2 rounded-lg border ${tipo === 'tarea' ? 'bg-azul-inst text-white border-azul-inst' : 'bg-white text-ink border-bordersoft'}`}>
          Tarea / Recordatorio
        </button>
      </div>

      {tipo === 'tributo' ? (
        <CustomSelect
          value={form.nombre}
          onChange={(v) => set('nombre', v)}
          options={tributos.map((t) => t.nombre)}
          className="flex-1 min-w-[130px]"
        />
      ) : (
        <input
          type="text"
          placeholder="¿Qué necesitas recordar?"
          value={form.nombre}
          onChange={(e) => set('nombre', e.target.value)}
          className="flex-1 min-w-[130px] text-[12px] border border-bordersoft rounded-lg p-2 bg-white"
        />
      )}
      <input type="number" placeholder={tipo === 'tarea' ? 'Monto (opcional)' : 'Monto S/'} value={form.monto} onChange={(e) => set('monto', e.target.value)} className="w-28 text-[12px] border border-bordersoft rounded-lg p-2" />

      {necesitaAsociado && (
        <CustomSelect
          value={form.tributoAsociado}
          onChange={(v) => set('tributoAsociado', v)}
          options={tributosBase.map((t) => ({ value: t.nombre, label: `Asociado a: ${t.nombre}` }))}
          className="w-full"
        />
      )}

      <div className="w-full flex gap-2">
        <CustomSelect value={form.periodoMes} onChange={(v) => set('periodoMes', v)} options={PERIODOS} className="flex-1" />
        <CustomSelect
          value={form.periodoAnio}
          onChange={(v) => set('periodoAnio', v)}
          options={[hoy.getFullYear() - 1, hoy.getFullYear(), hoy.getFullYear() + 1].map((a) => String(a))}
          className="w-24"
        />
      </div>

      <input type="date" value={form.fecha} onChange={(e) => set('fecha', e.target.value)} className="flex-1 min-w-[120px] text-[12px] border border-bordersoft rounded-lg p-2" />
      <CustomTimePicker value={form.hora} onChange={(v) => set('hora', v)} className="flex-1 min-w-[100px]" />

      <div className="w-full">
        <span className="block text-[10.5px] font-semibold text-ink mb-1.5">🔁 Repetir</span>
        <CustomSelect
          value={form.recurrencia}
          onChange={(v) => set('recurrencia', v)}
          options={RECURRENCIAS.map((r) => ({ value: r.id, label: r.label }))}
          className="w-full"
        />
        {form.recurrencia !== 'ninguna' && form.fecha && (
          <div className="text-[10px] text-muted mt-1">Empieza el {form.fecha} y se repite desde ahí — como una alarma.</div>
        )}
      </div>

      <div className="w-full flex gap-2 mt-1">
        {onCancel && <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-[#F1F4F8] text-ink font-semibold text-[12.5px]">Cancelar</button>}
        <button type="button" onClick={submit} className="flex-1 py-2.5 rounded-xl bg-azul-inst text-white font-semibold text-[12.5px]">{initial ? 'Guardar cambios' : 'Agregar'}</button>
      </div>
    </div>
  )
}