import type { VercelRequest, VercelResponse } from '@vercel/node';

// URLs iCal padrão
const DEFAULT_ICAL_GUILHERME = 
  'https://calendar.google.com/calendar/ical/guilherme.amorimcrm%40gmail.com/private-9ae6d607f38a10d5f7eaa414afc48a8a/basic.ics';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dwqmlzcwfpmjywhliket.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cW1semN3ZnBtanl3aGxpa2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDYxNzIyOCwiZXhwIjoyMDcwMTkzMjI4fQ.BlGV75Ns9joxay1j3cve2NbJaOr3_-k_YeKtcrf6ir4';

interface CalendarEvent {
  summary: string;
  start: string; // ISO
  end: string;   // ISO
  durationMinutes: number;
}

function parseICalDate(dStr: string): Date | null {
  if (!dStr) return null;
  const raw = dStr.trim();

  // Exemplo: 20260723T123000Z ou TZID=America/Sao_Paulo:20260723T093000
  const isUtc = raw.endsWith('Z');
  const cleanDigits = raw.replace(/[^0-9]/g, '');
  if (cleanDigits.length < 8) return null;

  const y = parseInt(cleanDigits.substring(0, 4), 10);
  const m = parseInt(cleanDigits.substring(4, 6), 10) - 1;
  const d = parseInt(cleanDigits.substring(6, 8), 10);

  let h = 0;
  let min = 0;
  let s = 0;

  if (cleanDigits.length >= 14) {
    h = parseInt(cleanDigits.substring(8, 10), 10);
    min = parseInt(cleanDigits.substring(10, 12), 10);
    s = parseInt(cleanDigits.substring(12, 14), 10);
  }

  if (isUtc) {
    return new Date(Date.UTC(y, m, d, h, min, s));
  }

  // Se tem fuso America/Sao_Paulo explícito ou sem Z, trata como local no fuso brasileiro (UTC-3)
  if (raw.includes('America/Sao_Paulo') || !isUtc) {
    // Horário local de São Paulo -> converte adicionando 3 horas para UTC
    return new Date(Date.UTC(y, m, d, h + 3, min, s));
  }

  return new Date(Date.UTC(y, m, d, h, min, s));
}

function parseICal(text: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const lines = text.replace(/\r\n /g, '').split(/\r?\n/);

  let inEvent = false;
  let summary = '';
  let dtstartStr = '';
  let dtendStr = '';

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true;
      summary = 'Compromisso / Reunião';
      dtstartStr = '';
      dtendStr = '';
    } else if (line.startsWith('END:VEVENT')) {
      if (inEvent && dtstartStr) {
        const start = parseICalDate(dtstartStr);
        let end = parseICalDate(dtendStr);

        // Se não tiver dtend, assume 1 hora de duração
        if (start) {
          if (!end || end.getTime() <= start.getTime()) {
            end = new Date(start.getTime() + 60 * 60 * 1000);
          }
          events.push({
            summary: summary || 'Reunião / Evento Google Agenda',
            start: start.toISOString(),
            end: end.toISOString(),
            durationMinutes: Math.round((end.getTime() - start.getTime()) / (60 * 1000))
          });
        }
      }
      inEvent = false;
    } else if (inEvent) {
      if (line.startsWith('SUMMARY:')) {
        summary = line.substring(8).trim();
      } else if (line.startsWith('DTSTART')) {
        dtstartStr = line.substring(line.indexOf(':') + 1);
      } else if (line.startsWith('DTEND')) {
        dtendStr = line.substring(line.indexOf(':') + 1);
      }
    }
  }

  return events;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const memberId = (req.query.memberId as string) || '1';
    let targetIcalUrl = (req.query.icalUrl as string) || '';

    // Se não veio URL na query, tenta pegar do banco de SLA ou usa o padrão
    if (!targetIcalUrl) {
      try {
        const slaRes = await fetch(`${SUPABASE_URL}/rest/v1/tenno_sla_settings?select=*&limit=1`, {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          }
        });
        if (slaRes.ok) {
          const slaData = await slaRes.json();
          if (Array.isArray(slaData) && slaData.length > 0) {
            // Verifica se tem ical nas configs
            if (memberId === '1') {
              targetIcalUrl = slaData[0].ical_url_guilherme || DEFAULT_ICAL_GUILHERME;
            } else if (memberId === '2') {
              targetIcalUrl = slaData[0].ical_url_caio || '';
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar do SLA:', err);
      }

      if (!targetIcalUrl && memberId === '1') {
        targetIcalUrl = DEFAULT_ICAL_GUILHERME;
      }
    }

    if (!targetIcalUrl) {
      return res.status(200).json({
        success: true,
        memberId,
        has_calendar: false,
        message: 'Nenhuma agenda iCal vinculada para este membro.',
        events: []
      });
    }

    // Faz o fetch do .ics no Google Calendar
    const icalRes = await fetch(targetIcalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TENNO-Ops-Panel/1.0'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!icalRes.ok) {
      return res.status(502).json({
        success: false,
        error: `Falha ao baixar Google Calendar (Status ${icalRes.status})`
      });
    }

    const icalText = await icalRes.text();
    const allEvents = parseICal(icalText);

    // Filtra eventos relevantes (de hoje até os próximos 14 dias)
    const now = new Date();
    // Começo do dia de hoje (00:00)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const limitFuture = new Date(now.getTime() + 14 * 24 * 3600 * 1000);

    const upcomingEvents = allEvents
      .filter(e => {
        const eventEnd = new Date(e.end);
        const eventStart = new Date(e.start);
        return eventEnd >= startOfToday && eventStart <= limitFuture;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return res.status(200).json({
      success: true,
      memberId,
      has_calendar: true,
      total_events_found: upcomingEvents.length,
      events: upcomingEvents
    });

  } catch (err: any) {
    console.error('Erro em calendar-events:', err);
    return res.status(500).json({ error: err.message || 'Falha ao processar calendário' });
  }
}
