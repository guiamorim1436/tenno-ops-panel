import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Credenciais Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dwqmlzcwfpmjywhliket.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cW1semN3ZnBtanl3aGxpa2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDYxNzIyOCwiZXhwIjoyMDcwMTkzMjI4fQ.BlGV75Ns9joxay1j3cve2NbJaOr3_-k_YeKtcrf6ir4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const DEFAULT_SLA = {
  id: 'default',
  urgent_hours: 4,
  normal_hours: 24,
  low_hours: 72,
  work_start_hour: 9,
  work_end_hour: 18,
  work_days: '1,2,3,4,5'
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST' || req.method === 'PUT') {
      const {
        urgent_hours,
        normal_hours,
        low_hours,
        work_start_hour,
        work_end_hour,
        work_days
      } = req.body || {};

      const payload = {
        id: 'default',
        urgent_hours: Number(urgent_hours) || 4,
        normal_hours: Number(normal_hours) || 24,
        low_hours: Number(low_hours) || 72,
        work_start_hour: Number(work_start_hour) || 9,
        work_end_hour: Number(work_end_hour) || 18,
        work_days: work_days || '1,2,3,4,5',
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('tenno_sla_settings')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar SLA:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true, settings: data });
    }

    // GET
    const { data, error } = await supabase
      .from('tenno_sla_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error || !data) {
      return res.status(200).json({ success: true, settings: DEFAULT_SLA });
    }

    return res.status(200).json({ success: true, settings: data });

  } catch (error: any) {
    console.error('Erro em sla-settings:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
