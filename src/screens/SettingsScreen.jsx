// ... dentro de tu SettingsScreen.jsx ...

// 1. Obtén 'availableGroups' desde useApp() junto a los otros valores
const { groupFilter, setGroupFilter, vencimientoTipo, setVencimientoTipo, pushLog, availableGroups } = useApp()

// ... más abajo, reemplaza el bloque de botones de grupo por este:

<div className="flex flex-wrap gap-1.5">
  {availableGroups.map((g) => (
    <button
      key={g}
      onClick={() => {
        setGroupFilter(g)
        pushLog(`Filtro de grupo aplicado: ${g}`)
      }}
      className={`text-[11.5px] font-semibold px-3.5 py-2 rounded-full border ${
        groupFilter === g ? 'bg-azul-inst text-white border-azul-inst' : 'bg-[#F1F4F8] text-ink border-transparent'
      }`}
    >
      {g}
    </button>
  ))}
</div>