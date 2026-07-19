import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { getRucs } from '../services/googleSheetsApi.js'
import { normalizeRuc } from '../utils/normalizeRuc.js'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [rucs, setRucs] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState(null)

  const [activeRucId, setActiveRucId] = useState(null)
  const [groupFilter, setGroupFilter] = useState('Todos')
  const [vencimientoTipo, setVencimientoTipo] = useState('SIRE')

  const [currentScreen, setCurrentScreen] = useState('home')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notesSheetRucId, setNotesSheetRucId] = useState(null)
  const [contactPickerOpen, setContactPickerOpen] = useState(false)
  const [pendingSendCount, setPendingSendCount] = useState(0)

  const [logs, setLogs] = useState([
    { id: 0, ts: new Date(), msg: 'Iniciando Tributa+…' },
  ])

  const pushLog = useCallback((msg) => {
    setLogs((prev) => {
      const nextId = prev.length ? prev[prev.length - 1].id + 1 : 0
      const next = [...prev, { id: nextId, ts: new Date(), msg }]
      return next.length > 50 ? next.slice(next.length - 50) : next
    })
  }, [])

  const goScreen = useCallback((id) => setCurrentScreen(id), [])

  const sincronizarDatos = useCallback(async () => {
    setSyncing(true)
    setSyncError(null)
    try {
      const response = await getRucs()
      if (response?.ok && Array.isArray(response.data)) {
        const normalizados = response.data.map(normalizeRuc)
        setRucs(normalizados)
        setActiveRucId((prev) =>
          prev && normalizados.some((r) => r.id === prev) ? prev : normalizados[0]?.id ?? null
        )
        pushLog(`Google Sheets sincronizado — ${normalizados.length} RUC(s) leídos`)
      } else {
        const msg = response?.error || 'Respuesta inesperada del Apps Script'
        setSyncError(msg)
        pushLog(`✗ Error al sincronizar: ${msg}`)
      }
    } catch (err) {
      const msg = err?.message || String(err)
      setSyncError(msg)
      pushLog(`✗ Error al sincronizar: ${msg}`)
    } finally {
      setSyncing(false)
    }
  }, [pushLog])

  const activeRuc = useMemo(
    () => rucs.find((r) => r.id === activeRucId) || rucs[0] || null,
    [rucs, activeRucId]
  )

  const availableGroups = useMemo(() => {
    const set = new Set(rucs.map((r) => r.grupo).filter(Boolean))
    return ['Todos', ...Array.from(set).sort()]
  }, [rucs])

  const visibleRucs = useMemo(
    () => (groupFilter === 'Todos' ? rucs : rucs.filter((r) => r.grupo === groupFilter)),
    [rucs, groupFilter]
  )

  const value = {
    rucs, visibleRucs, activeRuc, activeRucId, setActiveRucId,
    groupFilter, setGroupFilter, availableGroups,
    vencimientoTipo, setVencimientoTipo,
    screen: currentScreen, currentScreen, goScreen,
    drawerOpen, setDrawerOpen,
    notesSheetRucId, setNotesSheetRucId,
    contactPickerOpen, setContactPickerOpen,
    pendingSendCount, setPendingSendCount,
    logs, pushLog,
    syncing, syncError, sincronizarDatos,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}