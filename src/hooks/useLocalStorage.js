import { useEffect, useState } from 'react'

/**
 * useLocalStorage
 * ─────────────────────────────────────────────────────────────
 * Hook genérico que se comporta como useState pero persiste el
 * valor en localStorage. Se usa para guardar las notas/tributos de
 * cada RUC (IGV, Renta, ONP, EsSalud, observaciones) mientras el
 * proyecto no está conectado todavía a Google Sheets — así puedes
 * probar la edición y que sobreviva a recargar la página.
 *
 * Cuando conectes services/googleSheetsApi.js, lo normal es leer el
 * valor inicial del Sheet (getNotas) y llamar saveNotas() en el
 * mismo lugar donde hoy se llama setValue — localStorage puede
 * quedarse como caché offline de respaldo.
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Almacenamiento lleno o bloqueado (modo incógnito) — se ignora
      // silenciosamente; en producción convendría avisar al usuario.
    }
  }, [key, value])

  return [value, setValue]
}
