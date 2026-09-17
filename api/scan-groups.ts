import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dwqmlzcwfpmjywhliket.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cW1semN3ZnBtanl3aGxpa2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDYxNzIyOCwiZXhwIjoyMDcwMTkzMjI4fQ.BlGV75Ns9joxay1j3cve2NbJaOr3_-k_YeKtcrf6ir4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export const maxDuration = 60;

// Configuração OpenRouter
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

interface BufferMessage {
  id: string;
  message_id: string;
  remote_jid: string;
  group_name: string | null;
  sender_name: string | null;
  sender_id: string | null;
  is_from_me: boolean;
  message_text: string | null;
  message_timestamp: number | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Aceita GET (para cronjobs do Vercel) e POST (para acionamento manual no painel)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Carrega estritamente os grupos que possuem CLIENTE VINCULADO
    const { data: mappings, error: mapError } = await supabase
      .from('tenno_group_mappings')
      .select('remote_jid, client_name, group_name')
      .not('client_name', 'is', null)
      .neq('client_name', '');

    if (mapError) {
      console.error('Erro ao buscar mapeamentos de grupos:', mapError);
    }

    const { data: directClients } = await supabase
      .from('tenno_clients')
      .select('id, name, whatsapp_group_id')
      .not('whatsapp_group_id', 'is', null)
      .neq('whatsapp_group_id', '');

    const clientMap = new Map<string, { client_name: string; group_name: string; client_id?: string }>();

    mappings?.forEach(m => {
      const cName = m.client_name?.trim();
      if (cName && m.remote_jid) {
        clientMap.set(m.remote_jid, {
          client_name: cName,
          group_name: m.group_name?.trim() || cName
        });
      }
    });

    directClients?.forEach(c => {
      const cName = c.name?.trim();
      if (cName && c.whatsapp_group_id && !clientMap.has(c.whatsapp_group_id)) {
        clientMap.set(c.whatsapp_group_id, {
          client_name: cName,
          group_name: cName,
          client_id: c.id
        });
      }
    });

