import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dwqmlzcwfpmjywhliket.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cW1semN3ZnBtanl3aGxpa2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDYxNzIyOCwiZXhwIjoyMDcwMTkzMjI4fQ.BlGV75Ns9joxay1j3cve2NbJaOr3_-k_YeKtcrf6ir4';

const GUILHERME_UUID = '59330c17-687d-4bd3-9c7c-0642cb71bf83';
const CAIO_UUID = 'e6e19d3e-9365-40f1-b150-8cfa03db0bf1';

function formatICalDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const memberParam = (req.query.member || 'guilherme').toString().toLowerCase();
    const isGui = memberParam.includes('guilherme') || memberParam === '1' || memberParam === GUILHERME_UUID;
    const targetUuid = isGui ? GUILHERME_UUID : CAIO_UUID;
    const memberName = isGui ? 'Guilherme Amorim' : 'Caio Dan';

    // Busca tarefas aprovadas e ativas deste membro
    const supaRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tenno_tickets?assignee_id=eq.${targetUuid}&status=in.(in_queue,in_progress,paused)&order=created_at.asc`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    const tickets = supaRes.ok ? await supaRes.json() : [];

    const now = new Date();
    const calendarLines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TENNO Ops//Tarefas Operacionais//PT',
      `X-WR-CALNAME:TENNO - Tarefas ${memberName}`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    tickets.forEach((t: any, index: number) => {
      // Se tem sla_deadline, define 1h antes do deadline como início
      let startDate: Date;
      let endDate: Date;

      if (t.sla_deadline) {
        endDate = new Date(t.sla_deadline);
        startDate = new Date(endDate.getTime() - 60 * 60 * 1000);
      } else {
        // Aloca 1h sequencial a partir de agora
        startDate = new Date(now.getTime() + index * 60 * 60 * 1000);
        endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      }

      const cleanSummary = (t.title || 'Demanda TENNO').replace(/[\r\n]+/g, ' ').slice(0, 70);
      const cleanDesc = `Cliente: ${t.client_name || 'Geral'}\\nProtocolo: #${t.ticket_code}\\nPrioridade: ${t.priority || 'normal'}\\nStatus: ${t.status}\\n\\n${(t.description || '').replace(/[\r\n]+/g, '\\n').slice(0, 300)}`;

      calendarLines.push('BEGIN:VEVENT');
      calendarLines.push(`UID:tenno-ticket-${t.id}@tenno-ops-panel`);
      calendarLines.push(`DTSTAMP:${formatICalDate(now)}`);
      calendarLines.push(`DTSTART:${formatICalDate(startDate)}`);
      calendarLines.push(`DTEND:${formatICalDate(endDate)}`);
      calendarLines.push(`SUMMARY:TENNO #${t.ticket_code}: ${cleanSummary}`);
      calendarLines.push(`DESCRIPTION:${cleanDesc}`);
      calendarLines.push('STATUS:CONFIRMED');
      calendarLines.push('END:VEVENT');
    });

    calendarLines.push('END:VCALENDAR');

    const icsContent = calendarLines.join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="tenno-tarefas-${memberParam}.ics"`);
    return res.status(200).send(icsContent);
  } catch (error: any) {
    console.error('Erro ao gerar feed iCal:', error);
    return res.status(500).json({ error: error.message });
  }
}
