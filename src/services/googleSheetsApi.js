/**
 * googleSheetsApi.js
 * ─────────────────────────────────────────────────────────────
 * La URL del Apps Script ya NO es fija — se lee del Sheet propio
 * de la cuenta que inició sesión (guardado en localStorage tras el
 * login, ver SesionGate.jsx). Si por algún motivo no hay ninguno
 * guardado (cuenta nueva sin configurar todavía), cae de vuelta a
 * la variable de entorno fija, solo como respaldo.
 */

function getBaseUrl() {
  return localStorage.getItem('ezwork_apps_script_url') || import.meta.env.VITE_SHEETS_API_URL || ''
}

async function callApi(action, params = {}, method = 'GET') {
  const baseUrl = getBaseUrl()
  if (!baseUrl) {
    throw new Error('Todavía no configuraste tu Google Sheet — ve a Ajustes.')
  }

  if (method === 'GET') {
    const query = new URLSearchParams({ action, ...params, _t: Date.now() }).toString()
    const res = await fetch(`${baseUrl}?${query}`, { redirect: 'follow', cache: 'no-store' })
    if (!res.ok) throw new Error(`Error ${res.status} al llamar a Google Sheets`)
    return res.json()
  }

  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...params }),
  })
  if (!res.ok) throw new Error(`Error ${res.status} al llamar a Google Sheets`)
  return res.json()
}

export function getRucs() {
  return callApi('listRucs')
}

export function getVencimientos(tipo, mes, anio) {
  return callApi('getVencimientos', { tipo, mes, anio })
}

export function getNotas(ruc) {
  return callApi('getNotas', { ruc })
}

export function saveNotas(ruc, notas) {
  return callApi('saveNotas', { ruc, notas: JSON.stringify(notas) }, 'POST')
}

export function logActivity(ruc, mensaje) {
  return callApi('logActivity', { ruc, mensaje }, 'POST')
}

export function getTributos() {
  return callApi('listTributos')
}

export function getAllNotas() {
  return callApi('listNotas')
}

export function getTaxStatus() {
  return callApi('listTaxStatus')
}

// Agrega esto al final de googleSheetsApi.js

export function getConfiguredSheetsUrl() {
  return localStorage.getItem('ezwork_apps_script_url') || '';
}

export function setConfiguredSheetsUrl(url) {
  if (url) {
    localStorage.setItem('ezwork_apps_script_url', url);
  } else {
    localStorage.removeItem('ezwork_apps_script_url');
  }
}