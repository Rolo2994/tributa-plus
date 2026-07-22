import { useEffect, useRef, useState, useCallback } from 'react'

const STORAGE_KEY = 'tributaplus_notas'
const NOTIFIED_KEY = 'tributaplus_recordatorios_notificados'
const pad = (n) => String(n).padStart(2, '0')

export function useReminders(rucs) {
  const rucsRef = useRef(rucs)
  useEffect(() => { rucsRef.current = rucs }, [rucs])

  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )

  // Debe llamarse SIEMPRE dentro de un onClick real — nunca automático.
  const requestPermission = useCallback(() => {
    if (typeof Notification === 'undefined') return
    Notification.requestPermission().then(setPermission)
  }, [])

  const check = useCallback(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    let notas = {}
    try { notas = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return }
    let notificados = []
    try { notificados = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]') } catch {}

    const now = new Date()
    const hoyStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const horaActual = now.getHours() * 60 + now.getMinutes()

    let cambios = false
    Object.entries(notas).forEach(([rucId, nota]) => {
      ;(nota.tributos || []).forEach((t) => {
        if (!t.recordar || !t.fecha || !t.hora) return
        if (t.fecha !== hoyStr) return
        const [h, m] = t.hora.split(':').map(Number)
        const horaTributo = h * 60 + m
        // "Ponerse al día": si ya pasó la hora (hasta 2h de margen),
        // avisa igual apenas se reabre/desbloquea la app.
        if (horaActual >= horaTributo && horaActual - horaTributo <= 120) {
          const key = `${rucId}-${t.id}-${t.fecha}-${t.hora}`
          if (!notificados.includes(key)) {
            const ruc = (rucsRef.current || []).find((r) => r.id === rucId)
            const nombre = ruc ? ruc.razonSocial : rucId
            new Notification(`Recordatorio — ${t.nombre}`, {
              body: `${nombre} · S/ ${t.monto} · ${t.fecha} ${t.hora}`,
              icon: '/icon.svg',
              tag: key,
            })
            notificados.push(key)
            cambios = true
          }
        }
      })
    })
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