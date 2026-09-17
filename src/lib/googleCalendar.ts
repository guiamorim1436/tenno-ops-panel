/**
 * Gera URL para adicionar evento diretamente na Google Agenda com 1 clique.
 */
export function createGoogleCalendarUrl(options: {
  title: string;
  description?: string;
  clientName?: string;
  ticketCode?: number | string;
  startDate?: Date | string;
  durationHours?: number;
}): string {
  const {
    title,
    description = '',
    clientName = 'Cliente Geral',
    ticketCode = '',
    startDate = new Date(),
    durationHours = 1
  } = options;

  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const validStart = isNaN(start.getTime()) ? new Date() : start;
  const end = new Date(validStart.getTime() + durationHours * 60 * 60 * 1000);

  const formatUtcForGoogle = (d: Date): string => {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const datesParam = `${formatUtcForGoogle(validStart)}/${formatUtcForGoogle(end)}`;
  const textParam = encodeURIComponent(`TENNO #${ticketCode}: ${title}`);
  const detailsParam = encodeURIComponent(
    `Cliente: ${clientName}\nProtocolo: #${ticketCode}\n\n${description}`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${textParam}&dates=${datesParam}&details=${detailsParam}`;
}
