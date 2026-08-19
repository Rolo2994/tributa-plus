import React from 'react'
import { useApp } from '../context/AppContext.jsx'

/**
 * Panel del botón de 3 rayas — combina:
 *  (A) Centro de actividad: versión legible de la consola, para revisar
 *      qué pasó (sincronizaciones, recordatorios disparados, notas
 *      guardadas), no solo para depurar.
 *  (B) Cuenta/perfil: resumen rápido + accesos directos a Ajustes y
 *      bloqueo, como el menú de avatar de apps tipo Revolut/N26.
 */
export default function AccountActivityPanel() {
  const { accountPanelOpen, setAccountPanelOpen, rucs, todosLosRecordatorios, logs, goScreen } = useApp()

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
        {/* ── Cabecera de cuenta ── */}
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

        {/* ── Accesos rápidos ── */}
        <div className="flex-shrink-0 px-4 py-3 flex gap-2 border-b border-bordersoft">
          <button onClick={() => irA('settings')} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#F1F4F8] text-ink text-[11.5px] font-semibold">
            ⚙ Ajustes
          </button>
          <button onClick={() => irA('inicio')} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#F1F4F8] text-ink text-[11.5px] font-semibold">
            📅 Cronograma
          </button>
        </div>

        {/* ── Centro de actividad ── */}
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

        <button onClick={cerrar} className="flex-shrink-0 m-4 py-3 rounded-xl bg-[#F1F4F8] text-ink font-semibold text-[12.5px]">
          Cerrar
        </button>
      </div>
    </>
  )
}