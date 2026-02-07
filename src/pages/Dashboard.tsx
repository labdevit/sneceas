import { FileText, CheckCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentTickets } from '@/components/dashboard/RecentTickets';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { CompanyInsights } from '@/components/dashboard/CompanyInsights';
import { fetchTicketsList, type ApiTicket } from '@/lib/api/tickets';
import { useTicketMeta } from '@/hooks/useTicketMeta';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/lib/acl';

export default function Dashboard() {
  const { user } = useAuth();
  const { statuses } = useTicketMeta();

  // Fetch tickets from API
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: () => fetchTicketsList(),
    staleTime: 60 * 1000,
  });

  // Codes des statuts terminaux
  const terminalCodes = new Set(statuses.filter(s => s.is_terminal).map(s => s.id));
  const inProgress = tickets.filter(t => !terminalCodes.has(t.status)).length;
  const closed = tickets.filter(t => terminalCodes.has(t.status)).length;
  const infoNeeded = tickets.filter(t => {
    const s = statuses.find(st => st.id === t.status);
    return s?.code === 'info_needed';
  }).length;
  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const displayName = user?.name || user?.username || 'Utilisateur';
  const roleName = user?.is_superuser
    ? 'Super Administrateur'
    : user?.roles?.[0]?.role_name ?? ROLE_LABELS[user?.roles?.[0]?.role_code ?? ''] ?? '';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bonjour, {displayName} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          {roleName && <span className="font-medium text-primary">{roleName}</span>}
          {roleName && ' — '}Bienvenue sur votre espace S.N.E.C.E.A.
        </p>
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
        <QuickActions />
      </section>

      {/* Stats */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Mes statistiques</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Requêtes en cours"
              value={inProgress}
              icon={Clock}
              variant="warning"
            />
            <StatsCard
              title="Requêtes clôturées"
              value={closed}
              icon={CheckCircle}
              variant="success"
            />
            <StatsCard
              title="Total requêtes"
              value={tickets.length}
              icon={FileText}
              variant="primary"
            />
            <StatsCard
              title="En attente d'infos"
              value={infoNeeded}
              description="Action requise"
              icon={AlertTriangle}
              variant="danger"
            />
          </div>
        )}
      </section>

      {/* Recent Tickets */}
      <section>
        <RecentTickets tickets={recentTickets} />
      </section>

      <CompanyInsights />
    </div>
  );
}
