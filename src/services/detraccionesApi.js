// Servicio de la acción "Detracciones" (consulta de pago de detracciones SUNAT).
// Mismo patrón que cpeApi.js / validezApi.js: misma URL base, misma clave y mismo encabezado de workspace.

const BASE_URL = import.meta.env.VITE_BUZON_API_URL || ''
const API_KEY = import.meta.env.VITE_BUZON_API_KEY || ''
const TIMEOUT_ARCHIVO_MS = 60000

function wsHeaders(extra = {}) {
  const wsId = localStorage.getItem('ezwork_workspace_id') || ''
  return { 'X-API-KEY': API_KEY, 'X-WORKSPACE-ID': wsId, ...extra }
}

// payload: { ruc, cuenta: '1'|'2'|'3', pago: 'pagosIndividuales'|'pagosMasivos'|'pagosTransPasajeros',
//            fecha_inicio: 'aaaa-mm-dd', fecha_fin: 'aaaa-mm-dd' }
export async function ejecutarDetracciones(payload) {
  const res = await fetch(`${BASE_URL}/ejecutar-detracciones`, {
    method: 'POST',
    headers: wsHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })
  return res.json()
}

// Devuelve { ok, estado, total, procesados, fase_texto, bloques_ok, bloques_vacios, dudosos, total_filas, mensaje, log }
export async function consultarEstadoDetracciones(tareaId) {
  const res = await fetch(`${BASE_URL}/detracciones/estado/${tareaId}`, { headers: wsHeaders() })
  return res.json()
}

export async function cancelarDetracciones(tareaId) {
  const res = await fetch(`${BASE_URL}/detracciones/cancelar/${tareaId}`, { method: 'POST', headers: wsHeaders() })
  return res.json()
}

// Devuelve { ok, columnas:[...], filas:[[...]], total }
export async function obtenerResultadoDetracciones(tareaId) {
  const res = await fetch(`${BASE_URL}/detracciones/resultado/${tareaId}`, { headers: wsHeaders() })
  return res.json()
}

// Devuelve el Excel como Blob (para guardarlo con descargarBlob).
export async function descargarArchivoDetracciones(tareaId, nombre) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_ARCHIVO_MS)
  try {
    const res = await fetch(`${BASE_URL}/detracciones/archivo/${tareaId}/${encodeURIComponent(nombre)}`, {
      headers: wsHeaders(),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`El servidor respondió ${res.status}`)
    return await res.blob()
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error('La descarga tardó demasiado y se canceló')
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export async function borrarTareaDetracciones(tareaId) {
  const res = await fetch(`${BASE_URL}/detracciones/${tareaId}`, { method: 'DELETE', headers: wsHeaders() })
  return res.json()
}
