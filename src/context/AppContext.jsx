import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { RUCS } from '../data/mockData.js'

const AppContext = createContext(null)

/**
 * AppProvider centraliza el estado que varias pantallas necesitan
 * compartir: RUC activo, filtros (grupo / tipo de vencimiento),
 * navegación entre pantallas, el drawer, el sheet de notas, el
 * selector de contactos, y la consola de actividad.
 *
 * Cuando conectes la API real de Google Sheets, este es el único
 * archivo donde reemplazas "RUCS" (mock) por el resultado de
 * services/googleSheetsApi.js → getRucs().
 */
export function AppProvider({ children }) {
  const [rucs] = useState(RUCS)
  const [activeRucId, setActiveRucId] = useState(RUCS[0].id)
  const [groupFilter, setGroupFilter] = useState('Todos')
  const [vencimientoTipo, setVencimientoTipo] = useState('SIRE')
  const [screen, setScreen] = useState('home')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notesSheetRucId, setNotesSheetRucId] = useState(null)
  const [contactPickerOpen, setContactPickerOpen] = useState(false)
  const [pendingSendCount, setPendingSendCount] = useState(0)
  const [logs, setLogs] = useState([
    { id: 0, ts: new Date(), msg: 'Sincronizando con Google Sheets…' },
  ])

  const activeRuc = useMemo(
    () => rucs.find((r) => r.id === activeRucId) || rucs[0],
    [rucs, activeRucId]
  )

  const visibleRucs = useMemo(
    () => (groupFilter === 'Todos' ? rucs : rucs.filter((r) => r.grupo === groupFilter)),
    [rucs, groupFilter]
  )

  const pushLog = useCallback((msg) => {
    setLogs((prev) => {
      const next = [...prev, { id: prev.length ? prev[prev.length - 1].id + 1 : 0, ts: new Date(), msg }]
      // conserva solo las últimas 50 líneas, igual que el prototipo HTML
      return next.length > 50 ? next.slice(next.length - 50) : next
    })
  }, [])

  const goScreen = useCallback((id) => setScreen(id), [])

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
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}
