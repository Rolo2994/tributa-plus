import React, { useState, useEffect } from 'react'
import { useApp } from './context/AppContext.jsx'
import Header from './components/Header.jsx'
import TopBar from './components/TopBar.jsx'
import BottomNav from './components/BottomNav.jsx'
import SidebarNav from './components/SidebarNav.jsx'
import Drawer from './components/Drawer.jsx'
import LockScreen from './components/LockScreen.jsx'
import NotesSheet from './components/NotesSheet.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import AccountActivityPanel from './components/AccountActivityPanel.jsx'
import { useReminders } from './hooks/useReminders.js'

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
  sire: SireScreen, settings: SettingsScreen,
}
const SUBSCREENS = new Set(['buzon', 'validez', 'detracc', 'sire'])

const TITULOS = {
  home: 'RUCs', alerts: 'Alertas', inicio: 'Vencimientos', dashboard: 'Dashboard tributario',
  buzon: 'Buzón PDF', validez: 'Validez CP', detracc: 'Detracciones', sire: 'SIRE', settings: 'Ajustes',
}

export default function App() {
  const { currentScreen, sincronizarDatos, syncing, syncError, rucs } = useApp()
  const [locked, setLocked] = useState(true)

  useReminders(rucs)
  useEffect(() => { sincronizarDatos() }, [sincronizarDatos])

  const ActiveScreen = SCREENS[currentScreen] || HomeScreen

  return (
    <>
      {/* La pantalla de bloqueo cubre TODO — sidebar incluido — mientras
          no se desbloquee. Por eso vive fuera del layout, como overlay
          fijo con su propio z-index, no como una pieza más adentro del
          panel de contenido. */}
      <LockScreen visible={locked} onUnlock={() => setLocked(false)} />

      <div className="min-h-[100dvh] flex min-w-0 bg-[#D7DEE8] md:bg-[#EEF2F7]">
        <SidebarNav />

        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Celular: header propio de la app (reloj, candado, RUCs). */}
          <div className="md:hidden">
            <Header onLock={() => setLocked(true)} />
          </div>

          {/* Escritorio: barra superior liviana, sin repetir lo del sidebar. */}
          <div className="hidden md:block">
            <TopBar titulo={TITULOS[currentScreen] || ''} onLock={() => setLocked(true)} />
          </div>

          <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
            <ErrorBoundary>
              {syncError && (
                <div className="mx-4 md:mx-8 mt-2 mb-1 text-[10.5px] bg-[#FCE9EB] text-rojo-sunat px-3 py-2 rounded-lg">
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
        </div>
      </div>

      <ErrorBoundary>
        <Drawer />
        <NotesSheet />
        <AccountActivityPanel />
      </ErrorBoundary>
    </>
  )
}