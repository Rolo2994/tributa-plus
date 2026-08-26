import React, { useEffect, useState } from 'react'
import {
  authenticateBiometric,
  hasRegisteredCredential,
  isWebAuthnSupported,
  registerBiometric,
} from '../hooks/useWebAuthn.js'

function usePinLogic(onUnlock) {
  const [pin, setPin] = useState('')
  const [bioBusy, setBioBusy] = useState(false)
  const [bioError, setBioError] = useState('')
  const [bioLabel, setBioLabel] = useState('Usar huella / Face ID')

  useEffect(() => {
    setBioLabel(hasRegisteredCredential() ? 'Desbloquear con huella / Face ID' : 'Registrar huella / Face ID')
  }, [])

  function pressDigit(n) {
     if (pin.length >= 4) return
     const next = pin + n
     setPin(next)
     if (next.length === 4) {
       setTimeout(async () => {
           const ok = await verificarPin(next)
           if (ok) {
             onUnlock()
           } else {
             setBioError('PIN incorrecto. Intenta de nuevo.')
           }
           setPin('')
       }, 150)
     }
  }

  async function handleBiometric() {
    setBioError('')
    if (!isWebAuthnSupported()) {
      setBioError('Este navegador no soporta huella/Face ID (WebAuthn). Usa tu PIN.')
      return
    }
    setBioBusy(true)
    try {
      if (hasRegisteredCredential()) await authenticateBiometric()
      else await registerBiometric()
      onUnlock()
    } catch (err) {
      setBioError(err.message || 'No se pudo verificar la huella. Intenta de nuevo o usa tu PIN.')
    } finally {
      setBioBusy(false)
    }
  }

  return { pin, setPin, pressDigit, handleBiometric, bioBusy, bioError, bioLabel }
}

function Keypad({ pin, setPin, pressDigit, handleBiometric, bioBusy }) {
  return (
    <div className="grid grid-cols-3 gap-3.5 w-full max-w-[260px]">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
        <button key={n} onClick={() => pressDigit(String(n))} className="aspect-square rounded-full bg-white/[0.06] border border-white/10 text-white font-display text-[18px] font-semibold active:bg-white/20">
          {n}
        </button>
      ))}
      <button onClick={handleBiometric} disabled={bioBusy} className="aspect-square rounded-full flex items-center justify-center text-verde-console disabled:opacity-40">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 11v2c0 2-1 3.5-2.5 4.5M8 10a4 4 0 018 0v1.5M12 3a9 9 0 00-9 9c0 1.8.4 3 1 4M16.5 5.5A8.96 8.96 0 0121 12c0 1-.1 2-.4 3M4.5 19c1-1 1.8-2.6 2-4.3" />
        </svg>
      </button>
      <button onClick={() => pressDigit('0')} className="aspect-square rounded-full bg-white/[0.06] border border-white/10 text-white font-display text-[18px] font-semibold active:bg-white/20">0</button>
      <button onClick={() => setPin((p) => p.slice(0, -1))} className="aspect-square rounded-full bg-white/[0.06] border border-white/10 text-white text-[18px] active:bg-white/20">⌫</button>
    </div>
  )
}

export default function LockScreen({ visible, onUnlock }) {
  const logic = usePinLogic(onUnlock)
  const { pin, setPin, pressDigit, handleBiometric, bioBusy, bioError, bioLabel } = logic

  useEffect(() => { if (!visible) setPin('') }, [visible]) // eslint-disable-line

  return (
    <div
      className={`fixed inset-0 z-[500] transition-all duration-300 ${
        visible ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
      }`}
    >
      {/* ── Celular: exactamente como estaba, sin cambios ── */}
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
        <div className="text-sky-200/70 text-[11.5px] mb-7 text-center">Ingresa tu PIN o usa tu huella<br />para continuar</div>
        <div className="flex gap-3.5 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`w-[13px] h-[13px] rounded-full border-[1.6px] transition-all ${i < pin.length ? 'bg-white border-white' : 'border-[#4A709A]'}`} />
          ))}
        </div>
        <Keypad pin={pin} setPin={setPin} pressDigit={pressDigit} handleBiometric={handleBiometric} bioBusy={bioBusy} />
        <div className="mt-4 text-center text-[10.5px] text-sky-300/70 max-w-[250px]">{bioLabel}</div>
        {bioError && <div className="mt-2 text-center text-[10px] text-rojo-sunat/90 max-w-[260px]">{bioError}</div>}
      </div>

      {/* ── Escritorio: pantalla dividida, bienvenida + login ── */}
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
            <div className="font-display font-bold text-[20px] text-ink mb-1">Bienvenido de vuelta</div>
            <div className="text-muted text-[12.5px] mb-8">Ingresa tu PIN o usa tu huella para continuar</div>
            <div className="flex gap-3.5 mb-8 justify-center">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`w-[13px] h-[13px] rounded-full border-[1.6px] transition-all ${i < pin.length ? 'bg-azul-inst border-azul-inst' : 'border-[#C3CEDA]'}`} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 w-full">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button key={n} onClick={() => pressDigit(String(n))} className="aspect-square rounded-full bg-white border border-bordersoft text-ink font-display text-[17px] font-semibold shadow-sm active:bg-[#F1F4F8]">
                  {n}
                </button>
              ))}
              <button onClick={handleBiometric} disabled={bioBusy} className="aspect-square rounded-full flex items-center justify-center text-verde disabled:opacity-40">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M12 11v2c0 2-1 3.5-2.5 4.5M8 10a4 4 0 018 0v1.5M12 3a9 9 0 00-9 9c0 1.8.4 3 1 4M16.5 5.5A8.96 8.96 0 0121 12c0 1-.1 2-.4 3M4.5 19c1-1 1.8-2.6 2-4.3" />
                </svg>
              </button>
              <button onClick={() => pressDigit('0')} className="aspect-square rounded-full bg-white border border-bordersoft text-ink font-display text-[17px] font-semibold shadow-sm active:bg-[#F1F4F8]">0</button>
              <button onClick={() => setPin((p) => p.slice(0, -1))} className="aspect-square rounded-full bg-white border border-bordersoft text-ink text-[17px] shadow-sm active:bg-[#F1F4F8]">⌫</button>
            </div>
            <div className="mt-5 text-center text-[11px] text-muted">{bioLabel}</div>
            {bioError && <div className="mt-2 text-center text-[10.5px] text-rojo-sunat">{bioError}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}