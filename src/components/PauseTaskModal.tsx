import React, { useState } from 'react';
import { AlertCircle, Pause, X } from 'lucide-react';
import { Ticket, PauseCategory, NextActionBy } from '../types';

interface PauseTaskModalProps {
  isOpen: boolean;
  ticket: Ticket | null;
  onClose: () => void;
  onConfirmPause: (
    ticketId: string, 
    reason: string, 
    category: PauseCategory, 
    nextAction: NextActionBy
  ) => void;
}

export const PauseTaskModal: React.FC<PauseTaskModalProps> = ({
  isOpen,
  ticket,
  onClose,
  onConfirmPause
}) => {
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState<PauseCategory>('aguardando_cliente');
  const [nextAction, setNextAction] = useState<NextActionBy>('cliente');

  if (!isOpen || !ticket) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('O motivo da pausa é obrigatório!');
      return;
    }
    onConfirmPause(ticket.id, reason.trim(), category, nextAction);
    setReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f1523] border border-amber-500/40 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Pause className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Pausar Demanda em Andamento</h3>
              <p className="text-xs text-slate-400">
                #{ticket.ticket_code} • {ticket.client_name}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Ao pausar, o cronômetro desta tarefa será interrompido. É obrigatório registrar o motivo e indicar quem deve destravar a demanda.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Motivo da Pausa <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Ex: Número não está apto para migração WhatsApp Cloud API. Aguardando cliente entrar em contato com a operadora..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Categoria da Pausa
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as PauseCategory)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="aguardando_cliente">🟡 Aguardando Cliente</option>
                <option value="problema_tecnico">🔴 Bloqueio Técnico</option>
                <option value="aguardando_meta">🔵 Aguardando Meta / Terceiro</option>
                <option value="outro">⚪ Outro Motivo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Próxima Ação Por Conta De:
              </label>
              <select
                value={nextAction}
                onChange={e => setNextAction(e.target.value as NextActionBy)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="cliente">👤 Cliente</option>
                <option value="guilherme">👨‍💻 Guilherme (Líder Técnico)</option>
                <option value="caio">🧑‍💻 Caio (Operacional)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20"
            >
              Confirmar Pausa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
