import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react'
import { RUCS } from '../data/mockData.js'
import { getRucs } from '../services/googleSheetsApi.js'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [rucs, setRucs] = useState([]) // Inicializamos como array vacío siempre
  const [activeRucId, setActiveRucId] = useState('0')
  const [groupFilter, setGroupFilter] = useState('Todos')
  const [vencimientoTipo, setVencimientoTipo] = useState('SIRE')
  const [periodoActual, setPeriodoActual] = useState('Enero')
  const [screen, setScreen] = useState('home')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notesSheetRucId, setNotesSheetRucId] = useState(null)
  const [contactPickerOpen, setContactPickerOpen] = useState(false)
  const [pendingSendCount, setPendingSendCount] = useState(0)
  const [logs, setLogs] = useState([
    { id: 0, ts: new Date(), msg: 'Iniciando conexión con Google Sheets…' },
  ])

  const pushLog = useCallback((msg) => {
    setLogs((prev) => {
      const next = [...prev, { id: prev.length ? prev[prev.length - 1].id + 1 : 0, ts: new Date(), msg }]
      return next.length > 50 ? next.slice(next.length - 50) : next
    })
  }, [])

  const sincronizarDatos = useCallback(async () => {
    pushLog('🔄 Sincronizando datos con Google Sheets...')
    try {
      const response = await getRucs()
      if (response && response.ok && Array.isArray(response.data)) {
        const datosAdaptados = response.data
          .filter(r => r && (r.RUC || r.ruc || r.id))
          .map((r) => {
            const rucValor = String(r.RUC || r.ruc || r.id || '').trim()
            return {
              id: rucValor,
              ruc: rucValor,
              razonSocial: r['RAZON SOCIAL'] || r.razonSocial || 'Sin Razón Social',
              // Limpiamos espacios extra al inicio y final del grupo
              grupo: String(r.GRUPO || r.grupo || 'General').trim(), 
              orden: String(r.ORDEN || r.orden || rucValor.slice(-1)).trim(),
              usuarioSol: r.USUARIO || r.usuarioSol || '',
              claveSol: r.CLAVE || r.claveSol || '',
              usuarioAfp: r['USUARIO AFP NET'] || r.usuarioAfp || '',
              claveAfp: r['CLAVE AFP NI'] || r.claveAfp || '',
              vencimientos: Array.isArray(r.vencimientos) ? r.vencimientos : [], 
              alertas: Array.isArray(r.alertas) ? r.alertas : [],
              notas: r.notas || ''
            }
          })

        if (datosAdaptados.length > 0) {
          setRucs(datosAdaptados)
          setActiveRucId(datosAdaptados[0].id)
          pushLog(`✅ ¡Sincronización exitosa! Se cargaron ${datosAdaptados.length} empresas.`)
        } else {
          throw new Error('La hoja de cálculo no devolvió filas válidas.')
        }
      } else {
        throw new Error(response.error || 'La API no devolvió una lista válida.')
      }
    } catch (error) {
      console.error("Error al sincronizar:", error)
      pushLog(`❌ Error al sincronizar: ${error.message || error}. Usando respaldo.`)
      setRucs(RUCS) 
    }
  }, [pushLog])
  
  useEffect(() => {
    sincronizarDatos()
  }, [sincronizarDatos])

  // --- LÓGICA DE GRUPOS DINÁMICOS ---
  const availableGroups = useMemo(() => {
    // 1. Extraer solo los grupos, ignorando vacíos
    const groups = rucs.map(r => r.grupo).filter(g => g && g !== '')
    // 2. Crear un Set para eliminar duplicados, y ordenarlos alfabéticamente
    const uniqueGroups = [...new Set(groups)].sort()
    // 3. Devolver 'Todos' siempre como primera opción, seguido del resto
    return ['Todos', ...uniqueGroups]
  }, [rucs])

  const activeRuc = useMemo(
    () => rucs.find((r) => r.id === activeRucId) || rucs[0] || {},
    [rucs, activeRucId]
  )

  const vencimientoActivo = useMemo(() => {
    if (!activeRuc || !Array.isArray(activeRuc.vencimientos)) return null
    return activeRuc.vencimientos.find(
      (v) => v && v.tipo === vencimientoTipo && String(v.periodo).toLowerCase() === String(periodoActual).toLowerCase()
    ) || { tipo: vencimientoTipo, periodo: periodoActual, fechaVence: 'No programado', estado: 'Pendiente' }
  }, [activeRuc, vencimientoTipo, periodoActual])

  // Filtro corregido para que no sea sensible a mayúsculas/minúsculas
  const visibleRucs = useMemo(() => {
    if (groupFilter === 'Todos') return rucs;
    return rucs.filter((r) => {
      if (!r.grupo) return false;
      return String(r.grupo).toLowerCase() === String(groupFilter).toLowerCase();
    });
  }, [rucs, groupFilter]);

  const goScreen = useCallback((id) => setScreen(id), [])

  const value = {
    rucs: Array.isArray(rucs) ? rucs : [],
    visibleRucs: Array.isArray(visibleRucs) ? visibleRucs : [],
    availableGroups, // EXPORTAMOS LOS GRUPOS DINÁMICOS
    activeRuc,
    activeRucId,
    setActiveRucId,
    groupFilter,
    setGroupFilter,
    vencimientoTipo,
    setVencimientoTipo,
    periodoActual,
    setPeriodoActual,
    vencimientoActivo,
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