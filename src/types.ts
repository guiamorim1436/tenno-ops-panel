export type MemberRole = 'lider_tecnico' | 'assistente_operacional';

export const GUILHERME_UUID = '59330c17-687d-4bd3-9c7c-0642cb71bf83';
export const CAIO_UUID = 'e6e19d3e-9365-40f1-b150-8cfa03db0bf1';

export function isGuilherme(assigneeId?: string, assigneeName?: string): boolean {
  if (!assigneeId && !assigneeName) return false;
  return (
    assigneeId === GUILHERME_UUID ||
    assigneeId === '1' ||
    (assigneeName?.toLowerCase() || '').includes('guilherme')
  );
}

export function isCaio(assigneeId?: string, assigneeName?: string): boolean {
  if (!assigneeId && !assigneeName) return false;
  return (
    assigneeId === CAIO_UUID ||
    assigneeId === '2' ||
    (assigneeName?.toLowerCase() || '').includes('caio')
  );
}

export interface TeamMember {
  id: string;
  name: string;
  role: MemberRole;
  active_ticket_id?: string | null;
}

export type TicketStatus = 
  | 'pending_approval'
  | 'in_queue'
  | 'in_progress'
  | 'paused'
  | 'waiting_client'
  | 'blocked_escalated'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export type TicketPriority = 'urgente' | 'normal' | 'baixa';

export type PauseCategory = 
  | 'aguardando_cliente' 
  | 'problema_tecnico' 
  | 'aguardando_meta' 
  | 'outro';

export type NextActionBy = 'cliente' | 'guilherme' | 'caio';

export interface Ticket {
  id: string;
  ticket_code: number;
  title: string;
  description?: string;
  client_id?: string;
  client_name: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignee_id?: string;
  assignee_name?: string;
  sla_hours_target: number;
  sla_deadline?: string;
  approved_at?: string;
  is_escalated: boolean;
  escalation_reason?: string;
  escalated_at?: string;
  total_time_seconds: number;
  created_at: string;
  completed_at?: string;
  
  // WhatsApp e Mapeamento
  origin_whatsapp_group_id?: string;
  origin_whatsapp_message_id?: string;

  // Gestão de Pausa Estruturada
  pause_reason?: string;
  pause_category?: PauseCategory;
  next_action_by?: NextActionBy;
  paused_at?: string;

  // Rastreabilidade de Rejeição
  rejection_reason?: string;
  rejected_at?: string;
}

export interface ClientStats {
  client_id: string;
  client_name: string;
  parent_client?: string;
  monthly_fee: number;
  total_tickets: number;
  completed_tickets: number;
  total_hours_spent: number;
  effective_hourly_rate: number;
}

export interface GroupMapping {
  remote_jid: string;
  group_name: string;
  client_name: string;
  creation?: number | null;
  size?: number;
  is_mapped?: boolean;
}

export interface SlaSettings {
  id: string;
  urgent_hours: number;
  normal_hours: number;
  low_hours: number;
  work_start_hour: number;
  work_end_hour: number;
  work_days: string;
  // Regulador de Capacidade Diária (Tarefas Máximas por Dia Útil)
  max_urgent_per_day?: number;
  max_normal_per_day?: number;
  max_low_per_day?: number;
  // Integração Google Agenda (iCal)
  ical_url_guilherme?: string;
  ical_url_caio?: string;
  daily_report_group_jid?: string;
  updated_at?: string;
}
