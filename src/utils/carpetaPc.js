// Guardar archivos en una carpeta de la PC elegida por el usuario.
//
// Usa la "File System Access API" del navegador, que existe SOLO en Chrome y
// Edge de computadora. En los demás navegadores (Firefox, Safari, celulares)
// no existe, y la pantalla ofrece un .zip como alternativa.

export function soportaSelectorCarpeta() {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
}

// Abre el explorador de archivos del sistema. Debe llamarse desde un clic.
// Si el usuario cancela, el navegador lanza un error con name === 'AbortError'.
export async function elegirCarpeta() {
  return window.showDirectoryPicker({ id: 'tributa-plus-cpe', mode: 'readwrite' })
}

// ¿Tenemos permiso para escribir en la carpeta?
// - pedir = false: solo consulta (se puede hacer en cualquier momento).
// - pedir = true : muestra el aviso del navegador; solo funciona dentro de un clic.
export async function asegurarPermiso(carpeta, pedir = false) {
  const opciones = { mode: 'readwrite' }
  if ((await carpeta.queryPermission(opciones)) === 'granted') return true
  if (!pedir) return false
  return (await carpeta.requestPermission(opciones)) === 'granted'
}

// Guarda un archivo en "RUC/PDF/nombre.pdf" dentro de la carpeta elegida,
// creando las subcarpetas que falten.
export async function guardarBlobEnCarpeta(carpetaRaiz, rutaRelativa, blob) {
  const partes = rutaRelativa.split('/').filter(Boolean)
  const nombre = partes.pop()
  let carpeta = carpetaRaiz
  for (const parte of partes) {
    carpeta = await carpeta.getDirectoryHandle(parte, { create: true })
  }
  const archivo = await carpeta.getFileHandle(nombre, { create: true })
  const escritura = await archivo.createWritable()
  await escritura.write(blob)
  await escritura.close()
}

// Descarga normal del navegador (va a la carpeta "Descargas").
export function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
