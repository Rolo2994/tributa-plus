const BASE_URL = import.meta.env.VITE_BUZON_API_URL || ''
const API_KEY = import.meta.env.VITE_BUZON_API_KEY || ''

export async function ejecutarBuzon({ rucs, grupo }) {
  const res = await fetch(`${BASE_URL}/ejecutar-buzon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': API_KEY },
    body: JSON.stringify(grupo ? { grupo } : { rucs }),
  })
  return res.json()
}

export async function consultarEstado(tareaId) {
  const res = await fetch(`${BASE_URL}/estado/${tareaId}`, {
    headers: { 'X-API-KEY': API_KEY },
  })
  return res.json()
}