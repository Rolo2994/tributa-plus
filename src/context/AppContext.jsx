import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { getRucs } from '../services/googleSheetsApi'; // Asegurado con la ruta correcta

const AppContext = createContext();

export function AppProvider({ children }) {
  // Inicializamos con un array vacío [] para que .length siempre sea 0 y no undefined
  const [rucs, setRucs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [groupFilter, setGroupFilter] = useState('Todos');
  const [vencimientoTipo, setVencimientoTipo] = useState('SIRE');

  const pushLog = (msg) => {
    setLogs(prev => [...prev.slice(-4), `[${new Date().toLocaleTimeString('es-PE', { hour12: false })}] ${msg}`]);
  };

  const sincronizarDatos = useCallback(async () => {
    try {
      const response = await getRucs();
      if (response?.ok && Array.isArray(response.data)) {
        setRucs(response.data);
      } else {
        setRucs([]); // Si falla, mantenemos array vacío
      }
    } catch (error) {
      setRucs([]);
      pushLog('❌ Error al sincronizar');
    }
  }, []);

  const availableGroups = useMemo(() => {
    // Protección absoluta contra undefined o null
    if (!rucs || !Array.isArray(rucs)) return ['Todos'];
    const groups = ['Todos', ...new Set(rucs.map(r => r.grupo).filter(g => g))];
    return groups;
  }, [rucs]);

  return (
    <AppContext.Provider value={{ rucs, logs, pushLog, groupFilter, setGroupFilter, vencimientoTipo, setVencimientoTipo, sincronizarDatos, availableGroups }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);