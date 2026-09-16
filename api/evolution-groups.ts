import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Credenciais Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dwqmlzcwfpmjywhliket.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY || 
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

    // GET: Buscar grupos na Evolution API e cruzar com mapeamentos existentes
    const evoUrl = `${EVOLUTION_API_URL.replace(/\/$/, '')}/group/fetchAllGroups/${EVOLUTION_API_INSTANCE}?getParticipants=false`;

    let evoGroups: any[] = [];
    try {
      const evoRes = await fetch(evoUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        signal: AbortSignal.timeout(8000)
      });

      if (evoRes.ok) {
        const evoData = await evoRes.json();
        evoGroups = Array.isArray(evoData) ? evoData : (evoData.groups || evoData.data || []);
      } else {
        console.warn('Evolution API retornou status não-200:', evoRes.status, await evoRes.text());
      }
    } catch (evoErr) {
      console.warn('Falha na requisição para Evolution API:', evoErr);
    }

    // Busca mapeamentos já gravados no banco
    const { data: mappings } = await supabase
      .from('tenno_group_mappings')
      .select('*');

    const mappingsMap = new Map<string, string>();
    mappings?.forEach(m => mappingsMap.set(m.remote_jid, m.client_name));

    // Formata os grupos
    const formattedGroups = evoGroups.map((g: any) => {
      const jid = g.id || g.jid || '';
      const subject = g.subject || g.name || 'Grupo Sem Nome';
      return {
        remote_jid: jid,
        group_name: subject,
        client_name: mappingsMap.get(jid) || '',
        creation: g.creation || null,
        size: g.size || g.participants?.length || 0,
        is_mapped: mappingsMap.has(jid)
      };
    });

    // Se a Evolution API estiver offline ou vazia, inclui pelo menos os grupos já mapeados
    if (formattedGroups.length === 0 && mappings && mappings.length > 0) {
      mappings.forEach(m => {
        formattedGroups.push({
          remote_jid: m.remote_jid,
          group_name: m.group_name || m.remote_jid,
          client_name: m.client_name,
          creation: null,
          size: 0,
          is_mapped: true
        });
      });
    }

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
