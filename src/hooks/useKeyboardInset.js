import { useEffect, useState } from 'react'

/**
 * Devuelve cuántos píxeles está ocupando el teclado en pantalla (0 si
 * está cerrado). Usa la API real del navegador (visualViewport) que
 * detecta el achicamiento de la pantalla visible cuando aparece el
 * teclado — más confiable que intentar "scrollear hacia el campo".
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    if (!window.visualViewport) return
    function onResize() {
      const vv = window.visualViewport
      const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop
      setInset(keyboardHeight > 60 ? keyboardHeight : 0)
    }
    window.visualViewport.addEventListener('resize', onResize)
    window.visualViewport.addEventListener('scroll', onResize)
    onResize()
    return () => {
      window.visualViewport.removeEventListener('resize', onResize)
      window.visualViewport.removeEventListener('scroll', onResize)
    }
  }, [])

  return inset
}