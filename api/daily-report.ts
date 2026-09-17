import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dwqmlzcwfpmjywhliket.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cW1semN3ZnBtanl3aGxpa2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDYxNzIyOCwiZXhwIjoyMDcwMTkzMjI4fQ.BlGV75Ns9joxay1j3cve2NbJaOr3_-k_YeKtcrf6ir4';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evolution-evolution-api.okgklo.easypanel.host';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11';
const EVOLUTION_API_INSTANCE = process.env.EVOLUTION_API_INSTANCE || 'Guilherme';

// Grupo oficial para envio dos relatórios diários
const DAILY_REPORT_GROUP_JID = '120363427677526608@g.us';

function formatHumanTime(sec: number): string {
  if (!sec || sec < 60) return `${sec || 0}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const isForce = req.query.force === 'true' || req.method === 'POST';

    // 1. Busca configurações de SLA para verificar horário final de expediente
    let endHour = 18;
    try {
      const slaRes = await fetch(`${SUPABASE_URL}/rest/v1/tenno_sla_settings?select=*&limit=1`, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      if (slaRes.ok) {
        const slaData = await slaRes.json();
        if (Array.isArray(slaData) && slaData.length > 0 && slaData[0].end_hour) {
          endHour = Number(slaData[0].end_hour);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar SLA settings:', err);
    }

    // Se for execução de cron automática (sem force), valida se estamos dentro da janela de 30 minutos antes do fim
    // Fuso de São Paulo (UTC-3)
    const nowUtc = new Date();
    const spTimeStr = nowUtc.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
    const spDate = new Date(spTimeStr);
    const spHour = spDate.getHours();
    const spMinute = spDate.getMinutes();

    // 30 min antes do endHour (ex: endHour 18 -> target 17:30)
    const targetReportHour = endHour - 1;
    const targetReportMin = 30;

    if (!isForce) {
      const isCorrectTime = spHour === targetReportHour && Math.abs(spMinute - targetReportMin) <= 15;
      if (!isCorrectTime) {
        return res.status(200).json({
          skipped: true,
          reason: `Fora da janela de envio (atual: ${spHour}:${spMinute} BRT, esperado: ${targetReportHour}:${targetReportMin} BRT). Use ?force=true para envio imediato.`
        });
      }
    }

    // 2. Busca todos os tickets do banco Supabase
    const ticketsRes = await fetch(`${SUPABASE_URL}/rest/v1/tenno_tickets?select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!ticketsRes.ok) {
      return res.status(500).json({ error: 'Falha ao buscar tickets do banco' });
    }

    const tickets: any[] = await ticketsRes.json();

    // Data de hoje em São Paulo
    const todayYMD = spDate.toISOString().split('T')[0];

    // Separa concluídos hoje e pendentes
    const completedToday: any[] = [];
    const openTickets: any[] = [];

    let guilhermeSeconds = 0;
    let guilhermeCount = 0;
    let caioSeconds = 0;
    let caioCount = 0;

    tickets.forEach(t => {
      const isCompleted = t.status === 'completed';
      const completedDate = t.completed_at ? t.completed_at.substring(0, 10) : null;

      if (isCompleted && (completedDate === todayYMD || isForce)) {
        completedToday.push(t);
      }

      if (['in_queue', 'in_progress', 'paused', 'pending_approval'].includes(t.status)) {
        openTickets.push(t);
      }

      // Soma tempo gasto
      const totalSec = t.total_time_seconds || 0;
      if (t.assignee_id === '1' || t.assignee_name?.toLowerCase().includes('guilherme')) {
        guilhermeSeconds += totalSec;
        if (totalSec > 0 || isCompleted) guilhermeCount++;
      } else if (t.assignee_id === '2' || t.assignee_name?.toLowerCase().includes('caio')) {
        caioSeconds += totalSec;
        if (totalSec > 0 || isCompleted) caioCount++;
      }
    });

    const totalSeconds = guilhermeSeconds + caioSeconds;
    const formattedDate = spDate.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // 3. Monta a mensagem do WhatsApp estruturada e legível
    let msg = `📊 *TENNO OPS — RELATÓRIO DIÁRIO DE OPERAÇÕES*\n`;
    msg += `📅 *${formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)}*\n\n`;

    msg += `⏱️ *TEMPO TOTAL DE FOCO DA EQUIPE:*\n`;
    msg += `• 👤 *Guilherme:* ${formatHumanTime(guilhermeSeconds)} (${guilhermeCount} demanda(s))\n`;
    msg += `• 👤 *Caio:* ${formatHumanTime(caioSeconds)} (${caioCount} demanda(s))\n`;
    msg += `⚡ *Total Geral:* ${formatHumanTime(totalSeconds)}\n\n`;

    msg += `✅ *TAREFAS CONCLUÍDAS HOJE (${completedToday.length}):*\n`;
    if (completedToday.length === 0) {
      msg += `_Nenhuma tarefa finalizada hoje._\n`;
    } else {
      completedToday.forEach(t => {
        const time = formatHumanTime(t.total_time_seconds || 0);
        msg += `• *#${t.ticket_code || '---'}* [${t.client_name || 'Geral'}] ${t.title} _(${time} - ${t.assignee_name || 'Equipe'})_\n`;
      });
    }
    msg += `\n`;

    msg += `⏳ *DEMANDAS EM ABERTO / PARA AMANHÃ (${openTickets.length}):*\n`;
    if (openTickets.length === 0) {
      msg += `_Todas as demandas foram zeradas! Parabéns time._\n`;
    } else {
      openTickets.slice(0, 15).forEach(t => {
        const prioTag = t.priority === 'urgente' ? '🔴 URGENTE' : t.priority === 'normal' ? '🟡 NORMAL' : '⚪ BAIXA';
        const statusTag = t.status === 'paused' ? '⏸️ Pausada' : t.status === 'in_progress' ? '⚡ Em Foco' : '📋 Na Fila';
        msg += `• *#${t.ticket_code || '---'}* [${prioTag}] ${t.client_name || 'Geral'}: ${t.title} _(${statusTag} - ${t.assignee_name || 'A definir'})_\n`;
      });
      if (openTickets.length > 15) {
        msg += `_... e mais ${openTickets.length - 15} demanda(s) na fila._\n`;
      }
    }

    msg += `\n🔒 _Relatório automático gerado 30 min antes do encerramento do expediente (${endHour}:00)._`;

    // 4. Envia via Evolution API para o grupo "Relatórios Diários"
    const evoUrl = `${EVOLUTION_API_URL.replace(/\/$/, '')}/message/sendText/${EVOLUTION_API_INSTANCE}`;
    const evoRes = await fetch(evoUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: DAILY_REPORT_GROUP_JID,
        text: msg,
        delay: 1200
      })
    });

    const evoData = await evoRes.json().catch(() => ({}));

    return res.status(200).json({
      success: true,
      message_sent: evoRes.ok,
      group_jid: DAILY_REPORT_GROUP_JID,
      completed_count: completedToday.length,
      open_count: openTickets.length,
      total_time: formatHumanTime(totalSeconds),
      evo_response: evoData,
      report_text: msg
    });

  } catch (err: any) {
    console.error('Erro ao gerar relatório diário:', err);
    return res.status(500).json({ error: err.message || 'Falha ao gerar relatório' });
  }
}
