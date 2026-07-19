import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { getRucs } from '../services/googleSheetsApi';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [rucs, setRucs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [groupFilter, setGroupFilter] = useState('Todos');
  const [vencimientoTipo, setVencimientoTipo] = useState('SIRE');
  
  // ESTOS ESTADOS SON NECESARIOS:
  const [notesSheetRucId, setNotesSheetRucId] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('home');

  const goScreen = (screenId) => {
    setCurrentScreen(screenId);
    console.log("Navegando a:", screenId);
  };

  const pushLog = (msg) => {
    setLogs(prev => [...prev.slice(-4), `[${new Date().toLocaleTimeString('es-PE', { hour12: false })}] ${msg}`]);
  };

  const sincronizarDatos = useCallback(async () => {
    try {
      const response = await getRucs();
      if (response?.ok && Array.isArray(response.data)) {
        setRucs(response.data);
      } else {
        setRucs([]);
      }
    } catch (error) {
      setRucs([]);
      pushLog('❌ Error al sincronizar');
    }
  }, []);

  const availableGroups = useMemo(() => {
    if (!rucs || !Array.isArray(rucs)) return ['Todos'];
    return ['Todos', ...new Set(rucs.map(r => r.grupo).filter(g => g))];
  }, [rucs]);

return (
  <AppContext.Provider value={{ 
    rucs, logs, pushLog, groupFilter, setGroupFilter, vencimientoTipo, 
    setVencimientoTipo, sincronizarDatos, availableGroups, currentScreen,
    goScreen, setNotesSheetRucId, visibleRucs: rucs,
    // AGREGAMOS LO QUE FALTABA PARA EL ModulesScreen:
    activeRuc: rucs[0] || { razonSocial: 'Sin RUC', ruc: '000', status: 'ok' },
    setDrawerOpen: () => console.log("Drawer abierto") 
  }}>
    {children}
  </AppContext.Provider>
);
}

export const useApp = () => useContext(AppContext);