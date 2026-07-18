// ... (tus otros estados)
const [notesSheetRucId, setNotesSheetRucId] = useState(null); // Asegúrate de tener este estado
const [currentScreen, setCurrentScreen] = useState('home'); // Estado para la pantalla actual

// Agrega estas funciones
const goScreen = (screenId) => {
  setCurrentScreen(screenId);
  console.log("Navegando a:", screenId);
};

// ... dentro de tu AppProvider, actualiza el value:
return (
  <AppContext.Provider value={{ 
    rucs, 
    logs, 
    pushLog, 
    groupFilter, 
    setGroupFilter, 
    vencimientoTipo, 
    setVencimientoTipo, 
    sincronizarDatos, 
    availableGroups,
    // AGREGAMOS ESTAS DOS LÍNEAS AQUÍ:
    goScreen,
    setNotesSheetRucId,
    // Agregamos visibleRucs que faltaba para que sea consistente con HomeScreen
    visibleRucs: rucs 
  }}>
    {children}
  </AppContext.Provider>
);