import React from 'react'
import { useApp } from '../context/AppContext.jsx'

export default function GroupFilterBar() {
  const { groupFilter, setGroupFilter, availableGroups } = useApp()
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
      {availableGroups.map((g) => (
        <button
          key={g}
          onClick={() => setGroupFilter(g)}
          className={`whitespace-nowrap flex-shrink-0 text-[12px] font-semibold px-4 py-2 rounded-full border transition-colors ${
            groupFilter === g ? 'bg-azul-inst text-white border-azul-inst' : 'bg-white text-ink border-bordersoft'
          }`}
        >
          {g}
        </button>
      ))}
    </div>
  )
}