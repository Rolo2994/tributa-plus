import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { obtenerPdfBlob } from '../services/buzonApi.js'

export default function BuzonScreen() {
  const { goScreen, pushLog } = useApp()
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [archivos, setArchivos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [enviando, setEnviando] = useState(null)

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

  useEffect(() => { cargar() }, [fecha]) // eslint-disable-line

  async function verOEnviar(archivo) {
    setEnviando(archivo.id)
    try {
      const blob = await obtenerPdfBlob(archivo.id)
      const file = new File([blob], archivo.nombre, { type: 'application/pdf' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: archivo.nombre })
      } else {
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
      }
    } catch (err) {
      pushLog(`✗ No se pudo abrir/compartir: ${err?.message || err}`)
    } finally {
      setEnviando(null)
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

      <div className="px-4 pt-1 pb-2">
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-full text-[12.5px] px-3 py-2 rounded-xl border border-bordersoft"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-[40px]">
        {cargando && <div className="text-center text-muted text-[12px] py-10">Cargando…</div>}

        {!cargando && archivos.length === 0 && (
          <div className="text-center text-muted text-[12px] py-10">Sin PDFs para esta fecha.</div>
        )}

        {!cargando && archivos.map((a) => (
          <div key={a.id} className="flex gap-2.5 items-center bg-white rounded-xl border border-[#F0F3F7] p-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold truncate">{a.nombre}</div>
            </div>
            <button
              onClick={() => verOEnviar(a)}
              disabled={enviando === a.id}
              className="flex items-center gap-1.5 bg-[#25D366] disabled:opacity-60 text-white text-[11px] font-bold px-3 py-2 rounded-[10px] flex-shrink-0"
            >
              {enviando === a.id ? '…' : 'Ver / Enviar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}