import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  X, 
  Save, 
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { Ticket } from '../types';

interface PostponeTicketModalProps {
  isOpen: boolean;
  ticket: Ticket | null;
  currentMemberName?: string;
  onClose: () => void;
  onConfirmPostpone: (
    ticketId: string, 
    newDeadlineIso: string, 
    reason?: string,
    notifyWhatsApp?: boolean
  ) => Promise<void>;
}

export const PostponeTicketModal: React.FC<PostponeTicketModalProps> = ({
  isOpen,
  ticket,
  currentMemberName: _currentMemberName = 'Equipe',
  onClose,
  onConfirmPostpone
}) => {
  if (!isOpen || !ticket) return null;

  // Base inicial para cálculo: prazo atual ou agora
  const initialBaseDate = ticket.sla_deadline ? new Date(ticket.sla_deadline) : new Date();
  
  // Estado da nova data selecionada
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // Padrão: +1 dia em relação ao prazo atual ou amanhã às 18:00
    const d = new Date(initialBaseDate);
    d.setDate(d.getDate() + 1);
    return d;
  });

  const [baseMode, setBaseMode] = useState<'current_deadline' | 'now'>(
    ticket.sla_deadline ? 'current_deadline' : 'now'
  );

  const [reason, setReason] = useState<string>('');
  const [notifyWhatsApp, setNotifyWhatsApp] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>('+1d');

  // Atualiza ao abrir com novo ticket
  useEffect(() => {
    if (ticket) {
      const base = ticket.sla_deadline ? new Date(ticket.sla_deadline) : new Date();
      const next = new Date(base);
      next.setDate(next.getDate() + 1);
      setSelectedDate(next);
      setBaseMode(ticket.sla_deadline ? 'current_deadline' : 'now');
      setReason('');
      setNotifyWhatsApp(false);
      setActivePreset('+1d');
    }
  }, [ticket?.id, ticket?.sla_deadline]);

  // Função para obter a data base de referência
  const getBaseDate = () => {
    if (baseMode === 'current_deadline' && ticket.sla_deadline) {
      return new Date(ticket.sla_deadline);
    }
    return new Date();
  };

  // Aplica sugestões rápidas
  const applyPreset = (type: 'hours' | 'days' | 'weeks' | 'months' | 'end_of_week', amount: number, label: string) => {
    setActivePreset(label);
    const base = getBaseDate();
    const target = new Date(base);

    if (type === 'hours') {
      target.setTime(target.getTime() + amount * 3600 * 1000);
    } else if (type === 'days') {
      target.setDate(target.getDate() + amount);
    } else if (type === 'weeks') {
      target.setDate(target.getDate() + (amount * 7));
    } else if (type === 'months') {
      target.setMonth(target.getMonth() + amount);
    } else if (type === 'end_of_week') {
      // Próxima sexta-feira às 18h
      const day = target.getDay(); // 0 Dom, 1 Seg, ..., 5 Sex, 6 Sab
      const diffToFriday = (5 - day + 7) % 7 || 7;
      target.setDate(target.getDate() + diffToFriday);
      target.setHours(18, 0, 0, 0);
    }

    setSelectedDate(target);
  };

  // Formata para o input datetime-local: YYYY-MM-DDTHH:mm
  const formatForInput = (d: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setActivePreset(null);
    if (e.target.value) {
      setSelectedDate(new Date(e.target.value));
    }
  };

  const handleQuickReason = (text: string) => {
    setReason(prev => prev ? `${prev} • ${text}` : text);
  };

  const handleSave = async () => {
    if (!selectedDate || isNaN(selectedDate.getTime())) return;
    setIsSaving(true);
    try {
      await onConfirmPostpone(
        ticket.id, 
        selectedDate.toISOString(), 
        reason.trim() || undefined,
        notifyWhatsApp
      );
      onClose();
    } catch (err) {
      console.error('Erro ao postergar prazo:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Cálculo da diferença de tempo relativa
  const getTimeDiffText = () => {
    const now = new Date();
    const diffMs = selectedDate.getTime() - now.getTime();
    if (diffMs <= 0) return 'Data no passado ou agora';

    const totalHours = Math.round(diffMs / (1000 * 3600));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    if (days > 30) {
      const months = (days / 30).toFixed(1);
      return `em aproximadamente ${months} meses`;
    }
    if (days > 0) {
      return `em ${days} dia${days > 1 ? 's' : ''}${hours > 0 ? ` e ${hours}h` : ''}`;
    }
    return `em ${hours} hora${hours > 1 ? 's' : ''}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 dark:bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 text-slate-800 dark:text-slate-100 max-h-[94vh] flex flex-col transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Postergar & Ajustar Prazo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                #{ticket.ticket_code} • <strong className="text-emerald-600 dark:text-emerald-400">{ticket.client_name}</strong>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Título da Demanda */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              Demanda
            </span>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
              {ticket.title}
            </p>
          </div>

          {/* Comparativo de Prazos (Antes vs Depois) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                Prazo Atual (SLA)
              </span>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {ticket.sla_deadline ? (
                  new Date(ticket.sla_deadline).toLocaleDateString('pt-BR', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                ) : (
                  <span className="text-slate-400 italic">Nenhum prazo definido</span>
                )}
              </p>
            </div>

            <div className="border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 pt-2 sm:pt-0 sm:pl-3">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Novo Prazo Projetado
              </span>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-300">
                {selectedDate.toLocaleDateString('pt-BR', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 font-medium">
                {getTimeDiffText()}
              </span>
            </div>
          </div>

          {/* Seletor de Base de Referência (se já houver prazo anterior) */}
          {ticket.sla_deadline && (
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                Calcular adiamento a partir de:
              </span>
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setBaseMode('current_deadline')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    baseMode === 'current_deadline'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Prazo Atual
                </button>
                <button
                  type="button"
                  onClick={() => setBaseMode('now')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    baseMode === 'now'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  A partir de Agora
                </button>
              </div>
            </div>
          )}

          {/* SUGESTÕES RÁPIDAS DE ADIAMENTO (HORAS, DIAS, SEMANAS, MESES) */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Sugestões de Adiamento Rápido
            </label>

            {/* Grupo: Horas */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">
                Horas:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '+1 hora', tag: '+1h', fn: () => applyPreset('hours', 1, '+1h') },
                  { label: '+2 horas', tag: '+2h', fn: () => applyPreset('hours', 2, '+2h') },
                  { label: '+4 horas', tag: '+4h', fn: () => applyPreset('hours', 4, '+4h') },
                  { label: '+8 horas', tag: '+8h', fn: () => applyPreset('hours', 8, '+8h') }
                ].map(item => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={item.fn}
                    className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition text-center ${
                      activePreset === item.tag
                        ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-sm font-bold'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grupo: Dias */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">
                Dias:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '+1 dia', tag: '+1d', fn: () => applyPreset('days', 1, '+1d') },
                  { label: '+2 dias', tag: '+2d', fn: () => applyPreset('days', 2, '+2d') },
                  { label: '+3 dias', tag: '+3d', fn: () => applyPreset('days', 3, '+3d') },
                  { label: 'Fim da Semana', tag: 'sex', fn: () => applyPreset('end_of_week', 0, 'sex') }
                ].map(item => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={item.fn}
                    className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition text-center ${
                      activePreset === item.tag
                        ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-sm font-bold'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grupo: Semanas e Meses */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">
                Semanas & Meses:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '+1 semana', tag: '+1w', fn: () => applyPreset('weeks', 1, '+1w') },
                  { label: '+2 semanas', tag: '+2w', fn: () => applyPreset('weeks', 2, '+2w') },
                  { label: '+1 mês', tag: '+1m', fn: () => applyPreset('months', 1, '+1m') },
                  { label: '+2 meses', tag: '+2m', fn: () => applyPreset('months', 2, '+2m') }
                ].map(item => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={item.fn}
                    className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition text-center ${
                      activePreset === item.tag
                        ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-sm font-bold'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SELETOR MANUAL DE DATA E HORA */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-500" />
              <span>Ou escolha a data e horário exatos:</span>
            </label>
            <input
              type="datetime-local"
              value={formatForInput(selectedDate)}
              onChange={handleInputChange}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 shadow-sm"
            />
          </div>

          {/* MOTIVO / CONTEXTO DO ADIAMENTO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Motivo do Adiamento (Opcional)
              </label>
              <span className="text-[10px] text-slate-400">Salvo no histórico da demanda</span>
            </div>

            {/* Chips Rápidos de Motivo */}
            <div className="flex flex-wrap gap-1.5">
              {[
                'Aguardando dados do cliente',
                'Priorização de emergência',
                'Dependência técnica externa',
                'Ajuste de escopo alinhado',
                'Impedimento de agenda'
              ].map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleQuickReason(chip)}
                  className="text-[10px] bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 transition"
                >
                  + {chip}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ex: Alinhado no WhatsApp com o cliente que a entrega ocorrerá na sexta-feira..."
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* OPÇÃO DE NOTIFICAÇÃO NO WHATSAPP */}
          <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Notificar novo prazo no WhatsApp
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Abre a confirmação de envio para o grupo do cliente
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              id="notify_whatsapp_postpone"
              checked={notifyWhatsApp}
              onChange={e => setNotifyWhatsApp(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 border-slate-300 dark:border-slate-700 cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/10 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Salvando...' : 'Confirmar Novo Prazo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
