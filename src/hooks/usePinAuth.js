import { useState } from 'react'

const STORAGE_KEY = 'tributaplus_pin_hash'

// Hash simple (SHA-256 vía Web Crypto, disponible en cualquier navegador
// moderno) — el PIN nunca se guarda en texto plano, ni siquiera localmente.
async function hashPin(pin) {
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