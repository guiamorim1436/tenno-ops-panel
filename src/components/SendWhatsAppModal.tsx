import React, { useState } from 'react';
import { MessageSquare, Send, Copy, Check, X, AlertCircle } from 'lucide-react';
import { Ticket } from '../types';

interface SendWhatsAppModalProps {
  isOpen: boolean;
  ticket: Ticket | null;
  onClose: () => void;
  onSuccessNotification?: (ticketId: string) => void;
}

export const SendWhatsAppModal: React.FC<SendWhatsAppModalProps> = ({
  isOpen,
  ticket,
  onClose,
  onSuccessNotification
}) => {
  if (!isOpen || !ticket) return null;

  const deadlineText = ticket.sla_deadline
    ? new Date(ticket.sla_deadline).toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Em análise com a equipe';

  const defaultMessage = `Olá! 👋 Atualização sobre a sua demanda sob o protocolo *#${ticket.ticket_code}*:
📌 *Demanda:* ${ticket.title}
⏳ *Previsão de Entrega:* ${deadlineText}
👨‍💻 *Responsável:* ${ticket.assignee_name || 'Equipe TENNO'}

Qualquer dúvida estamos à disposição por aqui!`;

  const [message, setMessage] = useState(defaultMessage);
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!ticket.origin_whatsapp_group_id) {
      setFeedback('⚠️ Esta demanda não possui ID de grupo WhatsApp vinculado.');
      return;
    }

    setIsSending(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/evolution-send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remote_jid: ticket.origin_whatsapp_group_id,
          message_text: message
        })
      });

      if (res.ok) {
        setFeedback('✓ Notificação enviada com sucesso no grupo do cliente!');
        onSuccessNotification?.(ticket.id);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        const err = await res.json();
        setFeedback(`❌ Falha no envio: ${err.error || 'Erro desconhecido'}`);
      }
    } catch (err: any) {
      setFeedback(`❌ Erro de conexão: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f1523] border border-slate-700/60 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-slate-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Notificar Cliente no WhatsApp
              </h2>
              <p className="text-xs text-slate-400">
                Envie o protocolo e o prazo oficial para o grupo do WhatsApp
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

        {/* Resumo */}
        <div className="mt-4 p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-emerald-400 truncate">
              {ticket.client_name || 'Cliente Geral'}
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              #{ticket.ticket_code}
            </span>
          </div>
          <p className="text-slate-300 font-medium line-clamp-1">{ticket.title}</p>
          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Prazo: <strong className="text-amber-300">{deadlineText}</strong></span>
            <span>Responsável: <strong className="text-slate-200">{ticket.assignee_name || 'TENNO'}</strong></span>
          </div>
        </div>

        {/* Mensagem Editável */}
        <div className="mt-4 space-y-2 flex-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              Mensagem a ser enviada no grupo:
            </label>
            <button
              type="button"
              onClick={handleCopy}
              className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={6}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        {feedback && (
          <div className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
            feedback.startsWith('✓') ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300' : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Ações */}
        <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSending || !message.trim()}
            onClick={handleSend}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-950/50"
          >
            <Send className="w-4 h-4" />
            <span>{isSending ? 'Enviando...' : 'Enviar no WhatsApp'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
