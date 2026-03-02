import { useEffect, useState } from 'react';
import { FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentTickets } from '@/components/dashboard/RecentTickets';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { CompanyInsights } from '@/components/dashboard/CompanyInsights';
import { getEntreprises, getProfileMe, getRequetes, type EntrepriseDto, type RequeteListDto } from '@/lib/api';
import type { Company, Ticket } from '@/types';

const STATUT_CLOSED = ['resolved', 'non_resolu', 'closed'];

function requeteToTicket(r: RequeteListDto): Ticket {
  const createdAt = r.created_at ? new Date(r.created_at) : new Date(r.updated_at);
  return {
    id: String(r.id),
    reference: r.numero_reference,
    subject: r.titre,
    description: r.description ?? '',
    type: (r.type_probleme || 'other') as Ticket['type'],
    status: (r.statut || 'new') as Ticket['status'],
    urgency: (r.priorite || 'medium') as Ticket['urgency'],
    updatedAt: new Date(r.updated_at),
    createdAt,
    company: {
      id: String(r.entreprise?.id ?? ''),
      name: r.entreprise?.nom ?? '—',
      code: r.entreprise?.code ?? '',
    },
    companyId: String(r.entreprise?.id ?? ''),
  } as Ticket;
}

function entrepriseToCompany(e: EntrepriseDto): Company {
  return {
    id: String(e.id),
    name: e.nom,
    code: e.code ?? '',
  };
}

export default function Dashboard() {
  const [profile, setProfile] = useState<{ prenom?: string; nom?: string; role?: string } | null>(null);
  const [requetes, setRequetes] = useState<RequeteListDto[]>([]);
  const [entreprises, setEntreprises] = useState<EntrepriseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      getProfileMe(),
      getRequetes({ page_size: 100 }),
      getEntreprises(),
    ])
      .then(([profileData, requetesData, entreprisesData]) => {
        if (cancelled) return;
        setProfile(profileData);
        setRequetes(requetesData.results ?? []);
        setEntreprises(Array.isArray(entreprisesData) ? entreprisesData : []);
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de charger les données.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const inProgress = requetes.filter((r) => !STATUT_CLOSED.includes(r.statut)).length;
  const closed = requetes.filter((r) => STATUT_CLOSED.includes(r.statut)).length;
  const byStatus: Record<string, number> = {};
  requetes.forEach((r) => {
    byStatus[r.statut] = (byStatus[r.statut] ?? 0) + 1;
  });
  const recentTickets = [...requetes]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5)
    .map(requeteToTicket);

  const displayName = profile?.prenom || profile?.nom || '';
  const roleLabels: Record<string, string> = {
    super_admin: 'Super administrateur',
    admin: 'Administrateur',
    delegate: 'Délégué syndical',
    member: 'Adhérent',
    comptable: 'Comptable',
    pole_manager: 'Responsable de pôle',
    head: 'Responsable de pôle',
    assistant: 'Assistant de pôle',
  };
  const roleLabel = profile?.role ? roleLabels[profile.role] ?? profile.role : null;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Bonjour, {displayName || '…'} 👋
          </h1>
          {roleLabel && (
            <Badge variant="secondary" className="text-xs font-normal">
              {roleLabel}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-1">
          Bienvenue sur votre espace S.N.E.C.E.A. Voici un aperçu de vos requêtes.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
        <QuickActions />
      </section>

      {/* Stats */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Mes statistiques</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border p-6 h-24 animate-pulse bg-muted/30" />
            ))}
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
              value={requetes.length}
              icon={FileText}
              variant="primary"
            />
            <StatsCard
              title="En attente d'infos"
              value={byStatus['info_needed'] ?? 0}
              description={(byStatus['info_needed'] ?? 0) > 0 ? 'Action requise' : undefined}
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

      <CompanyInsights
        tickets={requetes.map(requeteToTicket)}
        companies={entreprises.map(entrepriseToCompany)}
      />
    </div>
  );
}
