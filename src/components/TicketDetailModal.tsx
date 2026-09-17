import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, Clock, User, Tag, FileText, MessageSquare, AlertTriangle } from 'lucide-react';
import { Ticket } from '../types';

interface TicketDetailModalProps {
  isOpen: boolean;
  ticket: Ticket | null;
  onClose: () => void;
  onApprove: (ticket: Ticket) => void;
  onReject: (ticketId: string, reason: string) => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  isOpen,
  ticket,
  onClose,
  onApprove,
  onReject
}) => {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (!isOpen || !ticket) return null;

  const createdAt = new Date(ticket.created_at).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    onReject(ticket.id, rejectReason.trim());
    setRejectReason('');
    setShowRejectForm(false);
    onClose();
  };

  const handleApprove = () => {
    onApprove(ticket);
    onClose();
  };

  const priorityConfig = {
    urgente: { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/30' },
    normal: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' },
    baixa: { bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-slate-700' }
  };

  const prio = priorityConfig[ticket.priority] || priorityConfig.normal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f1523] border border-slate-700/60 rounded-2xl w-full max-w-2xl shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Detalhes da Demanda</h3>
              <p className="text-xs text-slate-400">
                #{ticket.ticket_code} • Aguardando aprovação
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

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Título */}
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1 block">
              Título
            </label>
            <h4 className="text-sm font-semibold text-white leading-relaxed">
              {ticket.title}
            </h4>
          </div>

          {/* Descrição */}
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1 block">
              Descrição
            </label>
            {ticket.description ? (
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </div>
            ) : (
              <p className="text-xs text-slate-600 italic">
                Nenhuma descrição disponível para esta demanda.
              </p>
            )}
          </div>

          {/* Grid de Metadados */}
          <div className="grid grid-cols-2 gap-4">
            {/* Cliente */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <User className="w-3 h-3 text-emerald-400" />
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  Cliente
                </span>
              </div>
              <p className="text-xs font-semibold text-emerald-400">
                {ticket.client_name || 'Não definido'}
              </p>
            </div>

            {/* Prioridade */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Tag className="w-3 h-3 text-amber-400" />
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  Prioridade
                </span>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${prio.bg} ${prio.text} border ${prio.border}`}>
                {ticket.priority}
              </span>
            </div>

            {/* Data de Criação */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3 h-3 text-sky-400" />
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  Criada em
                </span>
              </div>
              <p className="text-xs text-slate-300">{createdAt}</p>
            </div>

            {/* Origem */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <MessageSquare className="w-3 h-3 text-purple-400" />
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  Origem
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {ticket.origin_whatsapp_group_id
                  ? `WhatsApp (${ticket.origin_whatsapp_group_id.slice(0, 18)}...)`
                  : 'Criação manual'}
              </p>
            </div>
          </div>

          {/* Formulário de Rejeição */}
          {showRejectForm && (
            <div className="bg-rose-500/5 border border-rose-500/30 rounded-xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold text-rose-300">Motivo da Rejeição</span>
              </div>
              <textarea
                autoFocus
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Explique brevemente por que esta demanda está sendo rejeitada..."
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-rose-500/30 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowRejectForm(false); setRejectReason(''); }}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  disabled={!rejectReason.trim()}
                  onClick={handleReject}
                  className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Confirmar Rejeição
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Ações */}
        {!showRejectForm && (
          <div className="p-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              onClick={() => setShowRejectForm(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold text-xs transition flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              Rejeitar
            </button>

            <button
              onClick={handleApprove}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Aprovar & Notificar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
