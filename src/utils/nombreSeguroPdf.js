// Deja el nombre de un PDF "limpio" para compartirlo por WhatsApp: sin tildes, sin paréntesis,
// sin símbolos raros, sin puntos dobles ni al final, y con largo máximo.
// Algunos celulares rechazan nombres con esos caracteres ("Permission denied").
// Solo cambia el nombre que recibe WhatsApp; el archivo del servidor NO se modifica.

const NOMBRE_SEGURO_MAX = 100

export function nombreSeguroPdf(nombre) {
  let base = String(nombre || 'documento').replace(/\.pdf$/i, '')
  base = base.normalize('NFD').replace(/[̀-ͯ]/g, '') // quita tildes
  base = base.replace(/[^A-Za-z0-9 _.-]/g, ' ')                // quita °, paréntesis, #, etc.
  base = base.replace(/\.{2,}/g, '.').replace(/\s+/g, ' ')     // sin puntos dobles ni espacios dobles
  base = base.replace(/^[\s.]+|[\s.]+$/g, '')                  // sin puntos/espacios al inicio o al final
  base = base.slice(0, NOMBRE_SEGURO_MAX).replace(/[\s.]+$/g, '')
  return `${base || 'documento'}.pdf`
}
