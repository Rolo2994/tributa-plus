import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { cambiarClave } from '../services/buzonApi.js'

export default function CambiarClaveCard() {
  const { pushLog } = useApp()
  const [claveActual, setClaveActual] = useState('')
  const [claveNueva, setClaveNueva] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    const correo = localStorage.getItem('ezwork_correo') || ''
    if (!correo) {
      pushLog('✗ No se encontró tu correo — vuelve a iniciar sesión.')
      return
    }
    if (!claveActual.trim() || !claveNueva.trim()) {
      pushLog('⚠ Completa tu clave actual y la nueva.')
      return
    }
    setGuardando(true)
    try {
      const res = await cambiarClave(correo, claveActual.trim(), claveNueva.trim())
      if (res.ok) {
        pushLog('✓ Clave actualizada correctamente')
        setClaveActual('')
        setClaveNueva('')
      } else {
        pushLog(`✗ ${res.error}`)
      }
    } catch (err) {
      pushLog(`✗ Error: ${err?.message || err}`)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-3.5 mb-2.5 shadow-sm">
      <div className="font-bold text-[12.5px] mb-2.5">Cambiar mi contraseña</div>
      <input
        type="password"
        value={claveActual}
        onChange={(e) => setClaveActual(e.target.value)}
        placeholder="Clave actual"
        className="w-full text-[11.5px] px-3 py-2 rounded-xl border border-gray-200 mb-1.5"
      />
      <input
        type="password"
        value={claveNueva}
        onChange={(e) => setClaveNueva(e.target.value)}
        placeholder="Clave nueva (mínimo 6 caracteres)"
        className="w-full text-[11.5px] px-3 py-2 rounded-xl border border-gray-200 mb-1.5"
      />
      <button
        onClick={guardar}
        disabled={guardando}
        className="w-full bg-blue-600 disabled:opacity-60 text-white text-[11.5px] font-semibold py-2 rounded-xl"
      >
        {guardando ? 'Guardando…' : 'Cambiar contraseña'}
      </button>
    </div>
  )
}