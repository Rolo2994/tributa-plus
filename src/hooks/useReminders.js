import { useEffect, useRef } from 'react'

const STORAGE_KEY = 'tributaplus_notas'
const NOTIFIED_KEY = 'tributaplus_recordatorios_notificados'

const pad = (n) => String(n).padStart(2, '0')

/**
 * Revisa cada 30s si algún tributo con recordatorio activado coincide
 * con la fecha/hora actual, y dispara una notificación del sistema
 * (como una notificación de WhatsApp) si la app está abierta o en
 * segundo plano.
 *
 * LIMITACIÓN HONESTA: si cierras la app por completo (sobre todo en
 * iPhone), esto no se ejecuta — para eso hace falta Web Push real
 * con un servidor propio. Lo dejamos como mejora futura.
 */
export function useReminders(rucs, pushLog) {
  const rucsRef = useRef(rucs)
  useEffect(() => {
    rucsRef.current = rucs
  }, [rucs])

  // Pide permiso de notificaciones una sola vez
  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    function check() {
      if (!('Notification' in window) || Notification.permission !== 'granted') return

      let notas = {}
      try {
        notas = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      } catch {
        return
      }
      let notificados = []
      try {
        notificados = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]')
      } catch {}

      const now = new Date()
      const hoyStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
      const horaStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`

      let cambios = false
      Object.entries(notas).forEach(([rucId, nota]) => {
        ;(nota.tributos || []).forEach((t) => {
          if (!t.recordar || !t.fecha || !t.hora) return
          const key = `${rucId}-${t.id}-${t.fecha}-${t.hora}`
          if (t.fecha === hoyStr && t.hora === horaStr && !notificados.includes(key)) {
            const ruc = (rucsRef.current || []).find((r) => r.id === rucId)
            const nombre = ruc ? ruc.razonSocial : rucId
            new Notification(`Recordatorio — ${t.nombre}`, {
              body: `${nombre} · S/ ${t.monto} · ${t.fecha}`,
              icon: '/icon.svg',
              tag: key,
            })
            notificados.push(key)
            cambios = true
          }
        })
      })
      if (cambios) {
        localStorage.setItem(NOTIFIED_KEY, JSON.stringify(notificados.slice(-200)))
      }
    }

    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])
}