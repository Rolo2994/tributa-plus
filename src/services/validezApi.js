// Servicio de la acción "Validez CP" (consulta masiva de validez de comprobantes, API SUNAT).
// Mismo patrón que cpeApi.js: misma URL base, misma clave y mismo encabezado de workspace.

const BASE_URL = import.meta.env.VITE_BUZON_API_URL || ''
const API_KEY = import.meta.env.VITE_BUZON_API_KEY || ''

const TIMEOUT_ARCHIVO_MS = 60000

function wsHeaders(extra = {}) {
  const wsId = localStorage.getItem('ezwork_workspace_id') || ''
  return { 'X-API-KEY': API_KEY, 'X-WORKSPACE-ID': wsId, ...extra }
}

// payload: { ruc, archivos:[{ nombre, lineas:[ 'RUC|cod|serie|numero|fecha|monto', ... ] }] }
export async function ejecutarValidez(payload) {
  const res = await fetch(`${BASE_URL}/ejecutar-validez`, {
    method: 'POST',
    headers: wsHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })
  return res.json()
}

// Devuelve { estado, total, procesados, correctos, con_observaciones, errores, archivos, mensaje }
export async function consultarEstadoValidez(tareaId) {
  const res = await fetch(`${BASE_URL}/estado/${tareaId}`, { headers: wsHeaders() })
  return res.json()
}

export async function cancelarValidez(tareaId) {
  const res = await fetch(`${BASE_URL}/validez/cancelar/${tareaId}`, { method: 'POST', headers: wsHeaders() })
  return res.json()
}

export async function listarArchivosValidez(tareaId) {
  const res = await fetch(`${BASE_URL}/validez/archivos/${tareaId}`, { headers: wsHeaders() })
  return res.json()
}

export async function descargarArchivoValidez(tareaId, nombre) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_ARCHIVO_MS)
  try {
    const res = await fetch(`${BASE_URL}/validez/archivo/${tareaId}/${encodeURIComponent(nombre)}`, {
      headers: wsHeaders(),
      signal: controller.signal,
    })
    if (!res.ok) {
      let detalle = ''
      try {
        detalle = (await res.json())?.error || ''
      } catch {
        // la respuesta no era JSON; no pasa nada
      }
      throw new Error(`El servidor respondió ${res.status}${detalle ? `: ${detalle}` : ''}`)
    }
    return await res.blob()
  } finally {
    clearTimeout(timer)
  }
}

// Libera el espacio del servidor cuando ya guardaste el reporte.
export async function borrarTareaValidez(tareaId) {
  const res = await fetch(`${BASE_URL}/validez/${tareaId}`, { method: 'DELETE', headers: wsHeaders() })
  return res.json()
}