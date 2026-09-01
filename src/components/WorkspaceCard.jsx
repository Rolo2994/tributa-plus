import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import {
  crearWorkspace, obtenerEstadoWorkspace, guardarAppsScriptUrl,
  guardarNombreCarpeta, urlConectarDrive,
} from '../services/buzonApi.js'

export default function WorkspaceCard() {
  const { pushLog } = useApp()
  const [wsId, setWsId] = useState(() => localStorage.getItem('ezwork_workspace_id') || '')
  const [cargando, setCargando] = useState(true)
  const [appsScriptUrl, setAppsScriptUrl] = useState('')
  const [nombreCarpeta, setNombreCarpeta] = useState('')
  const [driveConectado, setDriveConectado] = useState(false)
  const [guardandoSheet, setGuardandoSheet] = useState(false)
  const [guardandoCarpeta, setGuardandoCarpeta] = useState(false)

  async function inicializar() {
    setCargando(true)
    try {
      let id = wsId
      if (!id) {
        const res = await crearWorkspace()
        if (!res.ok) {
          pushLog(`✗ No se pudo crear tu espacio de trabajo: ${res.error}`)
          setCargando(false)
          return
        }
        id = res.workspace_id
        localStorage.setItem('ezwork_workspace_id', id)
        setWsId(id)
      }
      const estado = await obtenerEstadoWorkspace(id)
      if (estado.ok) {
        setAppsScriptUrl(estado.apps_script_url || '')
        setNombreCarpeta(estado.carpeta_nombre || '')
        setDriveConectado(estado.drive_conectado)
      } else {
        pushLog(`✗ ${estado.error}`)
      }
    } catch (err) {
      pushLog(`✗ Error: ${err?.message || err}`)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { inicializar() }, []) // eslint-disable-line

  async function guardarSheet() {
    if (!appsScriptUrl.trim()) {
      pushLog('⚠ Pega la URL de tu Apps Script antes de guardar.')
      return
    }
    setGuardandoSheet(true)
    try {
      const res = await guardarAppsScriptUrl(wsId, appsScriptUrl.trim())
      if (res.ok) pushLog('✓ URL de Google Sheet guardada')
      else pushLog(`✗ ${res.error}`)
    } catch (err) {
      pushLog(`✗ Error: ${err?.message || err}`)
    } finally {
      setGuardandoSheet(false)
    }
  }

  async function guardarCarpeta() {
    if (!nombreCarpeta.trim()) {
      pushLog('⚠ Escribe un nombre para tu carpeta de Drive.')
      return
    }
    setGuardandoCarpeta(true)
    try {
      const res = await guardarNombreCarpeta(wsId, nombreCarpeta.trim())
      if (res.ok) pushLog('✓ Carpeta de Drive configurada')
      else pushLog(`✗ ${res.error}`)
    } catch (err) {
      pushLog(`✗ Error: ${err?.message || err}`)
    } finally {
      setGuardandoCarpeta(false)
    }
  }

  function conectarDrive() {
    window.location.href = urlConectarDrive(wsId)
  }

  return (
    <div className="bg-white rounded-2xl p-3.5 mb-2.5 shadow-sm">
      <div className="font-bold text-[12.5px] mb-2.5">Cuenta de BuzónPDF</div>

      {cargando ? (
        <div className="text-[11px] text-muted py-2">Cargando…</div>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="text-[10.5px] text-muted mb-1.5">
              1. Tu Google Sheet (URL de Apps Script, la que termina en /exec)
            </div>
            <input
              type="text"
              value={appsScriptUrl}
              onChange={(e) => setAppsScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="w-full text-[11.5px] px-3 py-2 rounded-xl border border-gray-200 mb-1.5"
            />
            <button
              onClick={guardarSheet}
              disabled={guardandoSheet}
              className="w-full bg-blue-600 disabled:opacity-60 text-white text-[11.5px] font-semibold py-2 rounded-xl"
            >
              {guardandoSheet ? 'Guardando…' : 'Guardar Sheet'}
            </button>
          </div>

          <div>
            <div className="text-[10.5px] text-muted mb-1.5">
              2. Tu Google Drive
              {driveConectado ? ' — ya conectado' : ' — sin conectar todavía'}
            </div>
            <button
              onClick={conectarDrive}
              className={`w-full text-[11.5px] font-semibold py-2 rounded-xl ${driveConectado ? 'bg-green-50 text-green-700' : 'bg-[#25D366] text-white'}`}
            >
              {driveConectado ? '✓ Drive conectado — reconectar' : 'Conectar mi Google Drive'}
            </button>
          </div>

          <div className={!driveConectado ? 'opacity-50 pointer-events-none' : ''}>
            <div className="text-[10.5px] text-muted mb-1.5">
              3. Nombre de tu carpeta en Drive
            </div>
            <input
              type="text"
              value={nombreCarpeta}
              onChange={(e) => setNombreCarpeta(e.target.value)}
              placeholder="Ej: Notificaciones SUNAT"
              className="w-full text-[11.5px] px-3 py-2 rounded-xl border border-gray-200 mb-1.5"
            />
            <button
              onClick={guardarCarpeta}
              disabled={guardandoCarpeta}
              className="w-full bg-blue-600 disabled:opacity-60 text-white text-[11.5px] font-semibold py-2 rounded-xl"
            >
              {guardandoCarpeta ? 'Guardando…' : 'Guardar nombre'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}