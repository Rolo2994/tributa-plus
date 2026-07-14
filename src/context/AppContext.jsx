import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react'
import { RUCS } from '../data/mockData.js'
import { getRucs } from '../services/googleSheetsApi.js'

const AppContext = createContext(null)

/**
 * AppProvider centraliza el estado que varias pantallas necesitan
 * compartir: RUC activo, filtros (grupo / tipo de vencimiento),
 * navegación entre pantallas, el drawer, el sheet de notas, el
 * selector de contactos, y la consola de actividad.
 */
export function AppProvider({ children }) {
  // Ahora rucs es un estado dinámico que empieza con los datos del simulador
  const [rucs, setRucs] = useState(RUCS)
  const [activeRucId, setActiveRucId] = useState(RUCS[0].id)
  const [groupFilter, setGroupFilter] = useState('Todos')
  const [vencimientoTipo, setVencimientoTipo] = useState('SIRE')
  const [screen, setScreen] = useState('home')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notesSheetRucId, setNotesSheetRucId] = useState(null)
  const [contactPickerOpen, setContactPickerOpen] = useState(false)
  const [pendingSendCount, setPendingSendCount] = useState(0)
  const [logs, setLogs] = useState([
    { id: 0, ts: new Date(), msg: 'Iniciando conexión con Google Sheets…' },
  ])

  // Función reutilizable para registrar mensajes en la consola visual de la app
  const pushLog = useCallback((msg) => {
    setLogs((prev) => {
      const next = [...prev, { id: prev.length ? prev[prev.length - 1].id + 1 : 0, ts: new Date(), msg }]
      return next.length > 50 ? next.slice(next.length - 50) : next
    })
  }, [])

  // Función principal para descargar los RUCs reales desde la API
  const sincronizarDatos = useCallback(async () => {
    pushLog('🔄 Sincronizando datos con Google Sheets...')
    try {
      const response = await getRucs()
      if (response && response.ok && response.data) {
        setRucs(response.data)
        // Actualizamos el RUC activo al primero de la lista real si el actual ya no existe
        if (response.data.length > 0) {
          setActiveRucId(response.data[0].id || response.data[0].RUC)
        }
        pushLog('✅ ¡Sincronización exitosa! RUCs actualizados.')
      } else {
        throw new Error(response.error || 'Respuesta de API inválida')
      }
    } catch (error) {
      console.error("Error al sincronizar:", error)
      pushLog(`❌ Error al sincronizar: ${error.message || error}`)
    }
  }, [pushLog])

  // EFECTO: Descargar los datos automáticamente al abrir la aplicación
  useEffect(() => {
    sincronizarDatos()
  }, [sincronizarDatos])

  const activeRuc = useMemo(
    () => rucs.find((r) => (r.id === activeRucId || r.RUC === activeRucId)) || rucs[0],
    [rucs, activeRucId]
  )

  const visibleRucs = useMemo(
    () => (groupFilter === 'Todos' ? rucs : rucs.filter((r) => r.grupo === groupFilter)),
    [rucs, groupFilter]
  )

  const goScreen = useCallback((id) => setScreen(id), [])

  // Añadimos 'sincronizarDatos' al value para que los botones de otras pantallas puedan invocarlo
  const value = {
    rucs,
    visibleRucs,
    activeRuc,
    activeRucId,
    setActiveRucId,
    groupFilter,
    setGroupFilter,
    vencimientoTipo,
    setVencimientoTipo,
    screen,
    goScreen,
    drawerOpen,
    setDrawerOpen,
    notesSheetRucId,
    setNotesSheetRucId,
    contactPickerOpen,
    setContactPickerOpen,
    pendingSendCount,
    setPendingSendCount,
    logs,
    pushLog,
    sincronizarDatos, 
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}