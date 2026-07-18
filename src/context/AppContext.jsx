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
    pushLog('🔄 Sincronizando datos con Google Sheets...');
    try {
      const response = await getRucs();
      
      if (response && response.ok && Array.isArray(response.data)) {
        // Mapeo robusto: buscamos 'GRUPO', 'Grupo' o 'grupo'
        const datosAdaptados = response.data
          .filter(r => r && (r.RUC || r.ruc))
          .map((r) => ({
            ...r,
            id: String(r.RUC || r.ruc).trim(),
            ruc: String(r.RUC || r.ruc).trim(),
            razonSocial: r['RAZON SOCIAL'] || r.razonSocial || 'Sin Razón Social',
            // Aquí está la clave para que detecte los grupos:
            grupo: String(r.GRUPO || r.Grupo || r.grupo || 'Sin Grupo').trim()
          }));

        setRucs(datosAdaptados);
        pushLog(`✅ ¡Sincronización exitosa! Se cargaron ${datosAdaptados.length} empresas.`);
      } else {
        pushLog('❌ Error: Formato de datos inválido.');
      }
    } catch (error) {
      pushLog('❌ Error de conexión: ' + error.message);
    }
  }, []);

  // Cálculo automático de los grupos disponibles
  const availableGroups = useMemo(() => {
    const grupos = ['Todos', ...new Set(rucs.map(r => r.grupo).filter(g => g && g !== 'Sin Grupo'))];
    return grupos;
  }, [rucs]);

  const value = {
    rucs,
    logs,
    pushLog,
    groupFilter,
    setGroupFilter,
    vencimientoTipo,
    setVencimientoTipo,
    sincronizarDatos,
    availableGroups
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);