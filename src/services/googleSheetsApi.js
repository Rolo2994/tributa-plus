/**
 * googleSheetsApi.js
 * ─────────────────────────────────────────────────────────────
 * Cliente para hablar con tu Google Sheet a través de un Google
 * Apps Script desplegado como "Aplicación web" (ver
 * /apps-script/Code.gs y el README para el paso a paso de despliegue).
 *
 * Por qué Apps Script y no la API de Google Sheets directamente:
 * la API oficial de Sheets requiere que el usuario inicie sesión con
 * OAuth cada vez (o que manejes tokens de servicio de forma segura,
 * lo cual no es trivial sin backend propio). Un Apps Script Web App
 * desplegado con acceso "Cualquier usuario" actúa como tu propio
 * mini-backend gratuito: vive dentro del mismo Google Sheet, no
 * necesita servidor, y no expone credenciales en el navegador.
 *
 * DETALLE TÉCNICO IMPORTANTE (para que no te encuentres con el
 * error clásico de CORS): Apps Script Web Apps no permiten
 * configurar cabeceras CORS personalizadas. Si mandas un POST con
 * "Content-Type: application/json", el navegador dispara una
 * solicitud de verificación (preflight/OPTIONS) que Apps Script no
 * sabe responder, y el navegador bloquea la petición.
 * La solución estándar (y la que usa este archivo) es enviar el
 * POST con "Content-Type: text/plain" pero con un cuerpo que sigue
 * siendo JSON — así el navegador NO exige preflight, y en el
 * servidor (Code.gs) igual se lee y parsea como JSON normal.
 */

const BASE_URL = import.meta.env.VITE_SHEETS_API_URL || ''

async function callApi(action, params = {}, method = 'GET') {
  if (!BASE_URL) {
    throw new Error(
      'VITE_SHEETS_API_URL no está configurado en .env — todavía estás en modo mock.'
    )
  }

  if (method === 'GET') {
    const query = new URLSearchParams({ action, ...params }).toString()
    const res = await fetch(`${BASE_URL}?${query}`, { redirect: 'follow' })
    if (!res.ok) throw new Error(`Error ${res.status} al llamar a Google Sheets`)
    return res.json()
  }

  // POST: text/plain evita el preflight CORS (ver nota arriba)
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...params }),
  })
  if (!res.ok) throw new Error(`Error ${res.status} al llamar a Google Sheets`)
  return res.json()
}

/** Lista todos los RUCs de la hoja principal (equivalente a leer_rucs() en Python). */
export function getRucs() {
  return callApi('listRucs')
}

/** Trae el cronograma de un tipo de vencimiento ('SIRE' | 'DJ Mensual' | 'DJ Anual'). */
export function getVencimientos(tipo, mes, anio) {
  return callApi('getVencimientos', { tipo, mes, anio })
}

/** Trae las notas/tributos guardados de un RUC. */
export function getNotas(ruc) {
  return callApi('getNotas', { ruc })
}

/** Guarda (sobrescribe) las notas/tributos de un RUC. */
export function saveNotas(ruc, notas) {
  return callApi('saveNotas', { ruc, notas: JSON.stringify(notas) }, 'POST')
}

/** Registra en la hoja "Log" cada acción relevante (login automático, envío WhatsApp, etc.) — opcional, útil como auditoría. */
export function logActivity(ruc, mensaje) {
  return callApi('logActivity', { ruc, mensaje }, 'POST')
}
