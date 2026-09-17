import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  MessageSquare, 
  Send, 
  Copy, 
  Check, 
  X, 
  Users, 
  XCircle, 
  AlertTriangle,
  Clock,
  Layers
} from 'lucide-react';
import { Ticket, TeamMember, SlaSettings } from '../types';

interface ApproveTicketModalProps {
  isOpen: boolean;
  ticket: Ticket | null;
  members: TeamMember[];
  allTickets?: Ticket[];
  slaSettings?: SlaSettings;
  onClose: () => void;
  onConfirmApproval: (
    ticketId: string, 
    assigneeId: string, 
    sendWhatsApp: boolean, 
    customMessage?: string,
    calculatedDeadlineIso?: string
  ) => Promise<void>;
  onReject?: (ticketId: string, reason: string) => void;
}

// Função auxiliar para projetar horas comerciais úteis (09h às 18h, seg-sex)
function addBusinessHours(startDate: Date, businessHours: number, startHour = 9, endHour = 18): Date {
  const date = new Date(startDate.getTime());
  let remaining = businessHours;

  while (remaining > 0) {
    const dow = date.getDay();
    if (dow === 0) { // Domingo -> Segunda
      date.setDate(date.getDate() + 1);
      date.setHours(startHour, 0, 0, 0);
      continue;
    }
    if (dow === 6) { // Sábado -> Segunda
      date.setDate(date.getDate() + 2);
      date.setHours(startHour, 0, 0, 0);
      continue;
    }

    const curH = date.getHours() + date.getMinutes() / 60;
    if (curH < startHour) {
      date.setHours(startHour, 0, 0, 0);
      continue;
    }
    if (curH >= endHour) {
      date.setDate(date.getDate() + 1);
      date.setHours(startHour, 0, 0, 0);
      continue;
    }

    const leftToday = endHour - curH;
    if (remaining <= leftToday) {
      date.setTime(date.getTime() + remaining * 3600 * 1000);
      remaining = 0;
    } else {
      remaining -= leftToday;
      date.setDate(date.getDate() + 1);
      date.setHours(startHour, 0, 0, 0);
    }
  }
  return date;
}

