export function cerrarSesion() {
  const confirmar = window.confirm('¿Cerrar sesión? Vas a tener que volver a ingresar tu correo y clave.')
  if (!confirmar) return
  localStorage.removeItem('ezwork_workspace_id')
  localStorage.removeItem('ezwork_correo')
  localStorage.removeItem('ezwork_alias')
  localStorage.removeItem('ezwork_apps_script_url')
  localStorage.removeItem('tributaplus_pin_hash')
  localStorage.removeItem('tributaplus_webauthn_credential_id')
  window.location.reload()
}