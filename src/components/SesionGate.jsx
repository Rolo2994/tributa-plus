import React, { useState } from 'react'
import { registrarCuenta, iniciarSesion, obtenerEstadoWorkspace } from '../services/buzonApi.js'

export default function SesionGate({ children }) {
  const [conectado] = useState(() => !!localStorage.getItem('ezwork_workspace_id'))
  const [modo, setModo] = useState('login')
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function entrar() {
    setError('')
    if (!correo.trim() || !clave.trim()) {
      setError('Completa correo y clave.')
      return
    }
    setCargando(true)
    try {
      const fn = modo === 'login' ? iniciarSesion : registrarCuenta
      const res = await fn(correo.trim(), clave.trim())
      if (!res.ok) {
        setError(res.error || 'No se pudo continuar.')
        setCargando(false)
        return
      }
      localStorage.setItem('ezwork_workspace_id', res.workspace_id)
      localStorage.setItem('ezwork_correo', correo.trim())
      const estado = await obtenerEstadoWorkspace(res.workspace_id)
      if (estado.ok && estado.apps_script_url) {
        localStorage.setItem('ezwork_apps_script_url', estado.apps_script_url)
      } else {
        localStorage.removeItem('ezwork_apps_script_url')
      }
      window.location.reload()
    } catch (err) {
      setError(err?.message || String(err))
      setCargando(false)
    }
  }

  if (conectado) return children

  return (
    <div className="fixed inset-0 z-[200] bg-azul-dark flex items-center justify-center p-6">
      <div className="w-full max-w-[340px] bg-white rounded-2xl p-5">
        <div className="font-display font-extrabold text-[18px] text-ink mb-1">
          Tributa<span className="text-[#FF6B7F]">+</span>
        </div>
        <div className="text-[12px] text-muted mb-4">
          {modo === 'login' ? 'Inicia sesión en tu cuenta' : 'Crea tu cuenta'}
        </div>

        <input
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="tu@correo.com"
          className="w-full text-[13px] px-3 py-2.5 rounded-xl border border-gray-200 mb-2.5"
        />
        <input
          type="password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          placeholder="Clave"
          className="w-full text-[13px] px-3 py-2.5 rounded-xl border border-gray-200 mb-2.5"
        />

        {error && (
          <div className="text-[11.5px] text-rojo-sunat bg-[#FCE9EB] px-3 py-2 rounded-lg mb-2.5">
            {error}
          </div>
        )}

        <button
          onClick={entrar}
          disabled={cargando}
          className="w-full bg-azul-dark disabled:opacity-60 text-white text-[13px] font-bold py-2.5 rounded-xl mb-2.5"
        >
          {cargando ? 'Un momento…' : modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </button>

        <button
          onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setError('') }}
          className="w-full text-[12px] text-azul-inst font-semibold py-1"
        >
          {modo === 'login' ? '¿No tienes cuenta? Crear una' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
    </div>
  )
}