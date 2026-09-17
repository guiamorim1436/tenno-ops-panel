export interface CalendarBusyEvent {
  summary: string;
  start: string; // ISO
  end: string;   // ISO
  durationMinutes?: number;
}

export interface ScheduleOptions {
  startDate?: Date;
  durationHours?: number; // padrão: 1h por demanda
  queueHours?: number;    // horas acumuladas de demandas anteriores na fila
  calendarEvents?: CalendarBusyEvent[];
  startHour?: number;     // ex: 9
  endHour?: number;       // ex: 18
  workDays?: number[];    // ex: [1,2,3,4,5]
}

export interface ScheduleResult {
  deadlineDate: Date;
  deadlineIso: string;
  formatted: string;
  collidedEvents: string[]; // nomes das reuniões evitadas
  totalAllocatedHours: number;
}

/**
 * Calcula a data e hora de entrega de uma demanda respeitando:
 * 1. O expediente comercial útil (ex: 09h às 18h de seg a sex)
 * 2. Cada demanda consome blocos de 1h do dia
 * 3. Eventos e reuniões da Google Agenda (iCal) - pula intervalos ocupados
 */
export function calculateCalendarAwareDeadline(options: ScheduleOptions): ScheduleResult {
  const {
    startDate = new Date(),
    durationHours = 1,
    queueHours = 0,
    calendarEvents = [],
    startHour = 9,
    endHour = 18,
    workDays = [1, 2, 3, 4, 5]
  } = options;

  const totalNeededHours = Math.max(1, durationHours + queueHours);
  let cursor = new Date(startDate.getTime());

  // Converte eventos do calendário para objetos Date para comparações rápidas
  const parsedEvents = calendarEvents
    .map(e => ({
      summary: e.summary,
      start: new Date(e.start),
      end: new Date(e.end)
    }))
    .filter(e => !isNaN(e.start.getTime()) && !isNaN(e.end.getTime()))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const collidedSet = new Set<string>();
  let remainingHours = totalNeededHours;

  // Função auxiliar para ajustar cursor para o próximo horário de expediente válido
  function adjustToBusinessHours(d: Date): Date {
    const res = new Date(d.getTime());
    while (true) {
      const day = res.getDay();
      if (!workDays.includes(day)) {
        // Pula para o dia seguinte às startHour
        res.setDate(res.getDate() + 1);
        res.setHours(startHour, 0, 0, 0);
        continue;
      }

      const h = res.getHours() + res.getMinutes() / 60;
      if (h < startHour) {
        res.setHours(startHour, 0, 0, 0);
        continue;
      }
      if (h >= endHour) {
        res.setDate(res.getDate() + 1);
        res.setHours(startHour, 0, 0, 0);
        continue;
      }
      break;
    }
    return res;
  }

  cursor = adjustToBusinessHours(cursor);

  // Aloca em blocos de até 1 hora
  while (remainingHours > 0) {
    cursor = adjustToBusinessHours(cursor);

    // Verifica se o cursor colide com algum evento da Google Agenda
    const curTime = cursor.getTime();
    const collidingEvent = parsedEvents.find(e => {
      return curTime >= e.start.getTime() && curTime < e.end.getTime();
    });

    if (collidingEvent) {
      collidedSet.add(collidingEvent.summary);
      // Pula o cursor para o final do evento ocupado
      cursor = new Date(collidingEvent.end.getTime());
      cursor = adjustToBusinessHours(cursor);
      continue;
    }

    // Calcula quanto tempo livre temos hoje até o fim do expediente
    const curH = cursor.getHours() + cursor.getMinutes() / 60;
    const hoursLeftToday = endHour - curH;

    // Também verifica se há algum evento agendado antes do fim do expediente de hoje
    const nextEventToday = parsedEvents.find(e => {
      return e.start.getTime() > curTime && e.start.getTime() < cursor.getTime() + hoursLeftToday * 3600 * 1000;
    });

    let maxAvailableSpan = hoursLeftToday;
    if (nextEventToday) {
      const hoursUntilNextEvent = (nextEventToday.start.getTime() - curTime) / (3600 * 1000);
      maxAvailableSpan = Math.min(hoursLeftToday, hoursUntilNextEvent);
    }

    // Se o espaço livre até a próxima colisão for menor que 10 minutos, pula para o fim desse evento
    if (maxAvailableSpan < 0.16) {
      if (nextEventToday) {
        collidedSet.add(nextEventToday.summary);
        cursor = new Date(nextEventToday.end.getTime());
      } else {
        cursor.setDate(cursor.getDate() + 1);
        cursor.setHours(startHour, 0, 0, 0);
      }
      continue;
    }

    // Aloca a porção necessária ou o máximo disponível
    const hoursToConsume = Math.min(remainingHours, maxAvailableSpan);
    cursor.setTime(cursor.getTime() + hoursToConsume * 3600 * 1000);
    remainingHours -= hoursToConsume;

    // Se atingiu o final do expediente ou evento, ajusta
    if (cursor.getHours() >= endHour) {
      cursor = adjustToBusinessHours(cursor);
    }
  }

  return {
    deadlineDate: cursor,
    deadlineIso: cursor.toISOString(),
    formatted: cursor.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }),
    collidedEvents: Array.from(collidedSet),
    totalAllocatedHours: totalNeededHours
  };
}
