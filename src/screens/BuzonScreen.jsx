import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { listarPdfs, obtenerPdfBlob } from '../services/buzonApi.js'

export default function BuzonScreen() {
  const { goScreen, pushLog } = useApp()
  const [fecha, setFecha] = useState(() => {
    const ahora = new Date()
    const peru = new Date(ahora.getTime() - 5 * 60 * 60 * 1000) // Peru = UTC-5
    return peru.toISOString().slice(0, 10)
  })
  const [archivos, setArchivos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [colaEnvio, setColaEnvio] = useState([])

  async function cargar() {
    setCargando(true)
    try {
      const res = await listarPdfs(fecha)
      if (res.ok) {
        setArchivos(res.archivos)
      } else {
        pushLog(`✗ ${res.error}`)
        setArchivos([])
      }
    } catch (err) {
      pushLog(`✗ Error: ${err?.message || err}`)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar(); setSeleccionados(new Set()) }, [fecha]) // eslint-disable-line

  function toggle(id) {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function armarTexto(archivo) {
    const fechaHora = [archivo.fecha, archivo.hora].filter(Boolean).join(' ')
    const partes = [fechaHora, archivo.razon].filter(Boolean)
    return partes.join(' | ')
  }

  async function enviarUno(archivo) {
    const blob = await obtenerPdfBlob(archivo.id)
    const file = new File([blob], archivo.nombre, { type: 'application/pdf' })
    const texto = armarTexto(archivo)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: archivo.nombre, text: texto })
    } else {
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    }
  }

  async function verOEnviar(archivo) {
    setEnviando(true)
    try {
      await enviarUno(archivo)
    } catch (err) {
      pushLog(`✗ No se pudo abrir/compartir: ${err?.message || err}`)
    } finally {
      setEnviando(false)
    }
  }

  function iniciarEnvioSeleccionados() {
     if (seleccionados.size === 0) return
     const lista = archivos.filter((a) => seleccionados.has(a.id))
     setColaEnvio(lista)
  }

  async function enviarSiguienteDeLaCola() {
      if (colaEnvio.length === 0) return
      const [actual, ...resto] = colaEnvio
      setEnviando(true)
      try {
        await enviarUno(actual)
      } catch (err) {
        pushLog(`✗ No se pudo enviar "${actual.nombre}": ${err?.message || err}`)
      } finally {
        setEnviando(false)
        setColaEnvio(resto)
      }
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-1.5">
        <button onClick={() => goScreen('dashboard')} className="w-8 h-8 rounded-[9px] bg-white border border-bordersoft flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="#0B3A60" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="font-display font-bold text-[15px]">Buzón PDF</div>
      </div>

      <div className="px-4 pt-1 pb-2 flex items-center gap-2">
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="flex-1 text-[12.5px] px-3 py-2 rounded-xl border border-bordersoft"
        />
        {archivos.length > 0 && (
          <button
            onClick={() => setSeleccionados(seleccionados.size === archivos.length ? new Set() : new Set(archivos.map((a) => a.id)))}
            className="text-[11px] font-semibold text-azul-inst whitespace-nowrap"
          >
            {seleccionados.size === archivos.length ? 'Ninguno' : 'Todos'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-[90px]">
        {cargando && <div className="text-center text-muted text-[12px] py-10">Cargando…</div>}

        {!cargando && archivos.length === 0 && (
          <div className="text-center text-muted text-[12px] py-10">Sin PDFs para esta fecha.</div>
        )}

        {!cargando && archivos.map((a) => (
          <div key={a.id} className="flex gap-2.5 items-center bg-white rounded-xl border border-[#F0F3F7] p-3 mb-2">
            <button
              onClick={() => toggle(a.id)}
              className={`w-[19px] h-[19px] rounded-md border-[1.6px] flex-shrink-0 flex items-center justify-center text-[12px] ${
                seleccionados.has(a.id) ? 'bg-azul-inst border-azul-inst text-white' : 'border-[#C9D6E4]'
              }`}
            >
              {seleccionados.has(a.id) ? '✓' : ''}
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold truncate">{a.nombre}</div>
              {(a.fecha || a.razon) && (
                <div className="text-[10.5px] text-muted truncate">{armarTexto(a)}</div>
              )}
            </div>
            <button
              onClick={() => verOEnviar(a)}
              disabled={enviando}
              className="flex items-center gap-1.5 bg-[#25D366] disabled:opacity-60 text-white text-[11px] font-bold px-3 py-2 rounded-[10px] flex-shrink-0"
            >
              Ver / Enviar
            </button>
          </div>
        ))}
      </div>

      {colaEnvio.length > 0 ? (
         <div className="absolute left-3.5 right-3.5 bottom-3.5 z-[15] bg-azul-dark rounded-2xl px-4 py-3 flex items-center justify-between shadow-float">
             <span className="text-white text-[11.5px] font-semibold truncate mr-2">
                  Falta{colaEnvio.length > 1 ? 'n' : ''} {colaEnvio.length}: {colaEnvio[0].nombre.slice(0, 30)}…
             </span>
             <button
                 onClick={enviarSiguienteDeLaCola}
                 disabled={enviando}
                 className="bg-[#25D366] disabled:opacity-60 text-white text-[12px] font-bold px-4 py-2.5 rounded-[10px] flex-shrink-0"
             >
                 {enviando ? '…' : 'Enviar este'}
             </button>
         </div>
      ) : seleccionados.size > 0 && (
        <div className="absolute left-3.5 right-3.5 bottom-3.5 z-[15] bg-azul-dark rounded-2xl px-4 py-3 flex items-center justify-between shadow-float">
            <span className="text-white text-[12px] font-semibold">{seleccionados.size} seleccionado(s)</span>
            <button
                onClick={iniciarEnvioSeleccionados}
                className="bg-[#25D366] text-white text-[12px] font-bold px-4 py-2.5 rounded-[10px]"
            >
                Empezar a enviar
            </button>
        </div>
      )}
    </div>
  )
}