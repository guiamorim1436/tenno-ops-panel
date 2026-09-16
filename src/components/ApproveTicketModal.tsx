import React, { useState } from 'react';
import { CheckCircle2, MessageSquare, Send, Copy, Check, X, Users } from 'lucide-react';
import { Ticket, TeamMember } from '../types';

interface ApproveTicketModalProps {
  isOpen: boolean;
  ticket: Ticket | null;
  members: TeamMember[];
  onClose: () => void;
  onConfirmApproval: (
    ticketId: string, 
    assigneeId: string, 
    sendWhatsApp: boolean, 
    customMessage?: string
  ) => Promise<void>;
}

export const ApproveTicketModal: React.FC<ApproveTicketModalProps> = ({
  isOpen,
  ticket,
  members,
  onClose,
  onConfirmApproval
}) => {
  if (!isOpen || !ticket) return null;

  const [assigneeId, setAssigneeId] = useState<string>(ticket.assignee_id || '2');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedMember = members.find(m => m.id === assigneeId) || members[1];

  const deadlineText = ticket.sla_deadline
    ? new Date(ticket.sla_deadline).toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Até amanhã';

  const defaultMessage = `Olá! 👋 Registramos sua solicitação sob o protocolo *#${ticket.ticket_code}*:
📌 *Demanda:* ${ticket.title}
⏳ *Previsão de Entrega:* ${deadlineText} (SLA ${ticket.sla_hours_target}h úteis)
👨‍💻 *Responsável:* ${selectedMember?.name || 'Equipe TENNO'}

Qualquer novidade ou atualização, avisaremos por aqui! 🚀`;

  const [messageText, setMessageText] = useState(defaultMessage);

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApproveAndSend = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmApproval(ticket.id, assigneeId, true, messageText);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveOnly = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmApproval(ticket.id, assigneeId, false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f1523] border border-emerald-500/40 rounded-2xl w-full max-w-xl shadow-2xl p-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Aprovar Demanda & Notificar</h3>
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

        <div className="mt-5 space-y-4">
          {/* Seletor de Responsável */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              Designar Responsável:
            </label>
            <div className="grid grid-cols-2 gap-3">
              {members.map(m => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setAssigneeId(m.id)}
                  className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                    assigneeId === m.id
                      ? 'bg-emerald-500/15 border-emerald-500 text-white font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-white">{m.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {m.role === 'lider_tecnico' ? 'Líder Técnico' : 'Operacional'}
                    </p>
                  </div>
                  {assigneeId === m.id && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Mensagem para o WhatsApp */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                Mensagem de Confirmação para o Grupo:
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <textarea
              rows={5}
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            {ticket.origin_whatsapp_group_id ? (
              <p className="text-[11px] text-emerald-400/80 mt-1">
                ✓ Grupo de destino identificado ({ticket.origin_whatsapp_group_id.slice(0, 18)}...)
              </p>
            ) : (
              <p className="text-[11px] text-amber-400/80 mt-1">
                ⚠️ Demanda manual sem grupo vinculado. Você poderá copiar e colar o texto manualmente.
              </p>
            )}
          </div>

          {/* Botões de Decisão */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleApproveOnly}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition border border-slate-700"
            >
              Apenas Aprovar (Sem Enviar)
            </button>

            <button
              type="button"
              disabled={isSubmitting || !ticket.origin_whatsapp_group_id}
              onClick={handleApproveAndSend}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Enviando...' : 'Sim, Aprovar e Enviar no Grupo'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