export const ApproveTicketModal: React.FC<ApproveTicketModalProps> = ({
  isOpen,
  ticket,
  members,
  allTickets = [],
  slaSettings,
  onClose,
  onConfirmApproval,
  onReject
}) => {
  if (!isOpen || !ticket) return null;

  const [assigneeId, setAssigneeId] = useState<string>(ticket.assignee_id || '2');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const selectedMember = members.find(m => m.id === assigneeId) || members[1];

  // Cálculo da posição na fila e previsão de entrega baseada na fila do responsável
  const queueCalculation = useMemo(() => {
    const startH = slaSettings?.work_start_hour ?? 9;
    const endH = slaSettings?.work_end_hour ?? 18;

    // Tarefas que já estão com o responsável selecionado
    const memberQueue = allTickets.filter(
      t => t.assignee_id === assigneeId && 
           t.status !== 'pending_approval' && 
           t.status !== 'completed' && 
           t.status !== 'rejected' &&
           t.id !== ticket.id
    );

    let queuePosition = 1;
    let queueWaitHours = 0;

    if (ticket.priority === 'urgente') {
      // Urgência fura a fila: vai para o topo, logo após a tarefa em execução
      const inProgress = memberQueue.find(t => t.status === 'in_progress');
      if (inProgress) {
        queuePosition = 2;
        queueWaitHours = 2; // estimativa média de término da tarefa ativa
      } else {
        queuePosition = 1;
        queueWaitHours = 0;
      }
    } else {
      // Normal ou Baixa: vai para o final da fila de espera
      queuePosition = memberQueue.length + 1;
      // Soma horas estimadas das tarefas à frente
      for (const t of memberQueue) {
        queueWaitHours += t.priority === 'urgente' ? 3 : 2;
      }
    }

    const slaHours = ticket.sla_hours_target || (ticket.priority === 'urgente' ? 4 : ticket.priority === 'normal' ? 24 : 72);
    const totalProjectedHours = queueWaitHours + slaHours;
    const deadlineDate = addBusinessHours(new Date(), totalProjectedHours, startH, endH);

    const formattedDeadline = deadlineDate.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    return {
      queuePosition,
      queueWaitHours,
      slaHours,
      totalProjectedHours,
      deadlineIso: deadlineDate.toISOString(),
      formattedDeadline
    };
  }, [ticket, assigneeId, allTickets, slaSettings]);

  // Mensagem padrão formatada com a previsão de acordo com a fila
  const defaultMessage = useMemo(() => {
    return `Olá! 👋 Registramos sua solicitação sob o protocolo *#${ticket.ticket_code}*:
📌 *Demanda:* ${ticket.title}
⏳ *Previsão de Entrega:* ${queueCalculation.formattedDeadline} (Posição ${queueCalculation.queuePosition}º na fila)
👨‍💻 *Responsável:* ${selectedMember?.name || 'Equipe TENNO'}

Qualquer novidade ou atualização, avisaremos por aqui! 🚀`;
  }, [ticket, queueCalculation, selectedMember]);

  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const messageText = customMessage !== null ? customMessage : defaultMessage;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Ação 1: Aprovar & Notificar no WhatsApp
  const handleApproveAndSend = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmApproval(
        ticket.id, 
        assigneeId, 
        true, 
        messageText, 
        queueCalculation.deadlineIso
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ação 2: Apenas Aprovar (Sem Notificar)
  const handleApproveOnly = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmApproval(
        ticket.id, 
        assigneeId, 
        false, 
        undefined, 
        queueCalculation.deadlineIso
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ação 3: Rejeitar Demanda
  const handleConfirmReject = () => {
    if (!rejectReason.trim()) return;
    onReject?.(ticket.id, rejectReason.trim());
    setRejectReason('');
    setShowRejectForm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f1523] border border-slate-700/60 rounded-2xl w-full max-w-xl shadow-2xl p-6 text-slate-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Triagem & Aprovação de Chamado</h3>
              <p className="text-xs text-slate-400">
                #{ticket.ticket_code} • <strong className="text-emerald-400">{ticket.client_name}</strong>
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

        <div className="mt-4 space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Título & Prioridade */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Demanda</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                ticket.priority === 'urgente' ? 'bg-rose-500/20 text-rose-300' :
                ticket.priority === 'normal' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
              }`}>
                {ticket.priority}
              </span>
            </div>
            <p className="text-xs font-semibold text-white leading-snug">{ticket.title}</p>
          </div>

          {/* Seletor de Responsável */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              Designar Responsável na Operação:
            </label>
            <div className="grid grid-cols-2 gap-3">
              {members.map(m => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => {
                    setAssigneeId(m.id);
                    setCustomMessage(null); // reseta para recalcular com o novo membro
                  }}
                  className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                    assigneeId === m.id
                      ? 'bg-emerald-500/15 border-emerald-500 text-white font-semibold shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-white">{m.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {m.role === 'lider_tecnico' ? 'Bugs & Código' : 'Suporte & Implantação'}
                    </p>
                  </div>
                  {assigneeId === m.id && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Projeção de Fila & Previsão Calculada */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              <div>
                <span className="text-[11px] text-slate-400 block">Posição na Fila de {selectedMember.name}:</span>
                <span className="font-bold text-white">
                  {queueCalculation.queuePosition}º lugar {ticket.priority === 'urgente' && '(Fura-fila Urgente)'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block flex items-center justify-end gap-1">
                <Clock className="w-3 h-3 text-amber-400" /> Previsão de Entrega:
              </span>
              <span className="font-bold text-emerald-400 font-mono">
                {queueCalculation.formattedDeadline}
              </span>
            </div>
          </div>

          {/* Preview da Mensagem para WhatsApp */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                Preview da Notificação para o Cliente:
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
              rows={4}
              value={messageText}
              onChange={e => setCustomMessage(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 leading-relaxed"
            />
            {ticket.origin_whatsapp_group_id ? (
              <p className="text-[11px] text-emerald-400/80 mt-1">
                ✓ Notificação será enviada diretamente no grupo do WhatsApp.
              </p>
            ) : (
              <p className="text-[11px] text-amber-400/80 mt-1">
                ⚠️ Demanda sem grupo vinculado. Ao aprovar, você pode copiar o texto acima.
              </p>
            )}
          </div>

          {/* Formulário de Rejeição Embutido */}
          {showRejectForm && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold text-rose-300">Justificativa da Rejeição:</span>
              </div>
              <textarea
                autoFocus
                rows={2}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Ex: Demanda duplicada, já resolvida no próprio grupo, ou fora do escopo do cliente..."
                className="w-full px-3 py-2 bg-slate-900 border border-rose-500/40 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-400"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!rejectReason.trim()}
                  onClick={handleConfirmReject}
                  className="px-4 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Confirmar Rejeição
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3 AÇÕES EXPLÍCITAS NO FOOTER */}
        {!showRejectForm && (
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
            {/* Opção 1: Rejeitar */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowRejectForm(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-semibold text-xs transition flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              <span>Rejeitar</span>
            </button>

            <div className="flex items-center gap-2">
              {/* Opção 2: Apenas Aprovar (Sem Notificar) */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleApproveOnly}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition border border-slate-700"
                title="Aprova e coloca na fila sem disparar mensagem no WhatsApp"
              >
                Apenas Aprovar
              </button>

              {/* Opção 3: Aprovar & Notificar */}
              <button
                type="button"
                disabled={isSubmitting || !ticket.origin_whatsapp_group_id}
                onClick={handleApproveAndSend}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                title="Aprova na fila e dispara notificação com o prazo calculado"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Enviando...' : 'Aprovar & Notificar'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
