import type { Activity } from '@/components/tickets/ActivityTracker';

export interface TicketActivity extends Activity {
  ticketId: string;
  ticketReference: string;
  ticketSubject: string;
}

// Mock data: All activities across all tickets
export const allActivities: TicketActivity[] = [
  {
    id: '1',
    ticketId: '1',
    ticketReference: 'REQ-2026-0001',
    ticketSubject: 'Prime de transport non versée',
    type: 'call',
    title: 'Appel avec les RH',
    description: 'Premier contact avec le service RH pour discuter du dossier',
    scheduledDate: new Date('2026-01-27T10:00:00'),
    completedDate: new Date('2026-01-27T10:30:00'),
    status: 'completed',
    comment: 'RH a confirmé la réception du dossier. En attente de réponse sous 48h.',
    createdBy: 'Fatou Sow',
    createdAt: new Date('2026-01-26'),
  },
  {
    id: '2',
    ticketId: '4',
    ticketReference: 'REQ-2026-0004',
    ticketSubject: 'Menace de licenciement abusif',
    type: 'meeting',
    title: 'Réunion tripartite',
    description: 'Réunion avec l\'employé, le délégué et les RH',
    scheduledDate: new Date('2026-02-03T14:00:00'),
    status: 'planned',
    createdBy: 'Fatou Sow',
    createdAt: new Date('2026-01-27'),
  },
  {
    id: '3',
    ticketId: '3',
    ticketReference: 'REQ-2026-0003',
    ticketSubject: 'Demande de formation certifiante',
    type: 'document',
    title: 'Récupérer devis formation',
    description: 'Demander le devis à l\'organisme de formation',
    scheduledDate: new Date('2026-01-30T09:00:00'),
    status: 'planned',
    createdBy: 'Fatou Sow',
    createdAt: new Date('2026-01-28'),
  },
  {
    id: '4',
    ticketId: '4',
    ticketReference: 'REQ-2026-0004',
    ticketSubject: 'Menace de licenciement abusif',
    type: 'call',
    title: 'Relance DRH',
    description: 'Appeler le DRH pour confirmer la date de réunion',
    scheduledDate: new Date('2026-01-31T11:00:00'),
    status: 'planned',
    createdBy: 'Fatou Sow',
    createdAt: new Date('2026-01-28'),
  },
  {
    id: '5',
    ticketId: '1',
    ticketReference: 'REQ-2026-0001',
    ticketSubject: 'Prime de transport non versée',
    type: 'note',
    title: 'Point de suivi hebdomadaire',
    description: 'Vérifier l\'avancement du dossier',
    scheduledDate: new Date('2026-02-05T10:00:00'),
    status: 'planned',
    createdBy: 'Fatou Sow',
    createdAt: new Date('2026-01-28'),
  },
  {
    id: '6',
    ticketId: '2',
    ticketReference: 'REQ-2026-0002',
    ticketSubject: 'Contestation avertissement injustifié',
    type: 'meeting',
    title: 'Audience disciplinaire',
    description: 'Représenter l\'adhérent lors de l\'audience',
    scheduledDate: new Date('2026-02-10T09:00:00'),
    status: 'planned',
    createdBy: 'Ibrahima Ndiaye',
    createdAt: new Date('2026-01-29'),
  },
];

export function getActivitiesByMonth(year: number, month: number): TicketActivity[] {
  return allActivities.filter((activity) => {
    const date = new Date(activity.scheduledDate);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

export function getActivitiesByDate(date: Date): TicketActivity[] {
  return allActivities.filter((activity) => {
    const activityDate = new Date(activity.scheduledDate);
    return (
      activityDate.getFullYear() === date.getFullYear() &&
      activityDate.getMonth() === date.getMonth() &&
      activityDate.getDate() === date.getDate()
    );
  });
}

export function getUpcomingActivities(limit?: number): TicketActivity[] {
  const now = new Date();
  const upcoming = allActivities
    .filter((activity) => activity.status === 'planned' && new Date(activity.scheduledDate) >= now)
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  
  return limit ? upcoming.slice(0, limit) : upcoming;
}
