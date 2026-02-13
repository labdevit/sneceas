// User roles
export type UserRole = 'admin' | 'pole_manager' | 'head' | 'assistant' | 'delegate' | 'member';

// User interface
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyId: string;
  role: UserRole;
  createdAt: Date;
}

// Company
export interface Company {
  id: string;
  name: string;
  code: string;
}

// Pole (department)
export interface Pole {
  id: string;
  name: string;
  description?: string;
}

// Pole member
export interface PoleMember {
  id: string;
  poleId: string;
  userId: string;
  role: 'head' | 'assistant' | 'member';
}

// Delegate
export interface Delegate {
  id: string;
  userId: string;
  user: User;
  companyId: string;
  company: Company;
  phone: string;
  email: string;
  isActive: boolean;
}

// Ticket urgency levels
export type TicketUrgency = 'low' | 'medium' | 'high' | 'critical';

// Ticket status
export type TicketStatus = 
  | 'new' 
  | 'info_needed' 
  | 'processing' 
  | 'hr_escalated' 
  | 'hr_pending' 
  | 'resolved' 
  | 'closed';

// Ticket types
export type TicketType = 
  | 'working_conditions_remuneration'
  | 'training_career'
  | 'social_mediation'
  | 'health_safety_wellbeing'
  | 'legal_compliance'
  | 'communication_awareness'
  | 'innovation_digital_transformation'
  | 'external_relations_partnerships'
  | 'youth_new_employees'
  | 'sport_wellbeing'
  | 'other';

// Ticket
export interface Ticket {
  id: string;
  reference: string;
  type: TicketType;
  urgency: TicketUrgency;
  status: TicketStatus;
  subject: string;
  description: string;
  userId: string;
  user: User;
  companyId: string;
  company: Company;
  poleId?: string;
  pole?: Pole;
  delegateId?: string;
  delegate?: Delegate;
  attachments: Attachment[];
  messages: TicketMessage[];
  hrInteractions: HRInteraction[];
  createdAt: Date;
  updatedAt: Date;
}

// Attachment
export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
}

// Ticket message
export interface TicketMessage {
  id: string;
  ticketId: string;
  userId: string;
  user: User;
  content: string;
  isInternal: boolean;
  createdAt: Date;
}

// HR Interaction
export interface HRInteraction {
  id: string;
  ticketId: string;
  userId: string;
  user: User;
  contactName: string;
  contactRole: string;
  notes: string;
  createdAt: Date;
}

// Communication post
export interface CommunicationPost {
  id: string;
  title: string;
  content: string;
  visibility: 'global' | 'company' | 'pole';
  targetId?: string;
  authorId: string;
  author: User;
  attachments: Attachment[];
  createdAt: Date;
}

// Document
export interface Document {
  id: string;
  name: string;
  description?: string;
  poleId?: string;
  pole?: Pole;
  year: number;
  category: string;
  url: string;
  version: number;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Template
export interface Template {
  id: string;
  name: string;
  type: 'convocation' | 'pv' | 'compte_rendu' | 'lettre';
  content: string;
  poleId?: string;
  pole?: Pole;
  isGlobal: boolean;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Notification
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'ticket_update' | 'new_message' | 'info_request' | 'general';
  ticketId?: string;
  isRead: boolean;
  createdAt: Date;
}

// Dashboard stats
export interface DashboardStats {
  ticketsInProgress: number;
  ticketsClosed: number;
  ticketsByUrgency: Record<TicketUrgency, number>;
  ticketsByStatus: Record<TicketStatus, number>;
  ticketsByCompany: Array<{ company: string; count: number }>;
  recentTickets: Ticket[];
  overdueTickets: Ticket[];
}
