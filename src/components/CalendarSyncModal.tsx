import React, { useState } from 'react';
import { Calendar, X, Copy, Check } from 'lucide-react';
import { isGuilherme } from '../types';

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMemberId: string;
}

export const CalendarSyncModal: React.FC<CalendarSyncModalProps> = ({
  isOpen,
  onClose,
  currentMemberId
}) => {
  if (!isOpen) return null;

  const isGui = isGuilherme(currentMemberId);
  const memberKey = isGui ? 'guilherme' : 'caio';
  const memberName = isGui ? 'Guilherme' : 'Caio';

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tenno-ops-panel.vercel.app';
  const feedUrl = `${origin}/api/calendar-feed?member=${memberKey}`;

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f1523] border border-slate-700/60 rounded-2xl w-full max-w-xl shadow-2xl text-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Sincronização com Google Agenda</h3>
              <p className="text-xs text-slate-400">Integração bidirecional e feed iCal de 1h por tarefa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Opção 1: Adicionar Demanda Direta (1 Clique) */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-white font-semibold text-xs">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[11px] font-bold">1</span>
              <span>Adição Direta por Tarefa (Instantâneo)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed pl-7">
              Ao clicar em <strong>"Iniciar Foco"</strong> ou no botão <strong>"📅 Agenda"</strong> em qualquer card da sua fila, o Google Calendar é aberto automaticamente com o bloco de <strong>1 hora</strong> já preenchido com o título da demanda, cliente e protocolo.
            </p>
          </div>

          {/* Opção 2: Feed iCal Automático */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-white font-semibold text-xs">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px] font-bold">2</span>
              <span>Sincronização Contínua (Feed iCal Oficial)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed pl-7">
              Para que todas as demandas da sua fila apareçam como uma agenda sincronizada no seu Google Calendar:
            </p>

            {/* URL do Feed */}
            <div className="pl-7 space-y-2">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block">
                Link do seu Feed iCal ({memberName}):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={feedUrl}
                  className="flex-1 bg-slate-950 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none select-all"
                />
                <button
                  onClick={handleCopy}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    copied
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Passo a passo */}
            <div className="pl-7 pt-2 space-y-1.5 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>Abra o <strong>Google Agenda</strong> no computador (<a href="https://calendar.google.com" target="_blank" rel="noreferrer" className="text-blue-400 underline">calendar.google.com</a>).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>No menu lateral esquerdo, clique no botão <strong>"+"</strong> ao lado de <em>"Outras agendas"</em>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>Selecione <strong>"Do URL"</strong> e cole o link copiado acima.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>Clique em <strong>"Adicionar agenda"</strong>. O Google sincronizará as demandas ativas!</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
