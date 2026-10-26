// Servicio de la acción "Descarga de comprobantes SUNAT" (PDF / XML / CDR).
// Mismo patrón que sireApi.js / buzonApi.js: misma URL base, misma clave y
// mismo encabezado de workspace.

const BASE_URL = import.meta.env.VITE_BUZON_API_URL || ''
const API_KEY = import.meta.env.VITE_BUZON_API_KEY || ''

// Un archivo individual es pequeño; el zip de una tanda grande puede tardar más.
const TIMEOUT_ARCHIVO_MS = 60000
const TIMEOUT_ZIP_MS = 300000

function wsHeaders(extra = {}) {
  const wsId = localStorage.getItem('ezwork_workspace_id') || ''
  return { 'X-API-KEY': API_KEY, 'X-WORKSPACE-ID': wsId, ...extra }
}

// ── Lanzar y seguir la descarga ─────────────────────────────────────

// payload: { ruc, comprobantes:[{op, ruc_emisor, tipo, serie, numero}],
//            incluir_pdf, incluir_xml, incluir_cdr, plantilla }
export async function ejecutarCpe(payload) {
  const res = await fetch(`${BASE_URL}/ejecutar-cpe`, {
    method: 'POST',
    headers: wsHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })
  return res.json()
}

// Devuelve { estado, total, procesados, filas:[{fila, pdf_ok, xml_ok, cdr_ok, error}], mensaje }
export async function consultarEstadoCpe(tareaId) {
  const res = await fetch(`${BASE_URL}/estado/${tareaId}`, { headers: wsHeaders() })
  return res.json()
}

// ── Archivos generados en el servidor ───────────────────────────────

export async function listarArchivosCpe(tareaId) {
  const res = await fetch(`${BASE_URL}/cpe/archivos/${tareaId}`, { headers: wsHeaders() })
  return res.json()
}

async function pedirBlob(url, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { headers: wsHeaders(), signal: controller.signal })
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
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`La descarga tardó más de ${Math.round(timeoutMs / 1000)} s y se canceló`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

// "20601001285/PDF/archivo.pdf" -> cada tramo codificado, las "/" se conservan.
function rutaCodificada(ruta) {
  return ruta.split('/').map(encodeURIComponent).join('/')
}

export function descargarArchivoCpe(tareaId, ruta) {
  return pedirBlob(`${BASE_URL}/cpe/archivo/${tareaId}/${rutaCodificada(ruta)}`, TIMEOUT_ARCHIVO_MS)
}

export function descargarZipCpe(tareaId) {
  return pedirBlob(`${BASE_URL}/cpe/zip/${tareaId}`, TIMEOUT_ZIP_MS)
}

// Libera el espacio del servidor cuando ya guardaste todo.
export async function borrarTareaCpe(tareaId) {
  const res = await fetch(`${BASE_URL}/cpe/${tareaId}`, { method: 'DELETE', headers: wsHeaders() })
  return res.json()
}
