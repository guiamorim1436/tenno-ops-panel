import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Copy, 
  Plus, 
  Users, 
  TrendingUp, 
  Check, 
  Flame, 
  Search 
} from 'lucide-react';
import { TeamMember, Ticket, TicketPriority } from './types';
import { supabase } from './lib/supabase';

// Mock inicial para funcionar de imediato mesmo sem banco conectado
const INITIAL_MEMBERS: TeamMember[] = [
  { id: '1', name: 'Guilherme', role: 'lider_tecnico' },
  { id: '2', name: 'Caio', role: 'assistente_operacional' }
];

const INITIAL_TICKETS: Ticket[] = [
  {
    id: 't-1',
    ticket_code: 101,
    title: 'Erro no disparo de confirmação de agendamento via webhook',
    client_name: 'Dr360 - Clínica OdontoVida',
    status: 'in_queue',
    priority: 'urgente',
    assignee_id: '1',
    assignee_name: 'Guilherme',
    sla_hours_target: 4,
    sla_deadline: new Date(Date.now() + 3.5 * 3600 * 1000).toISOString(),
    is_escalated: true,
    escalation_reason: 'Webhook da Evolution API retornando 401 Unauthorized e modelo de mensagem travado.',
    escalated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    total_time_seconds: 1420,
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  },
  {
    id: 't-2',
    ticket_code: 102,
    title: 'Criar novos campos personalizados no Kommo e subir bot de boas-vindas',
    client_name: 'Dr360 - Clínica BellaPele',
    status: 'in_queue',
    priority: 'normal',
    assignee_id: '2',
    assignee_name: 'Caio',
    sla_hours_target: 24,
    sla_deadline: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
    is_escalated: false,
    total_time_seconds: 900,
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
  },
  {
    id: 't-3',
    ticket_code: 103,
    title: 'Ajuste no fluxo da sala de dúvidas e gravação da call',
    client_name: 'Cliente Mentoria (Terças 16h)',
    status: 'in_queue',
    priority: 'baixa',
    assignee_id: '2',
    assignee_name: 'Caio',
    sla_hours_target: 72,
    sla_deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    is_escalated: false,
    total_time_seconds: 0,
    created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString()
  },
  {
    id: 't-4',
    ticket_code: 104,
    title: 'Paciente não recebe link do formulário anamnese no grupo',
    client_name: 'Dr360 - Clínica SorrisoPrime',
    status: 'pending_approval',
    priority: 'urgente',
    sla_hours_target: 4,
    is_escalated: false,
    total_time_seconds: 0,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  }
];