    const allowedJids = Array.from(clientMap.keys());
    if (allowedJids.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhum grupo vinculado a cliente encontrado no mapeamento.',
        scanned_groups: 0,
        tickets_created: 0
      });
    }

    // 2. Busca mensagens pendentes no buffer
    const { data: rawMessages, error: fetchError } = await supabase
      .from('tenno_whatsapp_buffer')
      .select('*')
      .eq('processed', false)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(350);

    if (fetchError) {
      console.error('Erro ao buscar buffer do WhatsApp:', fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    // Marca mensagens de grupos NÃO vinculados como processadas para não acumular lixo
    const unmappedMessages = (rawMessages || []).filter(m => !clientMap.has(m.remote_jid));
    if (unmappedMessages.length > 0) {
      const unmappedIds = unmappedMessages.map(m => m.id);
      await supabase
        .from('tenno_whatsapp_buffer')
        .update({
          processed: true,
          processed_at: new Date().toISOString()
        })
        .in('id', unmappedIds);
    }

    // Filtra exclusivamente as mensagens de clientes vinculados
    const validPendingMessages = (rawMessages || []).filter(m => clientMap.has(m.remote_jid));

    if (validPendingMessages.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhuma mensagem pendente de clientes vinculados para triagem.',
        scanned_groups: 0,
        tickets_created: 0
      });
    }

    // 3. Agrupa as mensagens pendentes por remote_jid
    const pendingByGroup = new Map<string, BufferMessage[]>();
    for (const msg of validPendingMessages as BufferMessage[]) {
      if (!msg.message_text || msg.message_text.trim().length === 0) continue;
      const list = pendingByGroup.get(msg.remote_jid) || [];
      list.push(msg);
      pendingByGroup.set(msg.remote_jid, list);
    }

    // 4. Carrega membros da equipe para associação automática
    const { data: teamMembers } = await supabase
      .from('tenno_team_members')
      .select('id, name, role');

    const guilherme = teamMembers?.find(m => m.role === 'lider_tecnico');
    const caio = teamMembers?.find(m => m.role === 'assistente_operacional');

    // 5. Carrega configurações de SLA para cálculo de deadline comercial útil
    const { data: slaSettings } = await supabase
      .from('tenno_sla_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    const urgentHours = slaSettings?.urgent_hours || 4;
    const normalHours = slaSettings?.normal_hours || 24;
    const lowHours = slaSettings?.low_hours || 72;
    const startHour = slaSettings?.work_start_hour ?? 9;
    const endHour = slaSettings?.work_end_hour ?? 18;

    const calculateBusinessDeadline = (businessHours: number): string => {
      const date = new Date();
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
      return date.toISOString();
    };

    let totalCreatedTickets = 0;
    const resultsSummary = [];

    // 6. Processa cada grupo de cliente com contexto enriquecido (mínimo 5 mensagens)
    for (const [remoteJid, pendingMsgs] of pendingByGroup.entries()) {
      const clientInfo = clientMap.get(remoteJid);
      if (!clientInfo) continue;

      const clientName = clientInfo.client_name;
      const groupName = clientInfo.group_name;

      // Busca as últimas 8 a 10 mensagens deste grupo no buffer (incluindo da equipe e já lidas)
      // para fornecer contexto rico (pelo menos 5 mensagens) à IA
      const { data: recentHistory } = await supabase
        .from('tenno_whatsapp_buffer')
        .select('*')
        .eq('remote_jid', remoteJid)
        .eq('is_deleted', false)
        .order('message_timestamp', { ascending: false })
        .limit(8);

      // Coloca em ordem cronológica (mais antigas -> mais novas)
      const contextList: BufferMessage[] = recentHistory && recentHistory.length > 0
        ? ([...recentHistory].reverse() as BufferMessage[])
        : pendingMsgs;

      // Monta o histórico cronológico de diálogo com autoria
      const conversationBlock = contextList
        .map(m => {
          const roleTag = m.is_from_me ? '[EQUIPE TENNO]' : '[CLIENTE]';
          const author = m.sender_name || (m.is_from_me ? 'TENNO' : clientName);
          const editedTag = m.is_edited ? ' (editada)' : '';
          return `${roleTag} ${author}${editedTag}: ${m.message_text}`;
        })
        .join('\n');

      let aiResult: {
        has_pending_demands: boolean;
        reason?: string;
        demands?: Array<{
          title: string;
          description: string;
          priority: 'baixa' | 'normal' | 'urgente';
          suggested_role: 'lider_tecnico' | 'assistente_operacional';
          is_followup?: boolean;
          pause_reason?: string;
          pause_category?: 'aguardando_cliente' | 'problema_tecnico' | 'aguardando_meta' | 'outro';
          next_action_by?: 'cliente' | 'guilherme' | 'caio';
        }>;
      } = { has_pending_demands: false };

      if (OPENROUTER_API_KEY) {
        try {
          const systemPrompt = `Você é o Agente de Triagem Operacional da TENNO Automações.
A sua missão é analisar um histórico recente de mensagens de um grupo de WhatsApp vinculado a um cliente e decidir se existe alguma DEMANDA PENDENTE ou ACOMPANHAMENTO que necessita de ação da equipe técnica/operacional.

REGRAS OBRIGATÓRIAS:
1. ANÁLISE DE RESOLUÇÃO: Se o cliente relatou uma dúvida, erro ou solicitação, MAS alguém da [EQUIPE TENNO] (ou o próprio cliente) já respondeu, orientou ou resolveu no histórico recente, NÃO gere tarefa operacional! Marque has_pending_demands = false.
2. CONVERSA SOCIAL: Cumprimentos (bom dia, boa tarde), agradecimentos, reações ou mensagens de cortesia NÃO são tarefas.
3. DEMANDA PENDENTE: Gere tarefa se houver um pedido que AINDA NÃO FOI RESOLVIDO e exige alteração de automação, n8n, Kommo, Webhook, banco de dados ou suporte técnico.
4. PRIORIZAÇÃO REALISTA:
   - "urgente": Apenas quando há parada total de operação, faturamento travado ou erro crítico com cliente perdendo leads.
   - "normal": Solicitações padrão de ajustes, dúvidas técnicas ou melhorias normais.
   - "baixa": Pequenas alterações estéticas, dúvidas secundárias ou tarefas sem urgência.
5. TAREFA DE ACOMPANHAMENTO (FOLLOW-UP): Se a [EQUIPE TENNO] solicitou algo a um terceiro, gestor de tráfego ou ao próprio cliente (ex: envio de acesso ao portfólio Meta, código SMS, aprovação de fluxo), e o diálogo encerrou aguardando essa resposta do cliente/terceiro:
   - Defina is_followup: true
   - title: "Acompanhar: [O que foi solicitado]"
   - pause_category: "aguardando_cliente"
   - next_action_by: "cliente"
   - pause_reason: "Aguardando retorno do cliente/terceiro"

Responda EXCLUSIVAMENTE em formato JSON com este schema:
{
  "has_pending_demands": boolean,
  "reason": "explicação curta da sua decisão",
  "demands": [
    {
      "title": "título curto, claro e acionável (máx 80 caracteres)",
      "description": "resumo do que foi pedido e o que precisa ser feito",
      "priority": "baixa" | "normal" | "urgente",
      "suggested_role": "lider_tecnico" | "assistente_operacional",
      "is_followup": boolean,
      "pause_reason": string | null,
      "pause_category": "aguardando_cliente" | "problema_tecnico" | "aguardando_meta" | "outro" | null,
      "next_action_by": "cliente" | "guilherme" | "caio" | null
    }
  ]
}`;

          const userPrompt = `CLIENTE: ${clientName} (Grupo: ${groupName})\n\nHISTÓRICO RECENTE DAS MENSAGENS:\n${conversationBlock}\n\nAnalise o histórico e retorne apenas o JSON.`;

          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
              'HTTP-Referer': 'https://tenno-ops-panel.vercel.app',
              'X-Title': 'TENNO Ops Batch Scanner'
            },
            body: JSON.stringify({
              model: OPENROUTER_MODEL,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              temperature: 0.1,
              response_format: { type: 'json_object' }
            }),
            signal: AbortSignal.timeout(9000)
          });

          if (response.ok) {
            const aiData = await response.json();
            const textContent = aiData.choices?.[0]?.message?.content || '{}';
            const cleanJson = textContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
            aiResult = JSON.parse(cleanJson);
          } else {
            console.error('Falha na resposta do OpenRouter:', await response.text());
          }
        } catch (openRouterErr) {
          console.error('Erro ao consultar OpenRouter:', openRouterErr);
        }
      } else {
        // Fallback heurístico inteligente
        const lastMsg = contextList[contextList.length - 1];
        const hasTeamReply = lastMsg.is_from_me;
        
        if (!hasTeamReply) {
          const demandKeywords = [/erro/i, /bug/i, /n[ãa]o funciona/i, /parou/i, /preciso/i, /ajuste/i, /socorro/i];
          const hasKeyword = contextList.some(m => !m.is_from_me && demandKeywords.some(k => k.test(m.message_text || '')));
          
          if (hasKeyword) {
            aiResult = {
              has_pending_demands: true,
              reason: 'Cliente enviou solicitação sem resposta imediata da equipe (modo heurístico)',
              demands: [
                {
                  title: `Demanda de suporte: ${clientName}`,
                  description: conversationBlock.slice(0, 400),
                  priority: 'normal',
                  suggested_role: 'assistente_operacional'
                }
              ]
            };
          }
        }
      }

      // 7. Se a IA identificou demandas pendentes, cria os tickets com o nome do cliente
      if (aiResult.has_pending_demands && aiResult.demands && aiResult.demands.length > 0) {
        for (const demand of aiResult.demands) {
          const assigneeId = demand.suggested_role === 'lider_tecnico' ? guilherme?.id : caio?.id;
          const priority = demand.priority || 'normal';
          const slaHours = priority === 'urgente' ? urgentHours : priority === 'baixa' ? lowHours : normalHours;
          const deadlineIso = calculateBusinessDeadline(slaHours);

          const { error: ticketError } = await supabase
            .from('tenno_tickets')
            .insert({
              title: demand.title,
              description: `${demand.description}\n\n--- Contexto extraído via WhatsApp na última janela ---\n${conversationBlock.slice(0, 1000)}`,
              client_id: clientInfo.client_id || null,
              client_name: clientName,
              origin_whatsapp_group_id: remoteJid,
              priority: priority,
              sla_hours_target: slaHours,
              sla_deadline: deadlineIso,
              assignee_id: assigneeId || null,
              status: 'pending_approval',
              approved_at: null,
              pause_reason: demand.is_followup ? (demand.pause_reason || 'Aguardando ação do cliente/terceiro') : null,
              pause_category: demand.is_followup ? (demand.pause_category || 'aguardando_cliente') : null,
              next_action_by: demand.is_followup ? (demand.next_action_by || 'cliente') : null,
              paused_at: null
            });

          if (!ticketError) {
            totalCreatedTickets++;
          } else {
            console.error('Erro ao salvar ticket:', ticketError);
          }
        }
      }

      // 8. Marca todas as mensagens pendentes deste grupo como processadas
      const messageDbIds = pendingMsgs.map(m => m.id);
      await supabase
        .from('tenno_whatsapp_buffer')
        .update({
          processed: true,
          processed_at: new Date().toISOString()
        })
        .in('id', messageDbIds);

      resultsSummary.push({
        client: clientName,
        group: groupName,
        messages_analyzed: contextList.length,
        has_pending_demands: aiResult.has_pending_demands,
        reason: aiResult.reason,
        created_tickets: aiResult.demands?.length || 0
      });
    }

    return res.status(200).json({
      success: true,
      scanned_groups: pendingByGroup.size,
      total_messages_processed: validPendingMessages.length,
      tickets_created: totalCreatedTickets,
      openrouter_active: !!OPENROUTER_API_KEY,
      details: resultsSummary
    });

  } catch (error: any) {
    console.error('Erro no scan-groups:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
