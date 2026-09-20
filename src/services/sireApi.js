const BASE_URL = import.meta.env.VITE_BUZON_API_URL || ''
const API_KEY = import.meta.env.VITE_BUZON_API_KEY || ''

function wsHeaders(extra = {}) {
  const wsId = localStorage.getItem('ezwork_workspace_id') || ''
  return { 'X-API-KEY': API_KEY, 'X-WORKSPACE-ID': wsId, ...extra }
}

// ── Ejecución de la descarga SIRE ──────────────────────────────────

// Recibe el payload completo tal cual (ruc | rucs | grupo, + registro,
// opcion, periodos, formato) y lo manda sin filtrar campos — antes
// esta función solo aceptaba "ruc" explícito y perdía "rucs"/"grupo"
// al desestructurar.
export async function ejecutarSire(payload) {
  const res = await fetch(`${BASE_URL}/ejecutar-sire`, {
    method: 'POST',
    headers: wsHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })
  return res.json()
}

// Mismo endpoint de estado que ya usa Buzón — una tarea es una tarea,
// sin importar si la lanzó /ejecutar-buzon o /ejecutar-sire.
export async function consultarEstado(tareaId) {
  const res = await fetch(`${BASE_URL}/estado/${tareaId}`, {
    headers: wsHeaders(),
  })
  return res.json()
}

// ── Archivos SIRE ya descargados (Drive) ───────────────────────────

export async function listarArchivosSire(ruc, periodo) {
  const query = new URLSearchParams({ ruc, ...(periodo ? { periodo } : {}) }).toString()
  const res = await fetch(`${BASE_URL}/sire/archivos?${query}`, {
    headers: wsHeaders(),
  })
  return res.json()
}

// ── Pre FV621 ───────────────────────────────────────────────────────

export async function calcularPreFv621(payload) {
  const res = await fetch(`${BASE_URL}/pre-fv621/calcular`, {
    method: 'POST',
    headers: wsHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })
  return res.json()
}

export async function obtenerHistorialFv621(ruc, periodo) {
  const query = new URLSearchParams({ ruc, periodo }).toString()
  const res = await fetch(`${BASE_URL}/pre-fv621/historial?${query}`, {
    headers: wsHeaders(),
  })
  return res.json()
}