export function App() {
  // Estado de dados
  const [members] = useState<TeamMember[]>(INITIAL_MEMBERS);
  const [currentMemberId, setCurrentMemberId] = useState<string>('2'); // Inicia com Caio por padrão
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    const saved = localStorage.getItem('tenno_tickets_v1');
    return saved ? JSON.parse(saved) : INITIAL_TICKETS;
  });

  // Estado da UI
  const [viewTab, setViewTab] = useState<'board' | 'telemetry'>('board');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modais
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [escalateTicketId, setEscalateTicketId] = useState<string | null>(null);
  const [escalateReason, setEscalateReason] = useState('');

  // Formulário de Nova Tarefa
  const [newTitle, setNewTitle] = useState('');
  const [newClient, setNewClient] = useState('Dr360 - Clínica Nova');
  const [newPriority, setNewPriority] = useState<TicketPriority>('normal');
  const [newAssignee, setNewAssignee] = useState<string>('2');

  // Identifica o membro ativo
  const currentMember = useMemo(
    () => members.find(m => m.id === currentMemberId) || members[0],
    [members, currentMemberId]
  );

  // Identifica a tarefa ativa com o timer rodando para este membro
  const activeTicket = useMemo(
    () => tickets.find(t => t.status === 'in_progress' && t.assignee_id === currentMemberId),
    [tickets, currentMemberId]
  );

  // Timer local em segundos para atualização da UI a cada segundo
  const [activeSeconds, setActiveSeconds] = useState<number>(0);

  useEffect(() => {
    if (activeTicket) {
      setActiveSeconds(activeTicket.total_time_seconds || 0);
      const interval = setInterval(() => {
        setActiveSeconds(prev => {
          const next = prev + 1;
          // Alerta anti-esquecimento de 3 horas
          if (next === 10800) {
            alert('⚠️ ALERTA DE SEGURANÇA: O cronômetro está rodando há 3 horas contínuas! Verifique se você não esqueceu o timer ligado.');
          }
          return next;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setActiveSeconds(0);
    }
  }, [activeTicket?.id]);

  // Salva no localStorage para persistência imediata
  useEffect(() => {
    localStorage.setItem('tenno_tickets_v1', JSON.stringify(tickets));
  }, [tickets]);

  // Sincronização automática com Supabase (quando as tabelas estiverem ativas)
  useEffect(() => {
    async function syncWithSupabase() {
      try {
        const { data, error } = await supabase.from('tenno_tickets').select('*');
        if (!error && data && data.length > 0) {
          setTickets(data);
        }
      } catch {
        // Fallback silencioso para localStorage caso as tabelas ainda estejam em criação
      }
    }
    syncWithSupabase();
  }, []);

  // Formatação de Segundos para HH:MM:SS
  const formatTimer = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Formatação para horas e minutos legíveis
  const formatHumanTime = (sec: number) => {
    if (!sec || sec < 60) return `${sec || 0}s`;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // Regra de SLA: Cálculo de data futura aproximada em horário útil
  const calculateDeadline = (priority: TicketPriority) => {
    const hours = priority === 'urgente' ? 4 : priority === 'normal' ? 24 : 72;
    const now = new Date();
    // Adiciona as horas úteis projetadas
    now.setHours(now.getHours() + hours);
    return {
      hours,
      deadlineIso: now.toISOString(),
      formatted: now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    };
  };

  // 1. INICIAR TIMER (Mono-tarefa Obrigatória)
  const handleStartTimer = (ticketId: string, forcedMemberId?: string) => {
    const targetId = forcedMemberId || currentMemberId;
    const targetMember = members.find(m => m.id === targetId) || currentMember;

    if (targetId !== currentMemberId) {
      setCurrentMemberId(targetId);
    }

    setTickets(prev =>
      prev.map(t => {
        // Pausa qualquer tarefa anterior que estava 'in_progress' para esse membro
        if (t.assignee_id === targetId && t.status === 'in_progress' && t.id !== ticketId) {
          return {
            ...t,
            status: 'in_queue',
            total_time_seconds: t.id === activeTicket?.id ? activeSeconds : t.total_time_seconds
          };
        }
        // Inicia o timer da nova tarefa selecionada garantindo o responsável correto
        if (t.id === ticketId) {
          return {
            ...t,
            status: 'in_progress',
            assignee_id: targetMember.id,
            assignee_name: targetMember.name
          };
        }
        return t;
      })
    );
  };

  // 2. PAUSAR TIMER
  const handlePauseTimer = () => {
    if (!activeTicket) return;
    setTickets(prev =>
      prev.map(t => {
        if (t.id === activeTicket.id) {
          return {
            ...t,
            status: 'in_queue',
            total_time_seconds: activeSeconds
          };
        }
        return t;
      })
    );
  };

  // 3. CONCLUIR TAREFA
  const handleCompleteTask = (ticketId: string) => {
    setTickets(prev =>
      prev.map(t => {
        if (t.id === ticketId) {
          const finalSec = t.id === activeTicket?.id ? activeSeconds : t.total_time_seconds;
          return {
            ...t,
            status: 'completed',
            total_time_seconds: finalSec,
            completed_at: new Date().toISOString()
          };
        }
        return t;
      })
    );
  };

  // 4. APROVAR DEMANDA (1-Clique)
  const handleApproveDemand = (ticketId: string, assignedToId: string = '2') => {
    const targetMember = members.find(m => m.id === assignedToId) || members[1];
    setTickets(prev =>
      prev.map(t => {
        if (t.id === ticketId) {
          const { hours, deadlineIso } = calculateDeadline(t.priority);
          return {
            ...t,
            status: 'in_queue',
            assignee_id: targetMember.id,
            assignee_name: targetMember.name,
            sla_hours_target: hours,
            sla_deadline: deadlineIso,
            approved_at: new Date().toISOString()
          };
        }
        return t;
      })
    );
  };

  // 5. ESCALAR PARA GUILHERME
  const handleConfirmEscalation = () => {
    if (!escalateTicketId || !escalateReason.trim()) return;

    setTickets(prev =>
      prev.map(t => {
        if (t.id === escalateTicketId) {
          const finalSec = t.id === activeTicket?.id ? activeSeconds : t.total_time_seconds;
          return {
            ...t,
            status: 'blocked_escalated',
            assignee_id: '1', // Guilherme
            assignee_name: 'Guilherme',
            is_escalated: true,
            escalation_reason: escalateReason.trim(),
            escalated_at: new Date().toISOString(),
            total_time_seconds: finalSec
          };
        }
        return t;
      })
    );

    setEscalateTicketId(null);
    setEscalateReason('');
  };

  // 6. CRIAR NOVA DEMANDA RÁPIDA
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const assigned = members.find(m => m.id === newAssignee) || members[1];
    const { hours, deadlineIso } = calculateDeadline(newPriority);

    const newTask: Ticket = {
      id: `t-${Date.now()}`,
      ticket_code: tickets.length + 101,
      title: newTitle.trim(),
      client_name: newClient.trim(),
      status: 'in_queue',
      priority: newPriority,
      assignee_id: assigned.id,
      assignee_name: assigned.name,
      sla_hours_target: hours,
      sla_deadline: deadlineIso,
      approved_at: new Date().toISOString(),
      is_escalated: false,
      total_time_seconds: 0,
      created_at: new Date().toISOString()
    };

    setTickets(prev => [newTask, ...prev]);
    setNewTitle('');
    setIsNewTaskOpen(false);
  };

  // 7. GERADOR DE MENSAGEM WHATSAPP
  const copyWhatsAppMessage = (ticket: Ticket) => {
    const deadlineText = ticket.sla_deadline
      ? new Date(ticket.sla_deadline).toLocaleDateString('pt-BR', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'Em análise com a equipe';

    const text = `Olá! 👋 Registramos sua solicitação sob o protocolo *#${ticket.ticket_code}*:
📌 *Demanda:* ${ticket.title}
⏳ *Previsão de Entrega:* ${deadlineText}
👨‍💻 *Responsável:* ${ticket.assignee_name || 'Equipe TENNO'}

Qualquer novidade ou atualização, avisaremos por aqui! 🚀`;

    navigator.clipboard.writeText(text);
    setCopiedId(ticket.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filtros de Colunas
  const filteredTickets = useMemo(() => {
    if (!searchTerm.trim()) return tickets;
    const term = searchTerm.toLowerCase();
    return tickets.filter(
      t =>
        t.title.toLowerCase().includes(term) ||
        t.client_name.toLowerCase().includes(term) ||
        String(t.ticket_code).includes(term)
    );
  }, [tickets, searchTerm]);

  // Filtros de Colunas Estritamente Isolados
  const pendingApprovalTickets = filteredTickets.filter(t => t.status === 'pending_approval');
  const caioTickets = filteredTickets.filter(
    t => t.assignee_id === '2' && t.status !== 'pending_approval' && t.status !== 'completed'
  );
  const guilhermeTickets = filteredTickets.filter(
    t => t.assignee_id === '1' && t.status !== 'pending_approval' && t.status !== 'completed'
  );
  const completedTickets = filteredTickets.filter(t => t.status === 'completed');

  // Telemetria Universal Multi-Cliente (Calculada dinamicamente para todos os clientes)
  const clientStats = useMemo(() => {
    const map = new Map<string, { totalTickets: number; completedTickets: number; seconds: number }>();
    let totalSeconds = 0;
    let totalTicketsCount = 0;

    tickets.forEach(t => {
      totalTicketsCount++;
      totalSeconds += t.total_time_seconds || 0;
      const client = t.client_name || 'Cliente Geral';
      const current = map.get(client) || { totalTickets: 0, completedTickets: 0, seconds: 0 };
      map.set(client, {
        totalTickets: current.totalTickets + 1,
        completedTickets: current.completedTickets + (t.status === 'completed' ? 1 : 0),
        seconds: current.seconds + (t.total_time_seconds || 0)
      });
    });

    const clientsList = Array.from(map.entries()).map(([name, data]) => ({
      name,
      totalTickets: data.totalTickets,
      completedTickets: data.completedTickets,
      hours: Number((data.seconds / 3600).toFixed(2)),
      formattedTime: formatHumanTime(data.seconds)
    }));

    const totalHours = Number((totalSeconds / 3600).toFixed(2));
    const avgMinutesPerTicket = totalTicketsCount > 0 ? Math.round((totalSeconds / totalTicketsCount) / 60) : 0;

    return {
      clientsList,
      totalHours,
      totalTicketsCount,
      avgMinutesPerTicket
    };
  }, [tickets]);

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col font-sans">
      {/* ========================================================================= */}
      {/* 1. BARRA DE FOCO SUPERIOR (STICKY HEADER) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#0d121d]/90 backdrop-blur border-b border-slate-800 px-6 py-3">
        <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Seletor de Perfil */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400">
                T
              </div>
              <span className="font-bold text-lg tracking-tight text-white">
                TENNO <span className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">Ops</span>
              </span>
            </div>

            <div className="h-5 w-px bg-slate-800 hidden sm:block" />

            {/* Alternador de Perfil */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs font-medium">
              {members.map(m => (
                <button
                  key={m.id}
                  onClick={() => setCurrentMemberId(m.id)}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
                    currentMemberId === m.id
                      ? m.id === '1'
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  {m.name}
                  {m.id === '1' ? ' (Líder)' : ' (Suporte)'}
                </button>
              ))}
            </div>
          </div>

          {/* TIMER MONO-TAREFA EM DESTAQUE */}
          <div className="flex-1 max-w-2xl w-full">
            {activeTicket ? (
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-4 py-2 flex items-center justify-between gap-4 shadow-lg shadow-emerald-950/20">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        #{activeTicket.ticket_code}
                      </span>
                      <span className="text-xs text-slate-400 truncate max-w-[160px]">
                        {activeTicket.client_name}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white truncate max-w-[280px]">
                      {activeTicket.title}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="font-mono text-xl font-black text-emerald-400 tracking-wider">
                    {formatTimer(activeSeconds)}
                  </div>
                  <button
                    onClick={handlePauseTimer}
                    className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 transition text-xs flex items-center gap-1 font-semibold"
                    title="Pausar cronômetro"
                  >
                    <Pause className="w-4 h-4" />
                    <span className="hidden sm:inline">Pausar</span>
                  </button>
                  <button
                    onClick={() => handleCompleteTask(activeTicket.id)}
                    className="p-1.5 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition text-xs flex items-center gap-1 font-bold"
                    title="Concluir demanda"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Concluir</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>
                  Modo Mono-tarefa ativo para <strong>{currentMember.name}</strong>. Dê{' '}
                  <strong className="text-emerald-400">Play</strong> em um card para focar em uma tarefa por vez.
                </span>
              </div>
            )}
          </div>

          {/* Botões de Navegação & Ação */}
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
              <button
                onClick={() => setViewTab('board')}
                className={`px-3 py-1.5 rounded-md transition ${
                  viewTab === 'board' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400'
                }`}
              >
                Fila Ágil
              </button>
              <button
                onClick={() => setViewTab('telemetry')}
                className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                  viewTab === 'telemetry' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Telemetria & Horas
              </button>
            </div>

            <button
              onClick={() => setIsNewTaskOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nova Demanda
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. CONTEÚDO PRINCIPAL (BOARD OU TELEMETRIA) */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-6 flex flex-col">
        {viewTab === 'board' ? (
          <>
            {/* Barra de Filtro Rápido */}
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="relative max-w-sm w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, clínica ou demanda..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Urgente (4h)
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Normal (24h)
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                  Baixa (72h)
                </div>
              </div>
            </div>

            {/* QUADRO DE COLUNAS ÁGEIS */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 flex-1 items-start">
              {/* COLUNA 1: PENDENTE DE APROVAÇÃO */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col min-h-[600px]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <h3 className="font-bold text-sm text-slate-200">Inbox / Aprovação</h3>
                  </div>
                  <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-full">
                    {pendingApprovalTickets.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {pendingApprovalTickets.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-center text-xs text-slate-600">
                      Nenhuma demanda pendente de aprovação.
                    </div>
                  ) : (
                    pendingApprovalTickets.map(ticket => (
                      <div
                        key={ticket.id}
                        className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 space-y-3 transition shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-400 font-bold">
                            #{ticket.ticket_code}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              ticket.priority === 'urgente'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : ticket.priority === 'normal'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {ticket.priority}
                          </span>
                        </div>

                        <div>
                          <div className="text-xs text-emerald-400 font-semibold mb-1 truncate">
                            {ticket.client_name}
                          </div>
                          <h4 className="text-xs font-medium text-slate-200 leading-snug">
                            {ticket.title}
                          </h4>
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-500">Aprovar p/:</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleApproveDemand(ticket.id, '2')}
                              className="text-[11px] bg-purple-950/80 border border-purple-500/30 text-purple-300 hover:bg-purple-900 px-2.5 py-1 rounded font-semibold transition"
                            >
                              + Caio
                            </button>
                            <button
                              onClick={() => handleApproveDemand(ticket.id, '1')}
                              className="text-[11px] bg-blue-950/80 border border-blue-500/30 text-blue-300 hover:bg-blue-900 px-2.5 py-1 rounded font-semibold transition"
                            >
                              + Guilherme
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* COLUNA 2: FILA DO CAIO */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col min-h-[600px]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <h3 className="font-bold text-sm text-slate-200">Fila do Caio</h3>
                    <span className="text-[11px] text-slate-500">(Suporte & Implantação)</span>
                  </div>
                  <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-full">
                    {caioTickets.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {caioTickets.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-center text-xs text-slate-600">
                      Caio está com a fila zerada!
                    </div>
                  ) : (
                    caioTickets.map(ticket => {
                      const isRunning = ticket.status === 'in_progress' && ticket.assignee_id === currentMemberId;
                      return (
                        <div
                          key={ticket.id}
                          className={`bg-slate-900 border rounded-xl p-4 space-y-3 transition shadow-sm ${
                            isRunning
                              ? 'border-emerald-500 shadow-emerald-950/30'
                              : 'border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-slate-400 font-bold">
                              #{ticket.ticket_code}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {ticket.sla_deadline && (
                                <span className="text-[10px] text-slate-400 flex items-center gap-1 bg-slate-800/60 px-2 py-0.5 rounded">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  {new Date(ticket.sla_deadline).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                  ticket.priority === 'urgente'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {ticket.priority}
                              </span>
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-purple-400 font-semibold mb-1 truncate">
                              {ticket.client_name}
                            </div>
                            <h4 className="text-xs font-medium text-slate-200 leading-snug">
                              {ticket.title}
                            </h4>
                          </div>

                          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                            <span>
                              Tempo gasto:{' '}
                              <strong className="text-white font-mono">
                                {formatHumanTime(
                                  ticket.id === activeTicket?.id ? activeSeconds : ticket.total_time_seconds
                                )}
                              </strong>
                            </span>
                            <button
                              onClick={() => copyWhatsAppMessage(ticket)}
                              className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition"
                              title="Copiar mensagem formatada para WhatsApp"
                            >
                              {copiedId === ticket.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>WhatsApp</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Botões de Ação do Card */}
                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                            {isRunning ? (
                              <button
                                onClick={handlePauseTimer}
                                className="flex-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 hover:bg-amber-500/30 transition"
                              >
                                <Pause className="w-3.5 h-3.5" />
                                Pausar
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStartTimer(ticket.id, '2')}
                                className="flex-1 bg-emerald-500 text-slate-950 font-bold py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-400 transition shadow-sm"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                Iniciar Foco
                              </button>
                            )}

                            {/* Botão de Escalonamento */}
                            <button
                              onClick={() => setEscalateTicketId(ticket.id)}
                              className="bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 border border-slate-700 hover:border-rose-500/40 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition"
                              title="Travei num bug: passar para Guilherme"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                              <span className="hidden sm:inline">Escalar</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* COLUNA 3: FILA DO GUILHERME */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col min-h-[600px]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <h3 className="font-bold text-sm text-slate-200">Fila do Guilherme</h3>
                    <span className="text-[11px] text-slate-500">(Bugs & Arquitetura)</span>
                  </div>
                  <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-full">
                    {guilhermeTickets.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {guilhermeTickets.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-center text-xs text-slate-600">
                      Nenhum bug complexo na fila do Guilherme.
                    </div>
                  ) : (
                    guilhermeTickets.map(ticket => {
                      const isRunning = ticket.status === 'in_progress' && ticket.assignee_id === currentMemberId;
                      return (
                        <div
                          key={ticket.id}
                          className={`bg-slate-900 border rounded-xl p-4 space-y-3 transition shadow-sm ${
                            ticket.is_escalated
                              ? 'border-rose-500/50 bg-rose-950/10'
                              : isRunning
                              ? 'border-emerald-500'
                              : 'border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {/* Banner de Escalonamento */}
                          {ticket.is_escalated && (
                            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2 text-[11px] text-rose-300 flex items-start gap-2">
                              <Flame className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold uppercase tracking-wider text-[10px] text-rose-400 block">
                                  Escalado pelo Caio
                                </span>
                                {ticket.escalation_reason}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-slate-400 font-bold">
                              #{ticket.ticket_code}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                ticket.priority === 'urgente'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-blue-500/20 text-blue-300'
                              }`}
                            >
                              {ticket.priority}
                            </span>
                          </div>

                          <div>
                            <div className="text-xs text-blue-400 font-semibold mb-1 truncate">
                              {ticket.client_name}
                            </div>
                            <h4 className="text-xs font-medium text-slate-200 leading-snug">
                              {ticket.title}
                            </h4>
                          </div>

                          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                            <span>
                              Tempo acumulado:{' '}
                              <strong className="text-white font-mono">
                                {formatHumanTime(
                                  ticket.id === activeTicket?.id ? activeSeconds : ticket.total_time_seconds
                                )}
                              </strong>
                            </span>
                            <button
                              onClick={() => copyWhatsAppMessage(ticket)}
                              className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition"
                            >
                              {copiedId === ticket.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>WhatsApp</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                            {isRunning ? (
                              <button
                                onClick={handlePauseTimer}
                                className="flex-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 hover:bg-amber-500/30 transition"
                              >
                                <Pause className="w-3.5 h-3.5" />
                                Pausar
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStartTimer(ticket.id, '1')}
                                className="flex-1 bg-blue-600 text-white font-bold py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 hover:bg-blue-500 transition shadow-sm"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                Assumir Foco
                              </button>
                            )}

                            <button
                              onClick={() => handleCompleteTask(ticket.id)}
                              className="bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition"
                            >
                              Concluir
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* COLUNA 4: CONCLUÍDOS HOJE */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col min-h-[600px]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h3 className="font-bold text-sm text-slate-200">Concluídos Hoje</h3>
                  </div>
                  <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-full">
                    {completedTickets.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {completedTickets.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-center text-xs text-slate-600">
                      Nenhuma demanda concluída ainda hoje.
                    </div>
                  ) : (
                    completedTickets.map(ticket => (
                      <div
                        key={ticket.id}
                        className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-2 opacity-80 hover:opacity-100 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-500 font-bold">
                            #{ticket.ticket_code}
                          </span>
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Finalizado
                          </span>
                        </div>

                        <div>
                          <div className="text-xs text-slate-400 truncate">{ticket.client_name}</div>
                          <h4 className="text-xs font-medium text-slate-300 line-through">
                            {ticket.title}
                          </h4>
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Executado por: {ticket.assignee_name}</span>
                          <span className="font-mono text-slate-300">
                            ⏱️ {formatHumanTime(ticket.total_time_seconds)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ========================================================================= */
          /* 3. ABA DE TELEMETRIA & HORAS (UNIVERSAL MULTI-CLIENTE) */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Horas Totais Registradas
                </span>
                <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                  {clientStats.totalHours}h
                </div>
                <span className="text-xs text-slate-500">Tempo acumulado de execução</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Total de Demandas
                </span>
                <div className="text-2xl font-black text-white mt-1 font-mono">
                  {clientStats.totalTicketsCount}
                </div>
                <span className="text-xs text-slate-500">Chamados no sistema</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Média por Demanda
                </span>
                <div className="text-2xl font-black text-amber-400 mt-1 font-mono">
                  {clientStats.avgMinutesPerTicket} min
                </div>
                <span className="text-xs text-slate-500">Tempo médio de resolução</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Clientes Atendidos
                </span>
                <div className="text-2xl font-black text-purple-400 mt-1 font-mono">
                  {clientStats.clientsList.length}
                </div>
                <span className="text-xs text-slate-500">Contas com demandas registradas</span>
              </div>
            </div>

            {/* Tabela Universal de Clientes */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">
                  Consumo de Horas e Demandas por Cliente
                </h3>
                <span className="text-xs text-slate-400">
                  {clientStats.clientsList.length} contas monitoradas
                </span>
              </div>

              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3">Cliente / Conta</th>
                    <th className="px-6 py-3">Total de Chamados</th>
                    <th className="px-6 py-3">Chamados Concluídos</th>
                    <th className="px-6 py-3">Tempo Total Gasto</th>
                    <th className="px-6 py-3">Horas Decimais</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {clientStats.clientsList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        Nenhum cliente com tempo registrado ainda. Inicie o cronômetro em uma tarefa para registrar.
                      </td>
                    </tr>
                  ) : (
                    clientStats.clientsList.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-800/40 transition">
                        <td className="px-6 py-3 font-medium text-white">{c.name}</td>
                        <td className="px-6 py-3 font-mono">{c.totalTickets} chamados</td>
                        <td className="px-6 py-3 font-mono text-emerald-400">{c.completedTickets} concluídos</td>
                        <td className="px-6 py-3 font-mono font-semibold text-emerald-400">
                          {c.formattedTime}
                        </td>
                        <td className="px-6 py-3 font-mono font-semibold">{c.hours}h</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 4. MODAL: NOVA DEMANDA RÁPIDA */}
      {/* ========================================================================= */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Criar Nova Demanda Rápida</h3>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Cliente / Grupo de WhatsApp:
                </label>
                <input
                  type="text"
                  value={newClient}
                  onChange={e => setNewClient(e.target.value)}
                  placeholder="Ex: Dr360 - Clínica Sorriso, Cliente 3k..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Descrição da Demanda:
                </label>
                <textarea
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Ex: Corrigir trigger do bot no WhatsApp que não salva telefone no Kommo..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Prioridade / SLA:</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as TicketPriority)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="urgente">Urgente (Até 4h úteis)</option>
                    <option value="normal">Normal (Até 24h úteis)</option>
                    <option value="baixa">Baixa (Até 72h úteis)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Atribuir Inicialmente:</label>
                  <select
                    value={newAssignee}
                    onChange={e => setNewAssignee(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="2">Caio (Suporte & Implantação)</option>
                    <option value="1">Guilherme (Líder / Arquitetura)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewTaskOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-lg transition"
                >
                  Inserir na Fila
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: ESCALAR PARA GUILHERME */}
      {/* ========================================================================= */}
      {escalateTicketId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Escalar Demanda para Guilherme</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              O timer do Caio será pausado nesta tarefa e ela entrará na fila do Guilherme com prioridade
              máxima. Descreva brevemente onde você encontrou dificuldade ou qual o erro técnico:
            </p>

            <div>
              <label className="block text-slate-300 font-semibold mb-1 text-xs">
                Motivo da trava / Erro encontrado:
              </label>
              <textarea
                value={escalateReason}
                onChange={e => setEscalateReason(e.target.value)}
                placeholder="Ex: Webhook retornando erro 500 no Supabase ou loop infinito no bot..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs placeholder-slate-600 focus:outline-none focus:border-rose-500"
                autoFocus
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3 text-xs">
              <button
                type="button"
                onClick={() => {
                  setEscalateTicketId(null);
                  setEscalateReason('');
                }}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmEscalation}
                disabled={!escalateReason.trim()}
                className="bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg transition"
              >
                Confirmar Escalonamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
