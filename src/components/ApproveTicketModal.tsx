import React, { useState, useMemo, useEffect } from 'react';
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
  Layers,
  Calendar
} from 'lucide-react';
import { Ticket, TeamMember, SlaSettings } from '../types';
import { calculateCalendarAwareDeadline, CalendarBusyEvent } from '../lib/calendarSchedule';

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
  const [calendarEvents, setCalendarEvents] = useState<CalendarBusyEvent[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

  const selectedMember = members.find(m => m.id === assigneeId) || members[1];

  // Carrega eventos da Google Agenda do membro selecionado
  useEffect(() => {
    let isMounted = true;
    async function loadCalendar() {
      setIsLoadingCalendar(true);
      try {
        const res = await fetch(`/api/calendar-events?memberId=${assigneeId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.events)) {
            setCalendarEvents(data.events);
          }
        }
      } catch (err) {
        console.warn('Falha ao carregar eventos da agenda:', err);
      } finally {
        if (isMounted) setIsLoadingCalendar(false);
      }
    }
    loadCalendar();
    return () => { isMounted = false; };
  }, [assigneeId]);

  // Cálculo da posição na fila e previsão de entrega baseada na fila e Google Agenda (1h por demanda)
  const queueCalculation = useMemo(() => {
    const startH = slaSettings?.work_start_hour ?? 9;
    const endH = slaSettings?.work_end_hour ?? 18;
    const rawDays = slaSettings?.work_days ?? '1,2,3,4,5';
    const workDays = typeof rawDays === 'string'
      ? rawDays.split('|')[0].split(',').map(n => Number(n.trim())).filter(n => !isNaN(n))
      : Array.isArray(rawDays)
      ? (rawDays as number[])
      : [1, 2, 3, 4, 5];

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
        queueWaitHours = 1; // 1h da tarefa em andamento
      } else {
        queuePosition = 1;
        queueWaitHours = 0;
      }
    } else {
      // Normal ou Baixa: vai para o final da fila de espera (1h por tarefa à frente)
      queuePosition = memberQueue.length + 1;
      queueWaitHours = memberQueue.length * 1;
    }

    // Calcula prazo final considerando horário útil, blocos de 1h e eventos do Google Calendar
    const schedule = calculateCalendarAwareDeadline({
      startDate: new Date(),
      durationHours: 1, // 1h para a tarefa atual
      queueHours: queueWaitHours,
      calendarEvents,
      startHour: startH,
      endHour: endH,
      workDays
    });

    return {
      queuePosition,
      queueWaitHours,
      totalProjectedHours: queueWaitHours + 1,
      deadlineIso: schedule.deadlineIso,
      formattedDeadline: schedule.formatted,
      collidedEvents: schedule.collidedEvents
    };
  }, [ticket, assigneeId, allTickets, slaSettings, calendarEvents]);

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

          {/* Projeção de Fila & Previsão Calculada com Google Agenda */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
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
                  <Clock className="w-3 h-3 text-amber-400" /> Previsão de Entrega (1h/tarefa):
                </span>
                <span className="font-bold text-emerald-400 font-mono">
                  {queueCalculation.formattedDeadline}
                </span>
              </div>
            </div>

            {/* Status da Google Agenda */}
            <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  {isLoadingCalendar ? (
                    'Sincronizando Google Agenda...'
                  ) : calendarEvents.length > 0 ? (
                    <span className="text-sky-300">
                      Google Agenda ativa ({calendarEvents.length} eventos/reuniões monitorados)
                    </span>
                  ) : (
                    <span className="text-slate-500">Nenhum evento na agenda no período</span>
                  )}
                </span>
              </div>

              {queueCalculation.collidedEvents.length > 0 && (
                <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded font-medium">
                  ⚠️ Evitou {queueCalculation.collidedEvents.length} reunião(ões)
                </span>
              )}
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
