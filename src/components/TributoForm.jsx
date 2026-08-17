import React, { useState } from 'react'
import CustomSelect from './CustomSelect.jsx'
import CustomTimePicker from './CustomTimePicker.jsx'
import { RECURRENCIAS, DIAS_SEMANA } from '../utils/recurrencia.js'

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
    diasSemana: initial?.diasSemana || [],
  })

  const seleccionado = tipo === 'tributo' ? tributos.find((t) => t.nombre === form.nombre) : null
  const necesitaAsociado = tipo === 'tributo' && seleccionado && !seleccionado.esBase

  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }))

  function cambiarTipo(nuevoTipo) {
    setTipo(nuevoTipo)
    if (nuevoTipo === 'tributo' && !tributos.some((t) => t.nombre === form.nombre)) set('nombre', tributos[0]?.nombre || '')
    if (nuevoTipo === 'tarea' && tributos.some((t) => t.nombre === form.nombre)) set('nombre', '')
  }

  function cambiarRecurrencia(nueva) {
    if (nueva === 'semanal' && form.diasSemana.length === 0 && form.fecha) {
      const dow = new Date(form.fecha + 'T00:00:00').getDay()
      setForm((p) => ({ ...p, recurrencia: nueva, diasSemana: [dow] }))
    } else {
      set('recurrencia', nueva)
    }
  }

  function toggleDia(dow) {
    setForm((p) => ({
      ...p,
      diasSemana: p.diasSemana.includes(dow) ? p.diasSemana.filter((d) => d !== dow) : [...p.diasSemana, dow],
    }))
  }

  function submit() {
    if (!form.fecha) return
    if (tipo === 'tarea' && !form.nombre.trim()) return
    if (form.recurrencia === 'semanal' && form.diasSemana.length === 0) return
    onSubmit({
      ...form,
      monto: form.monto === '' ? 0 : Number(form.monto),
      esTarea: tipo === 'tarea',
      tributoAsociado: necesitaAsociado ? form.tributoAsociado : '',
      diasSemana: form.recurrencia === 'semanal' ? form.diasSemana : [],
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
          title="Elegir tributo"
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
          title="Tributo asociado"
          value={form.tributoAsociado}
          onChange={(v) => set('tributoAsociado', v)}
          options={tributosBase.map((t) => ({ value: t.nombre, label: `Asociado a: ${t.nombre}` }))}
          className="w-full"
        />
      )}

      <div className="w-full flex gap-2">
        <CustomSelect title="Mes del periodo" value={form.periodoMes} onChange={(v) => set('periodoMes', v)} options={PERIODOS} className="flex-1" />
        <CustomSelect
          title="Año"
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
          title="Repetir recordatorio"
          value={form.recurrencia}
          onChange={cambiarRecurrencia}
          options={RECURRENCIAS.map((r) => ({ value: r.id, label: r.label }))}
          className="w-full"
        />

        {form.recurrencia === 'semanal' && (
          <div className="mt-2.5">
            <div className="text-[10px] text-muted mb-1.5">¿Qué días de la semana?</div>
            <div className="flex gap-1.5">
              {DIAS_SEMANA.map((d) => {
                const activo = form.diasSemana.includes(d.dow)
                return (
                  <button
                    key={d.dow}
                    type="button"
                    onClick={() => toggleDia(d.dow)}
                    className={`w-9 h-9 rounded-full text-[12px] font-bold flex-shrink-0 ${
                      activo ? 'bg-azul-inst text-white' : 'bg-white border border-bordersoft text-muted'
                    }`}
                  >
                    {d.label}
                  </button>
                )
              })}
            </div>
            {form.diasSemana.length === 0 && (
              <div className="text-[10px] text-rojo-sunat mt-1.5">Elige al menos un día.</div>
            )}
          </div>
        )}

        {form.recurrencia !== 'ninguna' && form.recurrencia !== 'semanal' && form.fecha && (
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