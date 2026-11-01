import { useState } from 'react'

// Paginación sencilla para cualquier tabla: "Filas por página" (20 / 50 / 100) y páginas.
// clave: nombre para recordar la cantidad elegida en este navegador (opcional).
export const OPCIONES_POR_PAGINA = [20, 50, 100]

function leerGuardado(clave, porDefecto) {
  try {
    const n = Number(localStorage.getItem(`tributaplus_pp_${clave}`))
    return OPCIONES_POR_PAGINA.includes(n) ? n : porDefecto
  } catch {
    return porDefecto
  }
}

export function usePaginacion(total, porDefecto = 50, clave = '') {
  const [porPagina, setPorPaginaEstado] = useState(() => (clave ? leerGuardado(clave, porDefecto) : porDefecto))
  const [pagina, setPagina] = useState(1)

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))
  const paginaSegura = Math.min(pagina, totalPaginas)
  const desde = (paginaSegura - 1) * porPagina
  const hasta = Math.min(desde + porPagina, total)

  function setPorPagina(n) {
    setPorPaginaEstado(n)
    setPagina(1)
    if (clave) {
      try { localStorage.setItem(`tributaplus_pp_${clave}`, String(n)) } catch { /* sin almacenamiento: no pasa nada */ }
    }
  }

  return { pagina: paginaSegura, setPagina, porPagina, setPorPagina, totalPaginas, desde, hasta }
}
