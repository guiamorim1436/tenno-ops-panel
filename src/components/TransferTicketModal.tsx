import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, X, User, Check, AlertCircle } from 'lucide-react';
import { Ticket, GUILHERME_UUID, CAIO_UUID, isGuilherme } from '../types';

interface TransferTicketModalProps {
  isOpen: boolean;
  ticket: Ticket | null;
  onClose: () => void;
  onConfirmTransfer: (ticketId: string, targetMemberId: string, reason?: string) => Promise<void> | void;
}

export const TransferTicketModal: React.FC<TransferTicketModalProps> = ({
  isOpen,
  ticket,
  onClose,
  onConfirmTransfer
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializa o alvo sugerido como o OUTRO membro da equipe
  useEffect(() => {
    if (ticket && isOpen) {
      const isCurrentlyGui = isGuilherme(ticket.assignee_id, ticket.assignee_name);
      // Se está com Guilherme, sugere Caio; se está com Caio, sugere Guilherme
      setSelectedTargetId(isCurrentlyGui ? CAIO_UUID : GUILHERME_UUID);
      setTransferReason('');
    }
  }, [ticket, isOpen]);

  if (!isOpen || !ticket) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetId) return;

    setIsSubmitting(true);
    try {
      await onConfirmTransfer(ticket.id, selectedTargetId, transferReason.trim() || undefined);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCurrentAssigneeGui = isGuilherme(ticket.assignee_id, ticket.assignee_name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f1523] border border-slate-700/60 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-slate-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Transferir Demanda
              </h2>
              <p className="text-xs text-slate-400">
                Reatribua a responsabilidade da tarefa entre a equipe
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo da Demanda */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-400 truncate">
              {ticket.client_name || 'Cliente Geral'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
              #{ticket.ticket_code}
            </span>
          </div>
          <h3 className="text-xs font-medium text-slate-200 line-clamp-2">
            {ticket.title}
          </h3>
          <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
            <span>Responsável atual:</span>
            <span className="font-semibold text-slate-200 flex items-center gap-1">
              <User className="w-3 h-3 text-indigo-400" />
              {isCurrentAssigneeGui ? 'Guilherme' : 'Caio'}
            </span>
          </div>
        </div>

        {/* Formulário de Seleção do Novo Responsável */}
        <form onSubmit={handleConfirm} className="mt-5 space-y-4 flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Transferir para:
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Opção Caio */}
              <button
                type="button"
                onClick={() => setSelectedTargetId(CAIO_UUID)}
                className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 relative ${
                  selectedTargetId === CAIO_UUID
                    ? 'bg-emerald-950/40 border-emerald-500/60 text-white shadow-lg shadow-emerald-950/30'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                {selectedTargetId === CAIO_UUID && (
                  <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
                <div className="font-bold text-xs text-slate-200">Caio Dan</div>
                <div className="text-[10px] text-emerald-400/90 font-medium">
                  Assistente Operacional
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Rotinas, Kommo & Atendimento
                </div>
              </button>

              {/* Opção Guilherme */}
              <button
                type="button"
                onClick={() => setSelectedTargetId(GUILHERME_UUID)}
                className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 relative ${
                  selectedTargetId === GUILHERME_UUID
                    ? 'bg-blue-950/40 border-blue-500/60 text-white shadow-lg shadow-blue-950/30'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                {selectedTargetId === GUILHERME_UUID && (
                  <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
                <div className="font-bold text-xs text-slate-200">Guilherme Amorim</div>
                <div className="text-[10px] text-blue-400/90 font-medium">
                  Líder Técnico & Estratégico
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Bugs, n8n, Webhooks & IA
                </div>
              </button>
            </div>
          </div>

          {/* Motivo / Contexto da Transferência */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Motivo ou orientação para o novo responsável (opcional):
            </label>
            <textarea
              value={transferReason}
              onChange={e => setTransferReason(e.target.value)}
              placeholder="Ex: Ajustei o fluxo do webhook, pode validar o disparo e o funil no Kommo..."
              rows={3}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Aviso informativo */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              A tarefa será movida imediatamente para a fila do novo responsável. Se a tarefa estiver em execução, o foco atual será pausado com segurança.
            </span>
          </div>

          {/* Ações */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedTargetId}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-indigo-950/40"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>{isSubmitting ? 'Transferindo...' : 'Confirmar Transferência'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
