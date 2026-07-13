/**
 * useWebAuthn.js
 * ─────────────────────────────────────────────────────────────
 * Desbloqueo con huella / Face ID usando la API estándar del
 * navegador: WebAuthn. Esto es real, no simulado — funciona en
 * Chrome/Safari/Edge modernos, tanto en Android como en iPhone,
 * SIEMPRE que la app se sirva por HTTPS (localhost también cuenta
 * como "seguro" para pruebas).
 *
 * IMPORTANTE — qué tan "real" es esto para producción:
 * WebAuthn está diseñado para que un SERVIDOR genere el "challenge"
 * y verifique la firma criptográfica de vuelta. Aquí, como la app
 * todavía no tiene backend propio (usa Google Sheets como base de
 * datos), el challenge se genera en el propio navegador. Esto es
 * un patrón legítimo y común para "desbloqueo de conveniencia" en
 * apps locales (el mismo enfoque que usan varios gestores de
 * contraseñas para el desbloqueo rápido del dispositivo) — el
 * sensor biométrico sigue siendo el del sistema operativo, no algo
 * simulado. Lo que NO reemplaza es una autenticación de servidor
 * para datos sensibles: para eso, cuando conectes Google Sheets,
 * la seguridad real vive en el token OAuth de Google, no aquí.
 *
 * Guarda únicamente el ID de la credencial (no biométrico, no
 * reversible) en localStorage para poder pedir la misma huella la
 * próxima vez.
 */

const STORAGE_KEY = 'tributaplus_webauthn_credential_id'
const RP_NAME = 'Tributa+'

function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer)
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlToBuffer(base64url) {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    base64url.length + ((4 - (base64url.length % 4)) % 4),
    '='
  )
  const str = atob(padded)
  const bytes = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i)
  return bytes.buffer
}

export function isWebAuthnSupported() {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential
}

export function hasRegisteredCredential() {
  return !!window.localStorage.getItem(STORAGE_KEY)
}

/** Registra la huella/Face ID en este dispositivo (una sola vez). */
export async function registerBiometric(userLabel = 'contador@tributaplus') {
  if (!isWebAuthnSupported()) throw new Error('Este navegador no soporta WebAuthn.')

  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const userId = crypto.getRandomValues(new Uint8Array(16))

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: RP_NAME },
      user: { id: userId, name: userLabel, displayName: userLabel },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // fuerza huella/Face ID del propio dispositivo
        userVerification: 'required',
      },
      timeout: 60000,
      attestation: 'none',
    },
  })

  window.localStorage.setItem(STORAGE_KEY, bufferToBase64url(credential.rawId))
  return true
}

/** Pide la huella/Face ID ya registrada para desbloquear la app. */
export async function authenticateBiometric() {
  if (!isWebAuthnSupported()) throw new Error('Este navegador no soporta WebAuthn.')
  const storedId = window.localStorage.getItem(STORAGE_KEY)
  if (!storedId) throw new Error('No hay huella registrada en este dispositivo todavía.')

  const challenge = crypto.getRandomValues(new Uint8Array(32))

  await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ id: base64urlToBuffer(storedId), type: 'public-key' }],
      userVerification: 'required',
      timeout: 60000,
    },
  })

  return true
}

export function clearBiometric() {
  window.localStorage.removeItem(STORAGE_KEY)
}
