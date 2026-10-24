const BASE_URL = import.meta.env.VITE_BUZON_API_URL || ''
const API_KEY = import.meta.env.VITE_BUZON_API_KEY || ''

// Tiempo máximo (en milisegundos) que esperamos al servidor al descargar un PDF.
// Si pasa este tiempo, se cancela y se avisa, en vez de quedarse "cargando" para siempre.
const TIMEOUT_PDF_MS = 30000

function wsHeaders(extra = {}) {
  const wsId = localStorage.getItem('ezwork_workspace_id') || ''
  return { 'X-API-KEY': API_KEY, 'X-WORKSPACE-ID': wsId, ...extra }
}

// ── Ejecucion de BuzonPDF ──────────────────────────────────────────

export async function ejecutarBuzon({ rucs, grupo, fechaDesde }) {
  const res = await fetch(`${BASE_URL}/ejecutar-buzon`, {
    method: 'POST',
    headers: wsHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      ...(grupo ? { grupo } : { rucs }),
      ...(fechaDesde ? { fecha_desde: fechaDesde } : {}),
    }),
  })
  return res.json()
}

export async function consultarEstado(tareaId) {
  const res = await fetch(`${BASE_URL}/estado/${tareaId}`, {
    headers: wsHeaders(),
  })
  return res.json()
}

// ── Ver / enviar / eliminar PDFs ───────────────────────────────────

export async function listarPdfs(fecha) {
  const res = await fetch(`${BASE_URL}/pdfs?fecha=${fecha}`, {
    headers: wsHeaders(),
  })
  return res.json()
}

// Descarga un PDF desde el servidor (que a su vez lo baja de Drive).
// - Tiene un límite de tiempo (timeoutMs) para no quedarse colgado.
// - Si el servidor responde con error, el mensaje incluye el código (500, 502, 504...)
//   y el detalle que haya enviado el backend, para saber qué pasó.
export async function obtenerPdfBlob(fileId, { timeoutMs = TIMEOUT_PDF_MS } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE_URL}/pdfs/${fileId}`, {
      headers: wsHeaders(),
      signal: controller.signal,
    })
    if (!res.ok) {
      let detalle = ''
      try {
        const data = await res.json()
        detalle = data?.error || ''
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

export async function eliminarPdf(fileId) {
  const res = await fetch(`${BASE_URL}/pdfs/${fileId}`, {
    method: 'DELETE',
    headers: wsHeaders(),
  })
  return res.json()
}

// ── Workspace (configuracion por usuario) ──────────────────────────

export async function crearWorkspace() {
  const res = await fetch(`${BASE_URL}/workspace/crear`, {
    method: 'POST',
    headers: wsHeaders(),
  })
  return res.json()
}

export async function obtenerEstadoWorkspace(wsId) {
  const res = await fetch(`${BASE_URL}/workspace/${wsId}/estado`, {
    headers: wsHeaders(),
  })
  return res.json()
}

export async function guardarAppsScriptUrl(wsId, url) {
  const res = await fetch(`${BASE_URL}/workspace/${wsId}/apps-script`, {
    method: 'POST',
    headers: wsHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ url }),
  })
  return res.json()
}

export async function guardarNombreCarpeta(wsId, nombre) {
  const res = await fetch(`${BASE_URL}/workspace/${wsId}/carpeta`, {
    method: 'POST',
    headers: wsHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ nombre }),
  })
  return res.json()
}

export function urlConectarDrive(wsId) {
  return `${BASE_URL}/oauth/iniciar?ws=${wsId}`
}

export async function registrarCuenta(correo, clave) {
  const res = await fetch(`${BASE_URL}/cuenta/registrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': API_KEY },
    body: JSON.stringify({ correo, clave }),
  })
  return res.json()
}

export async function iniciarSesion(correo, clave) {
  const res = await fetch(`${BASE_URL}/cuenta/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': API_KEY },
    body: JSON.stringify({ correo, clave }),
  })
  return res.json()
}

export async function cambiarClave(correo, claveActual, claveNueva) {
  const res = await fetch(`${BASE_URL}/cuenta/cambiar-clave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': API_KEY },
    body: JSON.stringify({ correo, clave_actual: claveActual, clave_nueva: claveNueva }),
  })
  return res.json()
}
