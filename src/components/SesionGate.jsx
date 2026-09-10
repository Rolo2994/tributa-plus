import React, { useState } from 'react'
import { registrarCuenta, iniciarSesion, obtenerEstadoWorkspace } from '../services/buzonApi.js'

export default function SesionGate({ children }) {
  const [conectado] = useState(() => !!localStorage.getItem('ezwork_workspace_id'))
  const [paso, setPaso] = useState('correo') // 'correo' | 'clave'
  const [modo, setModo] = useState('login')
  const [correo, setCorreo] = useState('')
  const [alias, setAlias] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  function siguientePaso() {
    setError('')
    if (!correo.trim() || !correo.includes('@')) {
      setError('Ingresa un correo válido.')
      return
    }
    setPaso('clave')
  }

  async function entrar() {
    setError('')
    if (modo === 'registro' && clave.trim().length < 6) {
      setError('La clave debe tener al menos 6 caracteres.')
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
      localStorage.setItem('ezwork_alias', alias.trim() || correo.trim())
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

  const subtitulo = paso === 'correo'
    ? 'Ingresa tu correo para continuar'
    : modo === 'login' ? 'Ingresa tu clave' : 'Crea una clave (mínimo 6 caracteres)'

  return (
    <div className="fixed inset-0 z-[500]">
      {/* ── Celular ── */}
      <div className="md:hidden absolute inset-0 flex flex-col items-center justify-center px-8 bg-gradient-to-b from-azul-inst to-[#051B2E]">
        <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-3.5">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M4 21V9L12 3L20 9V21H4Z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M9 21V13H15V21" stroke="#fff" strokeWidth="1.6" />
          </svg>
        </div>
        <div className="font-display font-extrabold text-[19px] text-white mb-1">
          Tributa<span className="text-[#FF6B7F]">+</span>
        </div>
        <div className="text-sky-200/70 text-[11.5px] mb-7 text-center">{subtitulo}</div>

        <div className="w-full max-w-[280px]">
          {paso === 'correo' ? (
            <>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && siguientePaso()}
                placeholder="tu@correo.com"
                autoFocus
                className="w-full text-[13px] px-3.5 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-sky-200/50 mb-3"
              />
              {error && <div className="text-[11px] text-[#FF9AA6] text-center mb-3">{error}</div>}
              <button
                onClick={siguientePaso}
                className="w-full bg-white text-azul-dark text-[13px] font-bold py-3 rounded-xl"
              >
                Continuar
              </button>
            </>
          ) : (
            <>
              {modo === 'registro' && (
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="Tu nombre o el de tu despacho (opcional)"
                  className="w-full text-[13px] px-3.5 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-sky-200/50 mb-3"
                />
              )}
              <input
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && entrar()}
                placeholder="Tu clave"
                autoFocus={modo === 'login'}
                className="w-full text-[13px] px-3.5 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-sky-200/50 mb-3"
              />
              {error && <div className="text-[11px] text-[#FF9AA6] text-center mb-3">{error}</div>}
              <button
                onClick={entrar}
                disabled={cargando}
                className="w-full bg-white disabled:opacity-60 text-azul-dark text-[13px] font-bold py-3 rounded-xl mb-2.5"
              >
                {cargando ? 'Un momento…' : modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
              <button
                onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setError('') }}
                className="w-full text-[11.5px] text-sky-200/80 font-semibold py-1"
              >
                {modo === 'login' ? '¿No tienes cuenta? Crear una' : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
              <button
                onClick={() => { setPaso('correo'); setError('') }}
                className="w-full text-[10.5px] text-sky-200/50 font-semibold py-1 mt-1"
              >
                ← Cambiar correo
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Escritorio: mismo split-screen que LockScreen ── */}
      <div className="hidden md:flex absolute inset-0">
        <div className="w-1/2 bg-gradient-to-br from-azul-inst via-azul-dark to-[#051B2E] flex flex-col items-center justify-center px-16 relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/5" />
          <div className="absolute -bottom-32 -right-16 w-96 h-96 rounded-full bg-white/5" />
          <div className="relative z-10 text-center max-w-[380px]">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-6">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path d="M4 21V9L12 3L20 9V21H4Z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M9 21V13H15V21" stroke="#fff" strokeWidth="1.6" />
              </svg>
            </div>
            <div className="font-display font-extrabold text-[32px] text-white mb-3">
              Tributa<span className="text-[#FF6B7F]">+</span>
            </div>
            <div className="text-sky-200/80 text-[14px] leading-relaxed">
              Gestión tributaria para contadores independientes — RUCs, vencimientos, recordatorios y estado de cuenta de tus clientes, todo en un solo lugar.
            </div>
          </div>
        </div>

        <div className="w-1/2 bg-[#EEF2F7] flex flex-col items-center justify-center px-16">
          <div className="w-full max-w-[280px]">
            <div className="font-display font-bold text-[20px] text-ink mb-1">Bienvenido</div>
            <div className="text-muted text-[12.5px] mb-8">{subtitulo}</div>

            {paso === 'correo' ? (
              <>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && siguientePaso()}
                  placeholder="tu@correo.com"
                  autoFocus
                  className="w-full text-[13px] px-3.5 py-3 rounded-xl bg-white border border-bordersoft mb-3"
                />
                {error && <div className="text-[11px] text-rojo-sunat text-center mb-3">{error}</div>}
                <button
                  onClick={siguientePaso}
                  className="w-full bg-azul-dark text-white text-[13px] font-bold py-3 rounded-xl"
                >
                  Continuar
                </button>
              </>
            ) : (
              <>
                {modo === 'registro' && (
                  <input
                    type="text"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder="Tu nombre o el de tu despacho (opcional)"
                    className="w-full text-[13px] px-3.5 py-3 rounded-xl bg-white border border-bordersoft mb-3"
                  />
                )}
                <input
                  type="password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && entrar()}
                  placeholder="Tu clave"
                  autoFocus={modo === 'login'}
                  className="w-full text-[13px] px-3.5 py-3 rounded-xl bg-white border border-bordersoft mb-3"
                />
                {error && <div className="text-[11px] text-rojo-sunat text-center mb-3">{error}</div>}
                <button
                  onClick={entrar}
                  disabled={cargando}
                  className="w-full bg-azul-dark disabled:opacity-60 text-white text-[13px] font-bold py-3 rounded-xl mb-2.5"
                >
                  {cargando ? 'Un momento…' : modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                </button>
                <button
                  onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setError('') }}
                  className="w-full text-[11.5px] text-azul-inst font-semibold py-1"
                >
                  {modo === 'login' ? '¿No tienes cuenta? Crear una' : '¿Ya tienes cuenta? Inicia sesión'}
                </button>
                <button
                  onClick={() => { setPaso('correo'); setError('') }}
                  className="w-full text-[10.5px] text-muted font-semibold py-1 mt-1"
                >
                  ← Cambiar correo
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}