import React from 'react'
import { useApp } from '../context/AppContext.jsx'
import GroupFilterBar from './GroupFilterBar.jsx'

const TIPOS_VENCIMIENTO = ['SIRE', 'DJ Mensual', 'DJ Anual']

export default function AccountActivityPanel() {
  const {
    accountPanelOpen, setAccountPanelOpen, rucs, todosLosRecordatorios, logs, goScreen,
    vencimientoTipo, setVencimientoTipo,
  } = useApp()

  const activos = todosLosRecordatorios.filter((r) => r.recordar)

  function cerrar() {
    setAccountPanelOpen(false)
  }

  function irA(pantalla) {
    goScreen(pantalla)
    cerrar()
  }

  const logsRecientes = [...logs].reverse().slice(0, 25)

  return (
    <>
      <div
        onClick={cerrar}
        className={`absolute inset-0 z-[75] bg-black/50 transition-opacity duration-200 ${
          accountPanelOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />
      <div
        className={`absolute top-0 bottom-0 right-0 z-[76] w-[86%] max-w-[340px] bg-white flex flex-col transition-transform duration-300 ${
          accountPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex-shrink-0 bg-gradient-to-b from-azul-inst to-azul-dark px-5 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M4 21V9L12 3L20 9V21H4Z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M9 21V13H15V21" stroke="#fff" strokeWidth="1.6" />
              </svg>
            </div>
            <div>
              <div className="font-display font-bold text-[15px] text-white">Tributa+</div>
              <div className="text-[11px] text-sky-200/70">Panel del contador</div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <div className="flex-1 bg-white/10 rounded-xl px-3 py-2.5">
              <div className="text-[18px] font-display font-bold text-white leading-none">{rucs.length}</div>
              <div className="text-[9.5px] text-sky-200/70 mt-1">RUCs</div>
            </div>
            <div className="flex-1 bg-white/10 rounded-xl px-3 py-2.5">
              <div className="text-[18px] font-display font-bold text-white leading-none">{activos.length}</div>
              <div className="text-[9.5px] text-sky-200/70 mt-1">Recordatorios activos</div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 px-4 py-3 flex gap-2 border-b border-bordersoft">
          <button onClick={() => irA('settings')} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#F1F4F8] text-ink text-[11.5px] font-semibold">
            ⚙ Ajustes
          </button>
          <button onClick={() => irA('inicio')} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#F1F4F8] text-ink text-[11.5px] font-semibold">
            📅 Cronograma
          </button>
        </div>

        <div className="flex-shrink-0 px-4 py-3 border-b border-bordersoft">
          <div className="text-[10.5px] font-bold text-muted uppercase tracking-wide mb-1.5">Grupo</div>
          <GroupFilterBar />

          <div className="text-[10.5px] font-bold text-muted uppercase tracking-wide mt-3 mb-1.5">Tipo de vencimiento</div>
          <div className="flex bg-[#F1F4F8] rounded-[11px] p-[3px]">
            {TIPOS_VENCIMIENTO.map((t) => (
              <button
                key={t}
                onClick={() => setVencimientoTipo(t)}
                className={`flex-1 py-2 text-[11px] font-semibold rounded-[9px] ${vencimientoTipo === t ? 'bg-white text-azul-inst shadow' : 'text-muted'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="text-[11px] font-bold text-muted uppercase tracking-wide mb-2">Actividad reciente</div>
          {logsRecientes.length === 0 && (
            <div className="text-center text-muted text-[12px] py-8">Sin actividad todavía.</div>
          )}
          {logsRecientes.map((l) => (
            <div key={l.id} className="flex items-start gap-2.5 py-2.5 border-b border-[#F4F6F9]">
              <span className="w-1.5 h-1.5 rounded-full bg-verde mt-1.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-[11.5px] text-ink leading-snug break-words">{l.msg}</div>
                <div className="text-[9.5px] text-muted mt-0.5 font-mono">{l.ts.toTimeString().slice(0, 8)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-shrink-0 px-4 pb-1 text-center text-[9.5px] text-muted">
          Última actualización: {new Date(__BUILD_TIME__).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}
        </div>

        <button onClick={cerrar} className="flex-shrink-0 m-4 py-3 rounded-xl bg-[#F1F4F8] text-ink font-semibold text-[12.5px]">
          Cerrar
        </button>
      </div>
    </>
  )
}