import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Credenciais Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dwqmlzcwfpmjywhliket.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cW1semN3ZnBtanl3aGxpa2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDYxNzIyOCwiZXhwIjoyMDcwMTkzMjI4fQ.BlGV75Ns9joxay1j3cve2NbJaOr3_-k_YeKtcrf6ir4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Função auxiliar para extrair texto de qualquer estrutura de mensagem do Baileys / Evolution API
function extractMessageText(messageObj: any): string {
  if (!messageObj) return '';
  if (typeof messageObj === 'string') return messageObj;
  
  return (
    messageObj.conversation ||
    messageObj.extendedTextMessage?.text ||
    messageObj.imageMessage?.caption ||
    messageObj.videoMessage?.caption ||
    messageObj.documentMessage?.caption ||
    messageObj.buttonsResponseMessage?.selectedButtonId ||
    messageObj.listResponseMessage?.singleSelectReply?.selectedRowId ||
    messageObj.templateButtonReplyMessage?.selectedId ||
    ''
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(200).json({ message: 'Webhook TENNO Ops ativo. Envie requisições POST.' });
  }

  try {
    const body = req.body || {};
    // A Evolution API pode enviar o evento em body.event, body.type ou body.data.event
    const rawEvent = (body.event || body.type || body.data?.event || '').toString().toLowerCase();
    const data = body.data || body;

    // =========================================================================
    // EVENTO 1: GROUPS.UPSERT (Novo Grupo Criado / Adicionado -> Implementação)
    // =========================================================================
    if (
      rawEvent.includes('groups.upsert') || 
      rawEvent.includes('group-update') ||
      rawEvent.includes('group.create') ||
      rawEvent === 'groups_upsert'
    ) {
      const groupData = Array.isArray(data) ? data[0] : data;
      const remoteJid = groupData?.id || groupData?.jid || '';
      const subject = groupData?.subject || groupData?.name || `Novo Grupo (${remoteJid.slice(0, 10)})`;

      if (remoteJid) {
        // 1. Cadastra ou atualiza o cliente na tabela tenno_clients
        const { data: existingClient } = await supabase
          .from('tenno_clients')
          .select('id, name')
          .eq('whatsapp_group_id', remoteJid)
          .maybeSingle();

        let clientId = existingClient?.id;

        if (!clientId) {
          const { data: newClient } = await supabase
            .from('tenno_clients')
            .insert({
              name: subject,
              type: 'recorrente',
              whatsapp_group_id: remoteJid,
              whatsapp_group_name: subject,
              sla_priority_default: 'urgente'
            })
            .select('id')
            .single();

          clientId = newClient?.id;
        }

        // 2. Cria ticket de implementação automática para novo cliente
        const { data: ticket, error: ticketError } = await supabase
          .from('tenno_tickets')
          .insert({
            title: `Implementação Novo Cliente: ${subject}`,
            description: `Novo grupo de WhatsApp conectado (${remoteJid}). Realizar onboarding operacional, configuração de integrações e alinhamento de SLA.`,
            client_id: clientId || null,
            client_name: subject,
            origin_whatsapp_group_id: remoteJid,
            priority: 'urgente',
            sla_hours_target: 24,
            status: 'pending_approval'
          })
          .select('id, ticket_code')
          .single();

        return res.status(200).json({
          success: true,
          event: 'groups.upsert',
          action: 'implementation_ticket_created',
          ticket_id: ticket?.id,
          ticket_code: ticket?.ticket_code,
          group: subject
        });
      }
    }

    // =========================================================================
    // EVENTO 2: MESSAGES.DELETE (Mensagem Apagada -> Marca no Buffer)
    // =========================================================================
    if (
      rawEvent.includes('messages.delete') || 
      rawEvent === 'messages_delete'
    ) {
      const deleteKey = data.key || (Array.isArray(data.keys) ? data.keys[0] : data);
      const messageId = deleteKey?.id || data?.id;

      if (messageId) {
        await supabase
          .from('tenno_whatsapp_buffer')
          .update({ is_deleted: true })
          .eq('message_id', messageId);

        return res.status(200).json({
          success: true,
          event: 'messages.delete',
          message_id: messageId,
          marked_deleted: true
        });
      }
    }

    // =========================================================================
    // EVENTO 3: MESSAGES.UPDATE (Mensagem Editada ou Atualizada)
    // =========================================================================
    if (
      rawEvent.includes('messages.update') || 
      rawEvent === 'messages_update'
    ) {
      const updates = Array.isArray(data) ? data : [data];
      for (const item of updates) {
        const key = item.key || {};
        const messageId = key.id;
        if (!messageId) continue;

        // Verifica se há texto editado (geralmente em editedMessage ou message direta)
        const editedMsg = item.update?.message || item.message || item.editedMessage;
        const newText = extractMessageText(editedMsg);

        if (newText) {
          await supabase
            .from('tenno_whatsapp_buffer')
            .update({
              message_text: newText,
              is_edited: true
            })
            .eq('message_id', messageId);
        }
      }

      return res.status(200).json({
        success: true,
        event: 'messages.update',
        processed_updates: updates.length
      });
    }

    // =========================================================================
    // EVENTO 4: MESSAGES.UPSERT (Mensagens Recebidas e Enviadas)
    // =========================================================================
    // Trata mensagens normais, respostas nossas (fromMe) e protocolos de delete
    const messages = Array.isArray(data) ? data : [data];

    for (const item of messages) {
      const key = item.key || {};
      const messageContent = item.message || {};
      const messageId = key.id;
      const remoteJid = key.remoteJid || '';

      if (!messageId || !remoteJid) continue;

      // 4.1. Verifica se é um protocolo de revogação/delete embutido no upsert
      if (messageContent.protocolMessage) {
        const proto = messageContent.protocolMessage;
        // Tipo 0 ou REVOKE no protocolo do Baileys
        if (proto.type === 0 || proto.type === 'REVOKE' || proto.key?.id) {
          const targetRevokedId = proto.key?.id;
          if (targetRevokedId) {
            await supabase
              .from('tenno_whatsapp_buffer')
              .update({ is_deleted: true })
              .eq('message_id', targetRevokedId);
            continue;
          }
        }
      }

      // 4.2. Extrai texto da mensagem
      const text = extractMessageText(messageContent) || item.body || '';
      const pushName = item.pushName || (key.fromMe ? 'TENNO Equipe' : 'Contato');
      const senderId = key.participant || key.remoteJid || '';
      const isFromMe = !!key.fromMe;
      const timestamp = item.messageTimestamp ? Number(item.messageTimestamp) : Math.floor(Date.now() / 1000);

      // Nome do grupo se disponível
      const groupName = item.groupInfo?.name || item.chat?.name || null;

      // 4.3. Salva no buffer tenno_whatsapp_buffer com UPSERT
      // NÃO ignoramos fromMe, pois a IA precisa das respostas do Guilherme/Caio para saber se a demanda foi sanada!
      await supabase
        .from('tenno_whatsapp_buffer')
        .upsert(
          {
            message_id: messageId,
            remote_jid: remoteJid,
            group_name: groupName,
            sender_name: pushName,
            sender_id: senderId,
            is_from_me: isFromMe,
            message_text: text,
            message_timestamp: timestamp,
            is_edited: false,
            is_deleted: false,
            processed: false
          },
          { onConflict: 'message_id' }
        );
    }

    return res.status(200).json({
      success: true,
      event: rawEvent || 'messages.upsert',
      buffered_messages: messages.length,
      message: 'Mensagens adicionadas ao buffer para triagem periódica de IA.'
    });

  } catch (error: any) {
    console.error('Erro no webhook-evolution:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
