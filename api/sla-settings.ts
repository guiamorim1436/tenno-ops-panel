import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dwqmlzcwfpmjywhliket.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cW1semN3ZnBtanl3aGxpa2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDYxNzIyOCwiZXhwIjoyMDcwMTkzMjI4fQ.BlGV75Ns9joxay1j3cve2NbJaOr3_-k_YeKtcrf6ir4';

const DEFAULT_SLA = {
  id: 'default',
  urgent_hours: 4,
  normal_hours: 24,
  low_hours: 72,
  work_start_hour: 9,
  work_end_hour: 18,
  work_days: '1,2,3,4,5',
  max_urgent_per_day: 2,
  max_normal_per_day: 4,
  max_low_per_day: 6
};

function parseWorkDaysAndLimits(rawWorkDays?: string) {
  if (!rawWorkDays) {
    return {
      work_days: '1,2,3,4,5',
      max_urgent_per_day: 2,
      max_normal_per_day: 4,
      max_low_per_day: 6
    };
  }

  const [daysPart, limitsPart] = rawWorkDays.split('|limits:');
  let max_urgent = 2;
  let max_normal = 4;
  let max_low = 6;

  if (limitsPart) {
    const numbers = limitsPart.split(',').map(n => Number(n.trim()));
    if (!isNaN(numbers[0])) max_urgent = numbers[0];
    if (!isNaN(numbers[1])) max_normal = numbers[1];
    if (!isNaN(numbers[2])) max_low = numbers[2];
  }

  return {
    work_days: daysPart || '1,2,3,4,5',
    max_urgent_per_day: max_urgent,
    max_normal_per_day: max_normal,
    max_low_per_day: max_low
  };
}

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
        work_days,
        max_urgent_per_day,
        max_normal_per_day,
        max_low_per_day
      } = req.body || {};

      const cleanDays = (work_days || '1,2,3,4,5').split('|')[0];
      const urgentLim = Number(max_urgent_per_day) || 2;
      const normalLim = Number(max_normal_per_day) || 4;
      const lowLim = Number(max_low_per_day) || 6;

      const serializedWorkDays = `${cleanDays}|limits:${urgentLim},${normalLim},${lowLim}`;

      const payload = {
        id: 'default',
        urgent_hours: Number(urgent_hours) || 4,
        normal_hours: Number(normal_hours) || 24,
        low_hours: Number(low_hours) || 72,
        work_start_hour: Number(work_start_hour) || 9,
        work_end_hour: Number(work_end_hour) || 18,
        work_days: serializedWorkDays,
        updated_at: new Date().toISOString()
      };

      const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/tenno_sla_settings?on_conflict=id`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(payload)
      });

      if (!supaRes.ok) {
        const errText = await supaRes.text();
        console.error('Erro ao atualizar SLA:', supaRes.status, errText);
        return res.status(500).json({ error: errText });
      }

      const data = await supaRes.json();
      const row = Array.isArray(data) ? data[0] : data;
      const parsed = parseWorkDaysAndLimits(row?.work_days);

      return res.status(200).json({
        success: true,
        settings: {
          ...row,
          ...parsed
        }
      });
    }

    // GET
    const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/tenno_sla_settings?id=eq.default&select=*`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!supaRes.ok) {
      return res.status(200).json({ success: true, settings: DEFAULT_SLA });
    }

    const data = await supaRes.json();
    if (Array.isArray(data) && data.length > 0) {
      const row = data[0];
      const parsed = parseWorkDaysAndLimits(row?.work_days);
      return res.status(200).json({
        success: true,
        settings: {
          ...row,
          ...parsed
        }
      });
    }

    return res.status(200).json({ success: true, settings: DEFAULT_SLA });

  } catch (error: any) {
    console.error('Erro em sla-settings:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
