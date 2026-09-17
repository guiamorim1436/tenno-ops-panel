import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowRightLeft, 
  X, 
  User, 
  Check, 
  AlertCircle, 
  Calendar, 
  Clock, 
  Layers, 
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { Ticket, SlaSettings, GUILHERME_UUID, CAIO_UUID, isGuilherme } from '../types';
import { calculateCalendarAwareDeadline, CalendarBusyEvent } from '../lib/calendarSchedule';

interface TransferTicketModalProps {
  isOpen: boolean;
  ticket: Ticket | null;
  allTickets?: Ticket[];
  slaSettings?: SlaSettings | null;
  onClose: () => void;
  onConfirmTransfer: (
    ticketId: string, 
    targetMemberId: string, 
    reason?: string,
    newDeadlineIso?: string
  ) => Promise<void> | void;
}

export const TransferTicketModal: React.FC<TransferTicketModalProps> = ({
  isOpen,
  ticket,
  allTickets = [],
  slaSettings,
  onClose,
  onConfirmTransfer
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarBusyEvent[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

  // Inicializa o alvo sugerido como o OUTRO membro da equipe
  useEffect(() => {
    if (ticket && isOpen) {
      const isCurrentlyGui = isGuilherme(ticket.assignee_id, ticket.assignee_name);
      setSelectedTargetId(isCurrentlyGui ? CAIO_UUID : GUILHERME_UUID);
      setTransferReason('');
    }
  }, [ticket, isOpen]);

  // Carrega eventos da Google Agenda do membro de destino
  useEffect(() => {
    if (!isOpen || !selectedTargetId) return;

    let isMounted = true;
    async function loadCalendar() {
      setIsLoadingCalendar(true);
      try {
        const res = await fetch(`/api/calendar-events?memberId=${selectedTargetId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.events)) {
            setCalendarEvents(data.events);
          }
        }
      } catch (err) {
        console.warn('Erro ao buscar eventos da agenda do destinatário:', err);
      } finally {
        if (isMounted) setIsLoadingCalendar(false);
      }
    }
    loadCalendar();
    return () => { isMounted = false; };
  }, [isOpen, selectedTargetId]);

  const targetName = isGuilherme(selectedTargetId) ? 'Guilherme' : 'Caio';
  const isCurrentAssigneeGui = ticket ? isGuilherme(ticket.assignee_id, ticket.assignee_name) : false;

  // Cálculo da próxima data disponível na agenda do destinatário
  const scheduleCalculation = useMemo(() => {
    if (!ticket) return null;

    const startH = slaSettings?.work_start_hour ?? 9;
    const endH = slaSettings?.work_end_hour ?? 18;
    const rawDays = slaSettings?.work_days ?? '1,2,3,4,5';
    const workDays = typeof rawDays === 'string'
      ? rawDays.split('|')[0].split(',').map(n => Number(n.trim())).filter(n => !isNaN(n))
      : Array.isArray(rawDays)
      ? (rawDays as number[])
      : [1, 2, 3, 4, 5];

    // Tarefas já existentes na fila do novo responsável
    const targetMemberQueue = allTickets.filter(
      t => isGuilherme(selectedTargetId)
        ? isGuilherme(t.assignee_id, t.assignee_name) && t.id !== ticket.id && t.status !== 'pending_approval' && t.status !== 'completed' && t.status !== 'rejected'
        : !isGuilherme(t.assignee_id, t.assignee_name) && t.id !== ticket.id && t.status !== 'pending_approval' && t.status !== 'completed' && t.status !== 'rejected'
    );

    let queuePosition = 1;
    let queueWaitHours = 0;

    if (ticket.priority === 'urgente') {
      const inProgress = targetMemberQueue.find(t => t.status === 'in_progress');
      if (inProgress) {
        queuePosition = 2;
        queueWaitHours = 1;
      } else {
        queuePosition = 1;
        queueWaitHours = 0;
      }
    } else {
      queuePosition = targetMemberQueue.length + 1;
      queueWaitHours = targetMemberQueue.length * 1;
    }

    const schedule = calculateCalendarAwareDeadline({
      startDate: new Date(),
      durationHours: 1,
      queueHours: queueWaitHours,
      calendarEvents,
      startHour: startH,
      endHour: endH,
      workDays
    });

    return {
      queuePosition,
      queueWaitHours,
      deadlineIso: schedule.deadlineIso,
      formattedDeadline: schedule.formatted,
      collidedEvents: schedule.collidedEvents
    };
  }, [ticket, selectedTargetId, allTickets, slaSettings, calendarEvents]);

  if (!isOpen || !ticket) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetId) return;

    setIsSubmitting(true);
    try {
      await onConfirmTransfer(
        ticket.id, 
        selectedTargetId, 
        transferReason.trim() || undefined,
        scheduleCalculation?.deadlineIso
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f1523] border border-slate-700/60 rounded-2xl w-full max-w-xl shadow-2xl p-6 text-slate-100 max-h-[92vh] flex flex-col">
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
                Confirme a realocação de acordo com a agenda do novo responsável
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

        {/* Formulário de Seleção e Confirmação */}
        <form onSubmit={handleConfirm} className="mt-4 space-y-4 flex-1 overflow-y-auto pr-1">
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

          {/* Banner de Realocação e Próxima Data Disponível na Agenda */}
          <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-xs space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-indigo-800/40">
              <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-400" />
                Próxima Data Disponível na Agenda ({targetName})
              </span>
              {isLoadingCalendar ? (
                <span className="text-[10px] text-indigo-300 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Sincronizando...
                </span>
              ) : (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3 h-3" /> Agenda Integrada
                </span>
              )}
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <span className="text-slate-300">Novo prazo projetado:</span>
              <span className="text-sm font-bold text-amber-300 font-mono">
                {scheduleCalculation?.formattedDeadline || 'Calculando...'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
              <div className="flex items-center gap-1.5 bg-indigo-900/30 p-2 rounded-lg">
                <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Posição na fila: <strong>#{scheduleCalculation?.queuePosition || 1}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 bg-indigo-900/30 p-2 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Espera na fila: <strong>{scheduleCalculation?.queueWaitHours || 0}h</strong></span>
              </div>
            </div>

            {scheduleCalculation?.collidedEvents && scheduleCalculation.collidedEvents.length > 0 && (
              <div className="text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-500/20 p-2 rounded-lg">
                🛡️ <strong>{scheduleCalculation.collidedEvents.length} compromisso(s)</strong> evitados na Google Agenda: {scheduleCalculation.collidedEvents.join(', ')}.
              </div>
            )}
          </div>

          {/* Motivo ou Orientação */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Motivo ou orientação para {targetName} (opcional):
            </label>
            <textarea
              value={transferReason}
              onChange={e => setTransferReason(e.target.value)}
              placeholder="Ex: Ajustei a regra de validação, falta subir a automação no Kommo..."
              rows={2}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Confirmação explícita */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              Ao confirmar, a tarefa será transferida para a fila de <strong>{targetName}</strong> e seu prazo oficial será automaticamente realocado para <strong>{scheduleCalculation?.formattedDeadline}</strong>.
            </span>
          </div>

          {/* Ações */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
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
              <span>{isSubmitting ? 'Transferindo...' : 'Confirmar Transferência e Realocar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
