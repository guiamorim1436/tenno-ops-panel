export type MemberRole = 'lider_tecnico' | 'assistente_operacional';

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
  updated_at?: string;
}
