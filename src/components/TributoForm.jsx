import React, { useState } from 'react'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

/** Formulario compartido para agregar un recordatorio — lo usan NotesSheet y AlertsScreen. */
export default function TributoForm({ tributos, tributosBase, onSubmit, onCancel }) {
  const hoy = new Date()
  const [form, setForm] = useState({
    nombre: tributos[0]?.nombre || '',
    monto: '',
    fecha: '',
    hora: '09:00',
    periodoMes: MESES[hoy.getMonth()],
    periodoAnio: String(hoy.getFullYear()),
    tributoAsociado: tributosBase[0]?.nombre || '',
  })

  const seleccionado = tributos.find((t) => t.nombre === form.nombre)
  const necesitaAsociado = seleccionado && !seleccionado.esBase

  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }))

  function submit() {
    if (!form.monto || !form.fecha) return
    onSubmit({ ...form, monto: Number(form.monto), tributoAsociado: necesitaAsociado ? form.tributoAsociado : '' })
  }

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-[#F7F9FB] border border-bordersoft rounded-xl">
      <select value={form.nombre} onChange={(e) => set('nombre', e.target.value)} className="flex-1 min-w-[130px] text-[12px] border border-bordersoft rounded-lg p-2 bg-white">
        {tributos.map((t) => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
      </select>
      <input type="number" placeholder="Monto S/" value={form.monto} onChange={(e) => set('monto', e.target.value)} className="w-24 text-[12px] border border-bordersoft rounded-lg p-2" />

      {necesitaAsociado && (
        <select value={form.tributoAsociado} onChange={(e) => set('tributoAsociado', e.target.value)} className="w-full text-[12px] border border-bordersoft rounded-lg p-2 bg-white">
          {tributosBase.map((t) => <option key={t.id} value={t.nombre}>Asociado a: {t.nombre}</option>)}
        </select>
      )}

      <div className="w-full flex gap-2">
        <select value={form.periodoMes} onChange={(e) => set('periodoMes', e.target.value)} className="flex-1 text-[12px] border border-bordersoft rounded-lg p-2 bg-white">
          {MESES.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select value={form.periodoAnio} onChange={(e) => set('periodoAnio', e.target.value)} className="w-20 text-[12px] border border-bordersoft rounded-lg p-2 bg-white">
          {[hoy.getFullYear() - 1, hoy.getFullYear(), hoy.getFullYear() + 1].map((a) => <option key={a} value={String(a)}>{a}</option>)}
        </select>
      </div>

      <input type="date" value={form.fecha} onChange={(e) => set('fecha', e.target.value)} className="flex-1 min-w-[120px] text-[12px] border border-bordersoft rounded-lg p-2" />
      <input type="time" value={form.hora} onChange={(e) => set('hora', e.target.value)} className="flex-1 min-w-[100px] text-[12px] border border-bordersoft rounded-lg p-2" />

      <div className="w-full flex gap-2 mt-1">
        {onCancel && <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-[#F1F4F8] text-ink font-semibold text-[12.5px]">Cancelar</button>}
        <button onClick={submit} className="flex-1 py-2.5 rounded-xl bg-azul-inst text-white font-semibold text-[12.5px]">Agregar</button>
      </div>
    </div>
  )
}