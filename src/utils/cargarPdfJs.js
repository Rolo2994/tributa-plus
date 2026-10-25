// Carga la librería pdf.js (Mozilla) la primera vez que se necesita, desde un CDN.
// Así no hay que instalar nada en el proyecto (no se toca package.json).
// Es la misma librería que usa Firefox para mostrar PDFs.

const VERSION_PDFJS = '3.11.174'
const BASE_CDN = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${VERSION_PDFJS}/build`

let promesaPdfJs = null // se guarda para no cargar la librería dos veces

export function cargarPdfJs() {
  if (typeof window !== 'undefined' && window.pdfjsLib) return Promise.resolve(window.pdfjsLib)

  if (!promesaPdfJs) {
    promesaPdfJs = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `${BASE_CDN}/pdf.min.js`
      script.async = true
      script.onload = () => {
        const lib = window.pdfjsLib
        if (!lib) {
          promesaPdfJs = null
          reject(new Error('La librería del visor no se inicializó'))
          return
        }
        lib.GlobalWorkerOptions.workerSrc = `${BASE_CDN}/pdf.worker.min.js`
        resolve(lib)
      }
      script.onerror = () => {
        promesaPdfJs = null // permite reintentar la próxima vez
        reject(new Error('No se pudo cargar el visor de PDF (¿sin internet?)'))
      }
      document.head.appendChild(script)
    })
  }
  return promesaPdfJs
}
