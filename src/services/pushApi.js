const PUSH_BASE_URL = 'https://ezwork.duckdns.org/api/push'

function urlBase64ToUint8Array(base64String) {
  if (!base64String) {
    throw new Error('La clave VAPID pública está vacía o es undefined.')
  }
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export async function suscribirsePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Este navegador no soporta notificaciones push reales.')
  }
  
  const workspaceId = localStorage.getItem('ezwork_workspace_id')
  if (!workspaceId) throw new Error('No hay sesión activa.')

  // Verificamos explícitamente la clave antes de usarla
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  console.log('VAPID Key actual:', vapidKey ? 'Cargada correctamente' : 'ESTÁ VACÍA O UNDEFINED')
  
  if (!vapidKey) {
    throw new Error('VITE_VAPID_PUBLIC_KEY no está definida en el entorno de compilación.')
  }

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })
  }

  const res = await fetch(`${PUSH_BASE_URL}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-WORKSPACE-ID': workspaceId },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  })
  
  if (!res.ok) throw new Error('El servidor no aceptó la suscripción.')
  return true
}