import { useEffect, useRef, useState, useCallback } from 'react'

const STORAGE_KEY = 'tributaplus_notas'
const NOTIFIED_KEY = 'tributaplus_recordatorios_notificados'
const pad = (n) => String(n).padStart(2, '0')

/**
 * Muestra una notificación de forma segura para cualquier navegador.
 * En Android (y la mayoría de navegadores móviles), `new Notification()`
 * directo está prohibido y lanza un error — hay que pasar por el
 * Service Worker (registration.showNotification). En computadoras,
 * si no hay Service Worker disponible, usamos el constructor directo
 * como respaldo. Todo envuelto en try/catch: si algo falla, no debe
 * romper el resto de la app.
 */
async function mostrarNotificacionSegura(titulo, opciones) {
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready
      if (reg && reg.showNotification) {
        await reg.showNotification(titulo, opciones)
        return true
      }
    }
  } catch (err) {
    console.warn('No se pudo notificar vía Service Worker:', err)
  }
  try {
    if (typeof Notification !== 'undefined') {
      new Notification(titulo, opciones)
      return true
    }
  } catch (err) {
    console.warn('No se pudo notificar directamente:', err)
  }
  return false
}

export function useReminders(rucs) {
  const rucsRef = useRef(rucs)
  useEffect(() => { rucsRef.current = rucs }, [rucs])

  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )

  const requestPermission = useCallback(() => {
    if (typeof Notification === 'undefined') return
    Notification.requestPermission()
      .then(setPermission)
      .catch(() => {})
  }, [])

  const check = useCallback(async () => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    let notas = {}
    try { notas = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return }
    let notificados = []
    try { notificados = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]') } catch {}

    const now = new Date()
    const hoyStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const horaActual = now.getHours() * 60 + now.getMinutes()

    let cambios = false
    for (const [rucId, nota] of Object.entries(notas)) {
      for (const t of nota.tributos || []) {
        if (!t.recordar || !t.fecha || !t.hora) continue
        if (t.fecha !== hoyStr) continue
        const [h, m] = t.hora.split(':').map(Number)
        const horaTributo = h * 60 + m
        if (horaActual >= horaTributo && horaActual - horaTributo <= 120) {
          const key = `${rucId}-${t.id}-${t.fecha}-${t.hora}`
          if (!notificados.includes(key)) {
            const ruc = (rucsRef.current || []).find((r) => r.id === rucId)
            const nombre = ruc ? ruc.razonSocial : rucId
            const enviada = await mostrarNotificacionSegura(`Recordatorio — ${t.nombre}`, {
              body: `${nombre} · S/ ${t.monto} · ${t.fecha} ${t.hora}`,
              icon: '/icon.svg',
              tag: key,
            })
            if (enviada) {
              notificados.push(key)
              cambios = true
            }
          }
        }
      }
    }
    if (cambios) localStorage.setItem(NOTIFIED_KEY, JSON.stringify(notificados.slice(-200)))
  }, [])

  useEffect(() => {
    check()
    const interval = setInterval(check, 30000)
    function onVisible() {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [check])

  return { permission, requestPermission }
}