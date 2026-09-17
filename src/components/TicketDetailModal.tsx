import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  Tag, 
  FileText, 
  MessageSquare, 
  AlertTriangle, 
  Edit3, 
  Save, 
  Send,
  Check
} from 'lucide-react';
import { Ticket } from '../types';
import { supabase } from '../lib/supabase';

interface TicketDetailModalProps {
  isOpen: boolean;
  ticket: Ticket | null;
  currentMemberName?: string;
  onClose: () => void;
  onApprove?: (ticket: Ticket) => void;
  onReject?: (ticketId: string, reason: string) => void;
  onUpdateTicket?: (updatedTicket: Ticket) => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  isOpen,
  ticket,
  currentMemberName = 'Guilherme',
  onClose,
  onApprove,
  onReject,
  onUpdateTicket
}) => {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  // Estado de Novo Comentário
  const [newComment, setNewComment] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [commentSavedFeedback, setCommentSavedFeedback] = useState(false);

  // Estado de Edição de Texto da Demanda
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDesc, setEditedDesc] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  if (!isOpen || !ticket) return null;

  const createdAt = new Date(ticket.created_at).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const priorityConfig = {
    urgente: { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/30' },
    normal: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' },
    baixa: { bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-slate-700' }
  };

  const prio = priorityConfig[ticket.priority] || priorityConfig.normal;

  // Separa notas de contexto adicionadas pela equipe caso já existam na descrição
  const fullDesc = ticket.description || '';
  const contextNotesMarker = '--- Contexto & Notas da Equipe ---';
  let mainDescription = fullDesc;
  let contextNotesText = '';

  if (fullDesc.includes(contextNotesMarker)) {
    const parts = fullDesc.split(contextNotesMarker);
    mainDescription = parts[0].trim();
    contextNotesText = parts[1]?.trim() || '';
  }

  // Abre formulário de edição
  const handleStartEditing = () => {
    setEditedTitle(ticket.title);
    setEditedDesc(mainDescription);
    setIsEditingDesc(true);
  };

  // Salva edição direta do título e descrição
  const handleSaveEdit = async () => {
    if (!editedTitle.trim()) return;
    setIsSavingEdit(true);

    const updatedFullDesc = contextNotesText 
      ? `${editedDesc.trim()}\n\n${contextNotesMarker}\n${contextNotesText}`
      : editedDesc.trim();

    const updatedTicket: Ticket = {
      ...ticket,
      title: editedTitle.trim(),
      description: updatedFullDesc
    };

    try {
      await supabase
        .from('tenno_tickets')
        .update({
          title: editedTitle.trim(),
          description: updatedFullDesc
        })
        .eq('id', ticket.id);

      onUpdateTicket?.(updatedTicket);
      setIsEditingDesc(false);
    } catch (err) {
      console.error('Erro ao salvar edição:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Adiciona novo comentário de contextualização
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSavingComment(true);

    const timestamp = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const newNoteLine = `• [${timestamp} - ${currentMemberName}]: ${newComment.trim()}`;
    const newContextNotes = contextNotesText 
      ? `${contextNotesText}\n${newNoteLine}`
      : newNoteLine;

    const newFullDesc = `${mainDescription}\n\n${contextNotesMarker}\n${newContextNotes}`;

    const updatedTicket: Ticket = {
      ...ticket,
      description: newFullDesc
    };

    try {
      await supabase
        .from('tenno_tickets')
        .update({ description: newFullDesc })
        .eq('id', ticket.id);

      onUpdateTicket?.(updatedTicket);
      setNewComment('');
      setCommentSavedFeedback(true);
      setTimeout(() => setCommentSavedFeedback(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar comentário:', err);
    } finally {
      setIsSavingComment(false);
    }
  };

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    onReject?.(ticket.id, rejectReason.trim());
    setRejectReason('');
    setShowRejectForm(false);
    onClose();
  };

  const handleApprove = () => {
    onApprove?.(ticket);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f1523] border border-slate-700/60 rounded-2xl w-full max-w-2xl shadow-2xl text-slate-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Detalhes da Demanda</h3>
                <span className="text-xs font-mono text-slate-400 font-semibold bg-slate-800/80 px-2 py-0.5 rounded">
                  #{ticket.ticket_code}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cliente: <strong className="text-emerald-400">{ticket.client_name}</strong> • Status: {ticket.status}
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
          {/* Título & Ação de Edição */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1 block">
                Título da Demanda
              </label>
              {isEditingDesc ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={e => setEditedTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-emerald-500/50 rounded-lg text-sm text-white focus:outline-none"
                />
              ) : (
                <h4 className="text-sm font-semibold text-white leading-relaxed">
                  {ticket.title}
                </h4>
              )}
            </div>

            {!isEditingDesc ? (
              <button
                onClick={handleStartEditing}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800/60 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 transition"
                title="Editar título e descrição"
              >
                <Edit3 className="w-3 h-3" />
                <span>Editar</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsEditingDesc(false)}
                  className="text-[11px] text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  className="text-[11px] text-slate-950 bg-emerald-400 hover:bg-emerald-300 font-bold px-3 py-1 rounded-lg transition flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  <span>Salvar</span>
                </button>
              </div>
            )}
          </div>

          {/* Descrição e Contexto Original */}
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1 block">
              Descrição & Histórico
            </label>
            {isEditingDesc ? (
              <textarea
                rows={6}
                value={editedDesc}
                onChange={e => setEditedDesc(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-emerald-500/50 rounded-xl text-xs text-slate-200 focus:outline-none leading-relaxed"
              />
            ) : mainDescription ? (
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {mainDescription}
              </div>
            ) : (
              <p className="text-xs text-slate-600 italic">
                Nenhuma descrição disponível para esta demanda.
              </p>
            )}
          </div>

          {/* Seção de Notas de Contexto & Comentários Internos */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">
                  Contextualização & Notas da Equipe
                </span>
              </div>
              {commentSavedFeedback && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold animate-fadeIn">
                  <Check className="w-3 h-3" /> Contexto salvo!
                </span>
              )}
            </div>

            {/* Lista de notas existentes */}
            {contextNotesText ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {contextNotesText.split('\n').filter(Boolean).map((note, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs text-emerald-300/90 leading-snug font-mono">
                    {note}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic">
                Nenhum comentário adicionado ainda. Adicione observações abaixo para esclarecer quem solicitou ou instruções adicionais.
              </p>
            )}

            {/* Input para adicionar nova nota */}
            <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Ex: Vote em Mulheres é a secretária do Dr Cicero. O material pedido é o manual do bot..."
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isSavingComment}
                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Salvar Nota</span>
              </button>
            </form>
          </div>

          {/* Grid de Metadados */}
          <div className="grid grid-cols-2 gap-4">
            {/* Cliente */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <User className="w-3 h-3 text-emerald-400" />
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  Cliente Vinculado
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
        <div className="p-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          {ticket.status === 'pending_approval' && !showRejectForm ? (
            <>
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
            </>
          ) : (
            <div className="flex items-center justify-end w-full">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
