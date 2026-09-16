import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Credenciais Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dwqmlzcwfpmjywhliket.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cW1semN3ZnBtanl3aGxpa2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDYxNzIyOCwiZXhwIjoyMDcwMTkzMjI4fQ.BlGV75Ns9joxay1j3cve2NbJaOr3_-k_YeKtcrf6ir4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Palavras-chave que indicam pedidos, bugs ou demandas de clientes
const DEMAND_PATTERNS = [
  /erro/i, /bug/i, /problema/i, /n[ãa]o funciona/i, /parou/i, /n[ãa]o est[áa]/i,
  /preciso/i, /ajuste/i, /ajuda/i, /consegue/i, /alterar/i, /atualizar/i,
  /criar/i, /adicionar/i, /urgente/i, /travou/i, /caiu/i, /chamado/i,
  /socorro/i, /verificar/i, /olhar/i, /bot/i, /webhook/i, /lead/i, /kommo/i
];

const URGENT_PATTERNS = [
  /urgente/i, /fora do ar/i, /parou tudo/i, /n[ãa]o envia nada/i, /travou geral/i, /cr[íi]tico/i, /socorro/i
];

const TECHNICAL_PATTERNS = [
  /webhook/i, /api/i, /integra[çc][ãa]o/i, /c[óo]digo/i, /servidor/i, /banco/i, /401/i, /500/i, /token/i
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apenas aceita POST
  if (req.method !== 'POST') {
    return res.status(200).json({ message: 'Webhook TENNO Ops ativo. Envie requisições POST.' });
  }

  try {
    const body = req.body;

    // Validação básica do payload da Evolution API
    const data = body.data || body;

    const key = data.key || {};
    const messageContent = data.message || {};

    // 1. Ignora mensagens enviadas pelo próprio bot/número (fromMe: true)
    if (key.fromMe) {
      return res.status(200).json({ skipped: true, reason: 'Mensagem enviada pelo próprio número' });
    }

    // 2. Extrai o texto da mensagem
    const text: string = 
      messageContent.conversation ||
      messageContent.extendedTextMessage?.text ||
      messageContent.imageMessage?.caption ||
      messageContent.videoMessage?.caption ||
      data.body ||
      '';

    if (!text || text.trim().length < 6) {
      return res.status(200).json({ skipped: true, reason: 'Texto curto ou vazio' });
    }

    // 3. Verifica se a mensagem tem padrão de demanda/suporte
    const isDemand = DEMAND_PATTERNS.some(p => p.test(text));
    if (!isDemand) {
      return res.status(200).json({ skipped: true, reason: 'Mensagem conversacional comum' });
    }

    // 4. Identificação do Cliente / Grupo
    const remoteJid: string = key.remoteJid || '';
    const pushName: string = data.pushName || '';
    const isGroup = remoteJid.endsWith('@g.us');

    // Nome legível do cliente
    let clientName = isGroup ? `Grupo (${remoteJid.slice(0, 12)}...)` : pushName || 'Cliente WhatsApp';

    // Tenta buscar no banco de clientes se esse grupo já está mapeado
    if (remoteJid) {
      const { data: clientRow } = await supabase
        .from('tenno_clients')
        .select('name')
        .eq('whatsapp_group_id', remoteJid)
        .single();

      if (clientRow?.name) {
        clientName = clientRow.name;
      }
    }

    // 5. Classificação da Demanda
    const isUrgent = URGENT_PATTERNS.some(p => p.test(text));
    const isTechnical = TECHNICAL_PATTERNS.some(p => p.test(text));

    const priority = isUrgent ? 'urgente' : 'normal';
    const slaHours = isUrgent ? 4 : 24;
    // Busca UUID do membro sugerido dinamicamente no banco
    const targetRole = isTechnical ? 'lider_tecnico' : 'assistente_operacional';
    const { data: memberRow } = await supabase
      .from('tenno_team_members')
      .select('id')
      .eq('role', targetRole)
      .limit(1)
      .single();

    const suggestedAssignee = memberRow?.id || null;

    // Cria título conciso (primeira frase ou até 90 caracteres)
    const cleanTitle = text.split('\n')[0].slice(0, 95);

    // 6. Insere na tabela tenno_tickets no Supabase com status 'pending_approval'
    const { data: insertedTicket, error: insertError } = await supabase
      .from('tenno_tickets')
      .insert({
        title: cleanTitle,
        description: text,
        client_name: clientName,
        origin_whatsapp_group_id: remoteJid,
        origin_whatsapp_message_id: key.id,
        priority: priority,
        sla_hours_target: slaHours,
        assignee_id: suggestedAssignee,
        status: 'pending_approval'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir ticket no Supabase:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    return res.status(200).json({
      success: true,
      ticket_id: insertedTicket?.id,
      ticket_code: insertedTicket?.ticket_code,
      title: cleanTitle,
      client: clientName,
      priority: priority,
      message: 'Demanda capturada e enviada para a coluna de Aprovação do Painel TENNO Ops!'
    });

  } catch (error: any) {
    console.error('Erro interno no webhook:', error);
    return res.status(500).json({ error: error.message || 'Erro interno' });
  }
}
