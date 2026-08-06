import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { getRucs, getTributos, getAllNotas, saveNotas } from '../services/googleSheetsApi.js'
import { normalizeRuc } from '../utils/normalizeRuc.js'
import { normalizeTributos } from '../utils/tributosPalette.js'
import { useReminders } from '../hooks/useReminders.js'
import { useLocalStorage } from '../hooks/useLocalStorage.js'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [rucs, setRucs] = useState([])
  const [tributos, setTributos] = useState([])
  const { permission: notifPermission, requestPermission: requestNotifPermission } = useReminders(rucs)
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

  // Caché local (offline) — se sincroniza con el Sheet apenas hay conexión.
  const [allNotas, setAllNotas] = useLocalStorage('tributaplus_notas', {})
  const allNotasRef = useRef(allNotas)
  useEffect(() => { allNotasRef.current = allNotas }, [allNotas])
  const saveTimers = useRef({})

  const [logs, setLogs] = useState([{ id: 0, ts: new Date(), msg: 'Iniciando Tributa+…' }])

  const pushLog = useCallback((msg) => {
    setLogs((prev) => {
      const nextId = prev.length ? prev[prev.length - 1].id + 1 : 0
      const next = [...prev, { id: nextId, ts: new Date(), msg }]
      return next.length > 50 ? next.slice(next.length - 50) : next
    })
  }, [])

  const goScreen = useCallback((id) => setCurrentScreen(id), [])

  // ── Guardado en la nube, con espera breve para no saturar mientras escribes ──
  const scheduleCloudSave = useCallback((rucId, notas) => {
    if (saveTimers.current[rucId]) clearTimeout(saveTimers.current[rucId])
    saveTimers.current[rucId] = setTimeout(async () => {
      try {
        await saveNotas(rucId, notas)
        pushLog('☁ Notas sincronizadas con Google Sheets')
      } catch (err) {
        pushLog(`✗ No se pudo guardar en Sheets (quedó guardado en este celular): ${err?.message || err}`)
      }
    }, 900)
  }, [pushLog])

  // Fuerza el guardado inmediato (usado por el botón "Guardar notas").
  const flushNotasForRuc = useCallback(async (rucId) => {
    if (saveTimers.current[rucId]) {
      clearTimeout(saveTimers.current[rucId])
      delete saveTimers.current[rucId]
    }
    const notas = allNotasRef.current[rucId]
    if (!notas) return
    try {
      await saveNotas(rucId, notas)
      pushLog('☁ Notas sincronizadas con Google Sheets')
    } catch (err) {
      pushLog(`✗ No se pudo guardar en Sheets (quedó guardado en este celular): ${err?.message || err}`)
    }
  }, [pushLog])

  const sincronizarDatos = useCallback(async () => {
    setSyncing(true)
    setSyncError(null)
    try {
      const [rucsRes, tributosRes, notasRes] = await Promise.all([getRucs(), getTributos(), getAllNotas()])

      if (rucsRes?.ok && Array.isArray(rucsRes.data)) {
        const normalizados = rucsRes.data.map(normalizeRuc)
        setRucs(normalizados)
        setActiveRucId((prev) => (prev && normalizados.some((r) => r.id === prev) ? prev : normalizados[0]?.id ?? null))
        pushLog(`Google Sheets sincronizado — ${normalizados.length} RUC(s) leídos`)
      } else {
        throw new Error(rucsRes?.error || 'Respuesta inesperada del Apps Script (RUCs)')
      }

      if (tributosRes?.ok && Array.isArray(tributosRes.data)) {
        setTributos(normalizeTributos(tributosRes.data))
      } else {
        pushLog(`⚠ No se pudo leer la hoja "Tributos": ${tributosRes?.error || 'respuesta inesperada'}`)
      }

      if (notasRes?.ok && notasRes.data && typeof notasRes.data === 'object') {
        const notasNormalizadas = Object.fromEntries(
          Object.entries(notasRes.data).map(([rucId, n]) => [
            rucId,
            { observaciones: n?.observaciones || '', tributos: Array.isArray(n?.tributos) ? n.tributos : [] },
          ])
        )
        setAllNotas(notasNormalizadas)
        pushLog('☁ Notas cargadas desde Google Sheets')
      } else {
        pushLog(`⚠ No se pudieron cargar las notas de la nube — usando la copia local: ${notasRes?.error || 'respuesta inesperada'}`)
      }
    } catch (err) {
      const msg = err?.message || String(err)
      setSyncError(msg)
      pushLog(`✗ Error al sincronizar: ${msg}`)
    } finally {
      setSyncing(false)
    }
  }, [pushLog, setAllNotas])

  const activeRuc = useMemo(() => rucs.find((r) => r.id === activeRucId) || rucs[0] || null, [rucs, activeRucId])

  const availableGroups = useMemo(() => {
    const set = new Set(rucs.map((r) => r.grupo).filter(Boolean))
    return ['Todos', ...Array.from(set).sort()]
  }, [rucs])

  const visibleRucs = useMemo(
    () => (groupFilter === 'Todos' ? rucs : rucs.filter((r) => r.grupo === groupFilter)),
    [rucs, groupFilter]
  )

  const tributosBase = useMemo(() => tributos.filter((t) => t.esBase), [tributos])

  const getNotasForRuc = useCallback((rucId) => {
    const raw = allNotas[rucId]
    return {
      observaciones: raw?.observaciones || '',
      tributos: Array.isArray(raw?.tributos) ? raw.tributos : [],
    }
  }, [allNotas])

  const updateNotasForRuc = useCallback((rucId, patch) => {
    setAllNotas((prev) => {
      const next = { ...prev, [rucId]: { ...(prev[rucId] || { observaciones: '', tributos: [] }), ...patch } }
      scheduleCloudSave(rucId, next[rucId])
      return next
    })
  }, [setAllNotas, scheduleCloudSave])

  const addTributoToRuc = useCallback((rucId, data) => {
    const actuales = allNotasRef.current[rucId]?.tributos || []
    const nuevo = { id: 't' + Date.now(), recordar: true, ...data }
    updateNotasForRuc(rucId, { tributos: [...actuales, nuevo] })
    return nuevo
  }, [updateNotasForRuc])

  const updateTributoDeRuc = useCallback((rucId, tributoId, field, value) => {
    const actuales = allNotasRef.current[rucId]?.tributos || []
    updateNotasForRuc(rucId, { tributos: actuales.map((t) => (t.id === tributoId ? { ...t, [field]: value } : t)) })
  }, [updateNotasForRuc])

  const toggleRecordarTributo = useCallback((rucId, tributoId) => {
    const actuales = allNotasRef.current[rucId]?.tributos || []
    updateNotasForRuc(rucId, { tributos: actuales.map((t) => (t.id === tributoId ? { ...t, recordar: !t.recordar } : t)) })
  }, [updateNotasForRuc])

  const removeTributoDeRuc = useCallback((rucId, tributoId) => {
    const actuales = allNotasRef.current[rucId]?.tributos || []
    updateNotasForRuc(rucId, { tributos: actuales.filter((t) => t.id !== tributoId) })
  }, [updateNotasForRuc])

  const recordatoriosActivos = useMemo(() => {
    const lista = []
    Object.entries(allNotas).forEach(([rucId, nota]) => {
      const ruc = rucs.find((r) => r.id === rucId)
      ;(nota.tributos || []).forEach((t) => {
        if (t.recordar) lista.push({ ...t, rucId, rucNombre: ruc?.razonSocial || rucId, rucNumero: ruc?.ruc || '' })
      })
    })
    lista.sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`))
    return lista
  }, [allNotas, rucs])

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
    notifPermission, requestNotifPermission,
    tributos, tributosBase,
    getNotasForRuc, updateNotasForRuc, addTributoToRuc,
    updateTributoDeRuc, toggleRecordarTributo, removeTributoDeRuc,
    flushNotasForRuc,
    recordatoriosActivos,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}