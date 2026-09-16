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
  | 'blocked_escalated'
  | 'completed'
  | 'cancelled';

export type TicketPriority = 'urgente' | 'normal' | 'baixa';

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
