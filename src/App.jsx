import React, { useState, useEffect } from 'react'
import { useApp } from './context/AppContext.jsx'
import Header from './components/Header.jsx'
import BottomNav from './components/BottomNav.jsx'
import SidebarNav from './components/SidebarNav.jsx'
import Drawer from './components/Drawer.jsx'
import LockScreen from './components/LockScreen.jsx'
import NotesSheet from './components/NotesSheet.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import AccountActivityPanel from './components/AccountActivityPanel.jsx'
import { useReminders } from './hooks/useReminders.js'
import BuzonEjecutarScreen from './screens/BuzonEjecutarScreen.jsx'

import HomeScreen from './screens/HomeScreen.jsx'
import AlertsScreen from './screens/AlertsScreen.jsx'
import InicioScreen from './screens/InicioScreen.jsx'
import DashboardScreen from './screens/DashboardScreen.jsx'
import BuzonScreen from './screens/BuzonScreen.jsx'
import ValidezScreen from './screens/ValidezScreen.jsx'
import DetraccScreen from './screens/DetraccScreen.jsx'
import SireScreen from './screens/SireScreen.jsx'
import SettingsScreen from './screens/SettingsScreen.jsx'

const SCREENS = {
  home: HomeScreen, alerts: AlertsScreen, inicio: InicioScreen, dashboard: DashboardScreen,
  buzon: BuzonScreen, validez: ValidezScreen, detracc: DetraccScreen,
  sire: SireScreen, settings: SettingsScreen,'buzon-ejecutar': BuzonEjecutarScreen,
}
const SUBSCREENS = new Set(['buzon', 'validez', 'detracc', 'sire', 'buzon-ejecutar'])

export default function App() {
  const { currentScreen, sincronizarDatos, syncing, syncError, rucs } = useApp()
  const [locked, setLocked] = useState(true)

  useReminders(rucs)
  useEffect(() => { sincronizarDatos() }, [sincronizarDatos])

  const ActiveScreen = SCREENS[currentScreen] || HomeScreen

  return (
    // ── Contenedor raíz: en celular es una sola columna a pantalla
    // completa; a partir de "md" (tablet/PC) se convierte en un layout
    // de escritorio con barra lateral fija + panel de contenido ancho. ──
    <div className="min-h-[100dvh] flex min-w-0 bg-[#D7DEE8] md:bg-[#EEF2F7]">
      <SidebarNav />

       <div className="flex-1 flex min-w-0 md:items-stretch">
        <div className="relative w-full min-w-0 max-w-full h-[100dvh] md:max-w-[1180px] md:mx-auto bg-bgapp overflow-hidden flex flex-col">
          <LockScreen visible={locked} onUnlock={() => setLocked(false)} />
          <Header onLock={() => setLocked(true)} />

          <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
            <ErrorBoundary>
              {syncError && (
                <div className="mx-4 mt-2 mb-1 text-[10.5px] bg-[#FCE9EB] text-rojo-sunat px-3 py-2 rounded-lg">
                  No se pudo sincronizar con Google Sheets: {syncError}
                </div>
              )}
              {syncing && rucs.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted text-[12px]">
                  Sincronizando con Google Sheets…
                </div>
              ) : (
                <ActiveScreen />
              )}
            </ErrorBoundary>
          </div>

          {!SUBSCREENS.has(currentScreen) && (
            <div className="md:hidden">
              <BottomNav />
            </div>
          )}

          <ErrorBoundary>
            <Drawer />
            <NotesSheet />
            <AccountActivityPanel />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}