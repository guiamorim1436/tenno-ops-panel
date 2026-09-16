import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Credenciais Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dwqmlzcwfpmjywhliket.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cW1semN3ZnBtanl3aGxpa2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDYxNzIyOCwiZXhwIjoyMDcwMTkzMjI4fQ.BlGV75Ns9joxay1j3cve2NbJaOr3_-k_YeKtcrf6ir4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Credenciais Evolution API
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evolution-evolution-api.okgklo.easypanel.host';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11';
const EVOLUTION_API_INSTANCE = process.env.EVOLUTION_API_INSTANCE || 'Guilherme';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // POST: Salvar ou atualizar mapeamento de grupo para cliente
    if (req.method === 'POST') {
      const { remote_jid, group_name, client_name } = req.body || {};
      if (!remote_jid || !client_name) {
        return res.status(400).json({ error: 'remote_jid e client_name são obrigatórios' });
      }

      const { data, error } = await supabase
        .from('tenno_group_mappings')
        .upsert(
          {
            remote_jid,
            group_name: group_name || null,
            client_name: client_name.trim(),
            updated_at: new Date().toISOString()
          },
          { onConflict: 'remote_jid' }
        )
        .select()
        .single();

      if (error) {
        console.error('Erro ao salvar mapeamento:', error);
        return res.status(500).json({ error: error.message });
      }

      // Atualiza também os tickets em aberto associados a esse grupo com o novo client_name
      await supabase
        .from('tenno_tickets')
        .update({ client_name: client_name.trim() })
        .eq('origin_whatsapp_group_id', remote_jid);

      return res.status(200).json({ success: true, mapping: data });
    }

    // 1. Busca mapeamentos já gravados no banco Supabase
    const { data: mappings } = await supabase
      .from('tenno_group_mappings')
      .select('*')
      .order('group_name', { ascending: true });

    const mappingsMap = new Map<string, { client_name: string; group_name: string }>();
    mappings?.forEach(m => mappingsMap.set(m.remote_jid, { client_name: m.client_name, group_name: m.group_name }));

    // 2. Tenta buscar chats atualizados na Evolution API (rápido via findChats)
    let evoGroupsMap = new Map<string, string>();
    try {
      const evoUrl = `${EVOLUTION_API_URL.replace(/\/$/, '')}/chat/findChats/${EVOLUTION_API_INSTANCE}`;
      const evoRes = await fetch(evoUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(5000)
      });

      if (evoRes.ok) {
        const chats = await evoRes.json();
        if (Array.isArray(chats)) {
          chats
            .filter((c: any) => (c.remoteJid || c.id || '').endsWith('@g.us'))
            .forEach((c: any) => {
              const jid = c.remoteJid || c.id;
              const name = c.pushName || c.name || 'Grupo sem nome';
              evoGroupsMap.set(jid, name);
            });
        }
      }
    } catch (evoErr) {
      console.warn('Evolution API indisponível ou lenta, usando dados do Supabase:', evoErr);
    }

    // 3. Mescla os grupos do Supabase com os grupos detectados na Evolution API
    const allJids = new Set<string>([
      ...Array.from(mappingsMap.keys()),
      ...Array.from(evoGroupsMap.keys())
    ]);

    const formattedGroups = Array.from(allJids).map(jid => {
      const saved = mappingsMap.get(jid);
      const evoName = evoGroupsMap.get(jid);
      const groupName = evoName || saved?.group_name || jid;
      const clientName = saved?.client_name || '';

      return {
        remote_jid: jid,
        group_name: groupName,
        client_name: clientName,
        is_mapped: !!clientName.trim()
      };
    }).sort((a, b) => a.group_name.localeCompare(b.group_name));

    return res.status(200).json({
      success: true,
      instance: EVOLUTION_API_INSTANCE,
      total_groups: formattedGroups.length,
      mapped_groups: formattedGroups.filter(g => g.is_mapped).length,
      groups: formattedGroups
    });

  } catch (error: any) {
    console.error('Erro em evolution-groups:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
