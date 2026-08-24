const BASE_URL = import.meta.env.VITE_BUZON_API_URL || ''
const API_KEY = import.meta.env.VITE_BUZON_API_KEY || ''

export async function ejecutarBuzon({ rucs, grupo, fechaDesde }) {
  const res = await fetch(`${BASE_URL}/ejecutar-buzon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': API_KEY },
    body: JSON.stringify({ ...(grupo ? { grupo } : { rucs }), ...(fechaDesde ? { fecha_desde: fechaDesde } : {}) }),
  })
  return res.json()
}

export async function consultarEstado(tareaId) {
  const res = await fetch(`${BASE_URL}/estado/${tareaId}`, {
    headers: { 'X-API-KEY': API_KEY },
  })
  return res.json()
}

export async function listarPdfs(fecha) {
  const res = await fetch(`${BASE_URL}/pdfs?fecha=${fecha}`, {
    headers: { 'X-API-KEY': API_KEY },
  })
  return res.json()
}

export async function obtenerPdfBlob(fileId) {
  const res = await fetch(`${BASE_URL}/pdfs/${fileId}`, {
    headers: { 'X-API-KEY': API_KEY },
  })
  if (!res.ok) throw new Error('No se pudo obtener el PDF')
  return res.blob()
}