import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UrgencyBadge } from '@/components/ui/UrgencyBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useTicketMeta } from '@/hooks/useTicketMeta';
import type { ApiTicket } from '@/lib/api/tickets';
import { cn } from '@/lib/utils';

interface RecentTicketsProps {
  tickets: ApiTicket[];
  showCompany?: boolean;
  className?: string;
}

export function RecentTickets({ tickets, showCompany = false, className }: RecentTicketsProps) {
  const { statusCode } = useTicketMeta();

  return (
    <div className={cn('bg-card rounded-xl border shadow-card', className)}>
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Dernières requêtes</h3>
          <p className="text-sm text-muted-foreground">Mises à jour récentes</p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/tickets" className="flex items-center gap-1">
            Voir tout
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
      <div className="divide-y divide-border">
        {tickets.map((ticket) => (
          <Link
            key={ticket.id}
            to={`/tickets/${ticket.id}`}
            className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-mono text-muted-foreground">
                  {ticket.reference}
                </span>
                {showCompany && (
                  <span className="text-sm text-muted-foreground">
                    • {ticket.company_name}
                  </span>
                )}
              </div>
              <p className="font-medium truncate">{ticket.subject}</p>
              <p className="text-sm text-muted-foreground">
                {ticket.ticket_type_label}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex flex-col items-end gap-1.5">
                <StatusBadge status={statusCode(ticket.status)} size="sm" />
                <UrgencyBadge urgency={ticket.urgency} size="sm" showIcon={false} />
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {new Date(ticket.updated_at).toLocaleDateString('fr-FR')}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
