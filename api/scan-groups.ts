import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_supabase';

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
  // Aceita GET (para cronjobs do Vercel) e POST (para acionamento manual no painel)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Busca mensagens pendentes de triagem no buffer
    const { data: rawMessages, error: fetchError } = await supabase
      .from('tenno_whatsapp_buffer')
      .select('*')
      .eq('processed', false)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(250);

    if (fetchError) {
      console.error('Erro ao buscar buffer do WhatsApp:', fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    if (!rawMessages || rawMessages.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhuma mensagem pendente no buffer para triagem.',
        scanned_groups: 0,
        tickets_created: 0
      });
    }

    // 2. Agrupa mensagens por remote_jid (grupo ou chat)
    const messagesByGroup = new Map<string, BufferMessage[]>();
    for (const msg of rawMessages as BufferMessage[]) {
      if (!msg.message_text || msg.message_text.trim().length === 0) continue;
      const list = messagesByGroup.get(msg.remote_jid) || [];
      list.push(msg);
      messagesByGroup.set(msg.remote_jid, list);
    }

    // 3. Carrega membros da equipe para associação automática
    const { data: teamMembers } = await supabase
      .from('tenno_team_members')
      .select('id, name, role');

    const guilherme = teamMembers?.find(m => m.role === 'lider_tecnico');
    const caio = teamMembers?.find(m => m.role === 'assistente_operacional');

    let totalCreatedTickets = 0;
    const resultsSummary = [];

    // 4. Processa cada grupo com a IA via OpenRouter
    for (const [remoteJid, messages] of messagesByGroup.entries()) {
      // Identifica cliente vinculado se existir
      const { data: clientRow } = await supabase
        .from('tenno_clients')
        .select('id, name')
        .eq('whatsapp_group_id', remoteJid)
        .maybeSingle();

      const groupLabel = clientRow?.name || messages[0]?.group_name || `Grupo (${remoteJid.slice(0, 14)}...)`;

      // Monta o histórico cronológico de diálogo com autoria
      const conversationBlock = messages
        .map(m => {
          const roleTag = m.is_from_me ? '[EQUIPE TENNO]' : '[CLIENTE]';
          const author = m.sender_name || (m.is_from_me ? 'TENNO' : 'Cliente');
          const editedTag = m.is_edited ? ' (editada)' : '';
          return `${roleTag} ${author}${editedTag}: ${m.message_text}`;
        })
        .join('\n');

      // Se não tiver chave de OpenRouter configurada, fazemos fallback analítico de regras
      let aiResult: {
        has_pending_demands: boolean;
        reason?: string;
        demands?: Array<{
          title: string;
          description: string;
          priority: 'normal' | 'urgente';
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
A sua missão é analisar um bloco de mensagens de um grupo de suporte no WhatsApp e decidir se existe alguma DEMANDA PENDENTE ou ACOMPANHAMENTO que precisa de ação da equipe técnica/operacional.

REGRAS OBRIGATÓRIAS:
1. ANÁLISE DE RESOLUÇÃO: Se o cliente relatou uma dúvida, erro ou pedido, MAS alguém da [EQUIPE TENNO] (ou o próprio cliente) já respondeu, orientou ou resolveu na própria conversa, NÃO gere tarefa operacional! Marque has_pending_demands = false.
2. CONVERSA SOCIAL: Bom dia, obrigado, valeu, áudios/mensagens de cortesia não são tarefas.
3. DEMANDA PENDENTE: Gere tarefa se o cliente solicitou algo que AINDA NÃO FOI RESOLVIDO e exige que a equipe altere código, crie automação, resolva bug no Kommo/n8n/webhook, etc.
4. TAREFA DE ACOMPANHAMENTO (FOLLOW-UP): Se a [EQUIPE TENNO] solicitou algo a um terceiro, gestor de tráfego ou cliente (ex: "me envia o acesso ao portfólio da Meta", "preciso do código que chegou no SMS", "aguardo aprovação"), e a conversa encerrou aguardando essa resposta do terceiro, ESSA TAREFA DEVE EXISTIR como acompanhamento!
   - Defina is_followup: true
   - title: "Acompanhar: [O que foi pedido]" (ex: "Acompanhar liberação de acesso ao portfólio Meta com gestor de tráfego")
   - pause_category: "aguardando_cliente"
   - next_action_by: "cliente"
   - pause_reason: "Aguardando envio de acesso/informação solicitada pela equipe"
5. Responda EXCLUSIVAMENTE em formato JSON com este schema:
{
  "has_pending_demands": boolean,
  "reason": "explicação curta da sua decisão",
  "demands": [
    {
      "title": "título curto, claro e acionável (máx 80 caracteres)",
      "description": "resumo do que foi pedido e o que precisa ser feito",
      "priority": "normal" | "urgente",
      "suggested_role": "lider_tecnico" | "assistente_operacional",
      "is_followup": boolean,
      "pause_reason": string | null,
      "pause_category": "aguardando_cliente" | "problema_tecnico" | "aguardando_meta" | "outro" | null,
      "next_action_by": "cliente" | "guilherme" | "caio" | null
    }
  ]
}`;

          const userPrompt = `CLIENTE/GRUPO: ${groupLabel}\n\nHISTÓRICO DO BLOCO RECENTE:\n${conversationBlock}\n\nAnalise o histórico e retorne apenas o JSON.`;

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
            })
          });

          if (response.ok) {
            const aiData = await response.json();
            const textContent = aiData.choices?.[0]?.message?.content || '{}';
            // Limpa possíveis blocos ```json se houver
            const cleanJson = textContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
            aiResult = JSON.parse(cleanJson);
          } else {
            console.error('Falha na resposta do OpenRouter:', await response.text());
          }
        } catch (openRouterErr) {
          console.error('Erro ao consultar OpenRouter:', openRouterErr);
        }
      } else {
        // Sem OPENROUTER_API_KEY: Fallback heurístico inteligente
        // Se a última mensagem do bloco for da EQUIPE TENNO, assume que foi atendido
        const lastMsg = messages[messages.length - 1];
        const hasTeamReply = lastMsg.is_from_me;
        
        if (!hasTeamReply) {
          // Verifica se há padrões de dúvida/erro
          const demandKeywords = [/erro/i, /bug/i, /n[ãa]o funciona/i, /parou/i, /preciso/i, /ajuste/i, /socorro/i];
          const hasKeyword = messages.some(m => !m.is_from_me && demandKeywords.some(k => k.test(m.message_text || '')));
          
          if (hasKeyword) {
            aiResult = {
              has_pending_demands: true,
              reason: 'Cliente enviou solicitação sem resposta imediata da equipe (modo heurístico)',
              demands: [
                {
                  title: `Demanda de suporte em ${groupLabel}`,
                  description: conversationBlock.slice(0, 400),
                  priority: 'normal',
                  suggested_role: 'assistente_operacional'
                }
              ]
            };
          }
        }
      }

      // 5. Se a IA identificou demandas pendentes, cria os tickets
      if (aiResult.has_pending_demands && aiResult.demands && aiResult.demands.length > 0) {
        for (const demand of aiResult.demands) {
          const assigneeId = demand.suggested_role === 'lider_tecnico' ? guilherme?.id : caio?.id;
          const slaHours = demand.priority === 'urgente' ? 4 : 24;

          const { error: ticketError } = await supabase
            .from('tenno_tickets')
            .insert({
              title: demand.title,
              description: `${demand.description}\n\n--- Contexto extraído via WhatsApp na última janela ---\n${conversationBlock.slice(0, 800)}`,
              client_id: clientRow?.id || null,
              client_name: groupLabel,
              origin_whatsapp_group_id: remoteJid,
              priority: demand.priority,
              sla_hours_target: slaHours,
              assignee_id: assigneeId || null,
              status: demand.is_followup ? 'paused' : 'pending_approval',
              pause_reason: demand.is_followup ? (demand.pause_reason || 'Aguardando ação de terceiro/cliente') : null,
              pause_category: demand.is_followup ? (demand.pause_category || 'aguardando_cliente') : null,
              next_action_by: demand.is_followup ? (demand.next_action_by || 'cliente') : null,
              paused_at: demand.is_followup ? new Date().toISOString() : null
            });

          if (!ticketError) {
            totalCreatedTickets++;
          }
        }
      }

      // 6. Marca todas as mensagens deste grupo como processadas
      const messageDbIds = messages.map(m => m.id);
      await supabase
        .from('tenno_whatsapp_buffer')
        .update({
          processed: true,
          processed_at: new Date().toISOString()
        })
        .in('id', messageDbIds);

      resultsSummary.push({
        group: groupLabel,
        messages_count: messages.length,
        has_pending_demands: aiResult.has_pending_demands,
        reason: aiResult.reason,
        created_tickets: aiResult.demands?.length || 0
      });
    }

    return res.status(200).json({
      success: true,
      scanned_groups: messagesByGroup.size,
      total_messages_processed: rawMessages.length,
      tickets_created: totalCreatedTickets,
      openrouter_active: !!OPENROUTER_API_KEY,
      details: resultsSummary
    });

  } catch (error: any) {
    console.error('Erro no scan-groups:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
