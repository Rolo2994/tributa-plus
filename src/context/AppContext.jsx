import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { getRucs } from '../api/googleSheets';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [rucs, setRucs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [groupFilter, setGroupFilter] = useState('Todos');
  const [vencimientoTipo, setVencimientoTipo] = useState('SIRE');

  const pushLog = (msg) => {
    setLogs(prev => [...prev.slice(-4), `[${new Date().toLocaleTimeString('es-PE', { hour12: false })}] ${msg}`]);
  };

  const sincronizarDatos = useCallback(async () => {
    pushLog('🔄 Sincronizando datos...');
    try {
      const response = await getRucs();
      if (response?.ok && Array.isArray(response.data)) {
        const datosAdaptados = response.data
          .filter(r => r && (r.RUC || r.ruc))
          .map((r) => ({
            ...r,
            id: String(r.RUC || r.ruc).trim(),
            ruc: String(r.RUC || r.ruc).trim(),
            razonSocial: r['RAZON SOCIAL'] || r.razonSocial || 'Sin Razón Social',
            grupo: String(r.GRUPO || r.Grupo || r.grupo || 'Sin Grupo').trim()
          }));
        setRucs(datosAdaptados);
        pushLog(`✅ Sincronización exitosa.`);
      }
    } catch (error) {
      pushLog('❌ Error al sincronizar');
    }
  }, []);

  // Validación: siempre retorna un array, nunca undefined
  const availableGroups = useMemo(() => {
    if (!rucs || rucs.length === 0) return ['Todos'];
    return ['Todos', ...new Set(rucs.map(r => r.grupo).filter(g => g && g !== 'Sin Grupo'))];
  }, [rucs]);

  return (
    <AppContext.Provider value={{ rucs, logs, pushLog, groupFilter, setGroupFilter, vencimientoTipo, setVencimientoTipo, sincronizarDatos, availableGroups }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);