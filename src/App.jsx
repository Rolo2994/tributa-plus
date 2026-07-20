import React, { useState, useEffect } from 'react'
import { useApp } from './context/AppContext.jsx'
import Header from './components/Header.jsx'
import BottomNav from './components/BottomNav.jsx'
import Drawer from './components/Drawer.jsx'
import ConsoleLog from './components/ConsoleLog.jsx'
import LockScreen from './components/LockScreen.jsx'
import NotesSheet from './components/NotesSheet.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

import HomeScreen from './screens/HomeScreen.jsx'
import AlertsScreen from './screens/AlertsScreen.jsx'
import ModulesScreen from './screens/ModulesScreen.jsx'
import BuzonScreen from './screens/BuzonScreen.jsx'
import ValidezScreen from './screens/ValidezScreen.jsx'
import DetraccScreen from './screens/DetraccScreen.jsx'
import SireScreen from './screens/SireScreen.jsx'
import SettingsScreen from './screens/SettingsScreen.jsx'

const SCREENS = {
  home: HomeScreen, alerts: AlertsScreen, modules: ModulesScreen,
  buzon: BuzonScreen, validez: ValidezScreen, detracc: DetraccScreen,
  sire: SireScreen, settings: SettingsScreen,
}
const SUBSCREENS = new Set(['buzon', 'validez', 'detracc', 'sire'])

export default function App() {
  const { currentScreen, sincronizarDatos, syncing, syncError, rucs } = useApp()
  const [locked, setLocked] = useState(true)

  useEffect(() => { sincronizarDatos() }, [sincronizarDatos])

  const ActiveScreen = SCREENS[currentScreen] || HomeScreen

  return (
    // ↓ CAMBIO: sin padding en celular (p-0), con padding solo en pantallas ≥640px (sm:p-7)
    <div className="min-h-[100dvh] flex items-start justify-center bg-[#D7DEE8] p-0 sm:p-7">
      {/* ↓ CAMBIO: ocupa toda la pantalla en celular (h-[100dvh], sin bordes ni marco),
          y solo en pantallas anchas (sm:) recupera el tamaño fijo tipo "maqueta de celular" */}
      <div className="relative w-full max-w-none sm:max-w-[412px] h-[100dvh] sm:h-[860px] bg-bgapp overflow-hidden rounded-none sm:rounded-[38px] shadow-none sm:shadow-phone ring-0 sm:ring-[10px] sm:ring-[#14181d] flex flex-col">
        <LockScreen visible={locked} onUnlock={() => setLocked(false)} />
        <Header onLock={() => setLocked(true)} />

        <div className="flex-1 flex flex-col min-h-0">
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

        <ConsoleLog />
        {!SUBSCREENS.has(currentScreen) && <BottomNav />}

        <Drawer />
        <NotesSheet />
      </div>
    </div>
  )
}