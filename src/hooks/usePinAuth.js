const STORAGE_KEY = 'tributaplus_pin_hash'

function cryptoDisponible() {
  return typeof crypto !== 'undefined' && crypto.subtle
}

async function hashPin(pin) {
  if (!cryptoDisponible()) {
    throw new Error('Esta función necesita una conexión segura (HTTPS). Ábrela desde tributa-plus.vercel.app, no desde una IP local.')
  }
  const data = new TextEncoder().encode(pin)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function tienePinConfigurado() {
  return !!localStorage.getItem(STORAGE_KEY)
}

export async function configurarPin(nuevoPin) {
  const hash = await hashPin(nuevoPin)
  localStorage.setItem(STORAGE_KEY, hash)
}

export async function verificarPin(pin) {
  const guardado = localStorage.getItem(STORAGE_KEY)
  if (!guardado) return true // sin PIN configurado todavía = no bloquea (primer uso)
  const hash = await hashPin(pin)
  return hash === guardado
}

export function borrarPin() {
  localStorage.removeItem(STORAGE_KEY)
}