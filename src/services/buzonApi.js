const BASE_URL = import.meta.env.VITE_BUZON_API_URL || ''
const API_KEY = import.meta.env.VITE_BUZON_API_KEY || ''

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

export async function obtenerPdfBlob(fileId) {
  const res = await fetch(`${BASE_URL}/pdfs/${fileId}`, {
    headers: wsHeaders(),
  })
  if (!res.ok) throw new Error('No se pudo obtener el PDF')
  return res.blob()
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