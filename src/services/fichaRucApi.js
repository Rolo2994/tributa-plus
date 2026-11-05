// Servicio de la acción "Ficha RUC y Reporte Tributario".
// Mismo patrón que detraccionesApi.js: misma URL base, misma clave y mismo encabezado de workspace.

const BASE_URL = import.meta.env.VITE_BUZON_API_URL || ''
const API_KEY = import.meta.env.VITE_BUZON_API_KEY || ''
const TIMEOUT_ARCHIVO_MS = 60000

function wsHeaders(extra = {}) {
  const wsId = localStorage.getItem('ezwork_workspace_id') || ''
  return { 'X-API-KEY': API_KEY, 'X-WORKSPACE-ID': wsId, ...extra }
}

// payload: { rucs: ['20...'], accion: 'ficha'|'reporte'|'ambos', correo, pausa_s }
export async function ejecutarFichaRuc(payload) {
  const res = await fetch(`${BASE_URL}/ejecutar-ficha-ruc`, {
    method: 'POST',
    headers: wsHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })
  return res.json()
}

// Devuelve { ok, estado, total, procesados, fase_texto, actual, resultados:[{ruc,razon,ficha,reporte,archivo,intentos,nota}],
//            bloqueado, pausa_restante_s, mensaje, log, log_total }
export async function consultarEstadoFichaRuc(tareaId) {
  const res = await fetch(`${BASE_URL}/ficha-ruc/estado/${tareaId}`, { headers: wsHeaders() })
  return res.json()
}

export async function cancelarFichaRuc(tareaId) {
  const res = await fetch(`${BASE_URL}/ficha-ruc/cancelar/${tareaId}`, { method: 'POST', headers: wsHeaders() })
  return res.json()
}

// Devuelve { ok, archivos:[{nombre,razon,fecha,kb,hoy}], reportes_hoy:{ruc:n}, limite_dia, bloqueo:{restante_s,motivo}|null,
//            reporte_disponible, reporte_motivo, pausa_defecto_s, historial:[...] }
export async function listarFichasRuc() {
  const res = await fetch(`${BASE_URL}/ficha-ruc/archivos`, { headers: wsHeaders() })
  return res.json()
}

// Devuelve el PDF como Blob (para guardarlo con descargarBlob).
export async function descargarFichaRuc(nombre) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_ARCHIVO_MS)
  try {
    const res = await fetch(`${BASE_URL}/ficha-ruc/archivo/${encodeURIComponent(nombre)}`, {
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

export async function borrarFichaRuc(nombre) {
  const res = await fetch(`${BASE_URL}/ficha-ruc/archivo/${encodeURIComponent(nombre)}`, { method: 'DELETE', headers: wsHeaders() })
  return res.json()
}

export async function quitarBloqueoFichaRuc() {
  const res = await fetch(`${BASE_URL}/ficha-ruc/bloqueo`, { method: 'DELETE', headers: wsHeaders() })
  return res.json()
}
