import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatsCard } from '@/components/dashboard/StatsCard';
import {
  companies as mockCompanies,
  statusLabels,
  ticketTypeLabels,
  tickets as mockTickets,
  urgencyLabels,
} from '@/lib/mock-data';
import type { Company, Ticket, TicketType } from '@/types';

type PeriodFilter = 'all' | 'month' | 'quarter';

export interface CompanyInsightsProps {
  /** Requêtes mappées en tickets (données API). Si fourni, utilisé à la place du mock. */
  tickets?: Ticket[];
  /** Liste des entreprises (données API). Si fourni, utilisé à la place du mock. */
  companies?: Company[];
}

const periodLabels: Record<PeriodFilter, string> = {
  all: 'Toutes périodes',
  month: 'Ce mois-ci',
  quarter: 'Ce trimestre',
};

const isDismissalSignal = (subject: string, description: string) => {
  const haystack = `${subject} ${description}`.toLowerCase();
  return haystack.includes('licenciement');
};

export function CompanyInsights({ tickets: apiTickets, companies: apiCompanies }: CompanyInsightsProps = {}) {
  const tickets = apiTickets ?? mockTickets;
  const companies = apiCompanies ?? mockCompanies;

  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TicketType | 'all'>('all');
  const [heatmapDetail, setHeatmapDetail] = useState<{
    companyId: string;
    type: TicketType;
  } | null>(null);

  const filteredTickets = useMemo(() => {
    if (period === 'all') {
      return tickets;
    }

    const now = new Date();
    const start = new Date(now);

    if (period === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'quarter') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      start.setMonth(quarterStartMonth, 1);
      start.setHours(0, 0, 0, 0);
    }

    return tickets.filter((ticket) => ticket.createdAt >= start);
  }, [period, tickets]);

  const scopedTickets = useMemo(() => {
    if (typeFilter === 'all') {
      return filteredTickets;
    }
    return filteredTickets.filter((ticket) => ticket.type === typeFilter);
  }, [filteredTickets, typeFilter]);

  const companyStats = useMemo(() => {
    return companies.map((company) => {
      const companyTickets = scopedTickets.filter(
        (ticket) => ticket.companyId === company.id
      );
      const dismissalCount = companyTickets.filter((ticket) =>
        isDismissalSignal(ticket.subject, ticket.description)
      ).length;

      return {
        id: company.id,
        company: company.name,
        total: companyTickets.length,
        critical: companyTickets.filter((ticket) => ticket.urgency === 'critical').length,
        dismissal: dismissalCount,
      };
    });
  }, [scopedTickets]);

  const top5Companies = [...companyStats]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const ticketTypes = Object.entries(ticketTypeLabels);
  const heatmapData = companies.map((company) => {
    const companyTickets = scopedTickets.filter((ticket) => ticket.companyId === company.id);
    const counts = ticketTypes.reduce<Record<string, number>>((acc, [typeKey]) => {
      acc[typeKey] = companyTickets.filter((ticket) => ticket.type === typeKey).length;
      return acc;
    }, {});

    return {
      company: company.name,
      counts,
    };
  });
  const maxHeatmapValue = Math.max(
    0,
    ...heatmapData.flatMap((row) => Object.values(row.counts))
  );

  const selectedCompany = heatmapDetail
    ? companies.find((company) => company.id === heatmapDetail.companyId)
    : undefined;
  const detailTickets = useMemo(() => {
    if (!heatmapDetail) {
      return [];
    }
    return scopedTickets.filter(
      (ticket) =>
        ticket.companyId === heatmapDetail.companyId &&
        ticket.type === heatmapDetail.type
    );
  }, [heatmapDetail, scopedTickets]);

  const handleExportCsv = () => {
    if (scopedTickets.length === 0) {
      return;
    }

    const header = [
      'reference',
      'entreprise',
      'type',
      'urgence',
      'statut',
      'sujet',
      'date_creation',
    ];
    const rows = scopedTickets.map((ticket) => [
      ticket.reference,
      ticket.company?.name ?? '',
      ticketTypeLabels[ticket.type] ?? ticket.type,
      urgencyLabels[ticket.urgency] ?? ticket.urgency,
      statusLabels[ticket.status] ?? ticket.status,
      ticket.subject.replace(/"/g, '""'),
      ticket.createdAt.toISOString().split('T')[0],
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `requêtes-${period}-${typeFilter}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return;
    }

    const rows = scopedTickets
      .map(
        (ticket) => `
          <tr>
            <td>${ticket.reference}</td>
            <td>${ticket.company?.name ?? ''}</td>
            <td>${ticketTypeLabels[ticket.type] ?? ticket.type}</td>
            <td>${urgencyLabels[ticket.urgency] ?? ticket.urgency}</td>
            <td>${statusLabels[ticket.status] ?? ticket.status}</td>
            <td>${ticket.subject}</td>
            <td>${ticket.createdAt.toISOString().split('T')[0]}</td>
          </tr>`
      )
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Export PDF - Requêtes</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 18px; margin-bottom: 8px; }
            p { margin: 0 0 16px; color: #555; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background: #f3f5f7; }
          </style>
        </head>
        <body>
          <h1>Requêtes — ${periodLabels[period]}</h1>
          <p>Filtre type : ${typeFilter === 'all' ? 'Tous' : ticketTypeLabels[typeFilter]}</p>
          <table>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Entreprise</th>
                <th>Type</th>
                <th>Urgence</th>
                <th>Statut</th>
                <th>Sujet</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="7">Aucune donnée</td></tr>'}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const ranked = companyStats.filter((stat) => stat.total > 0);
  const mostProblems = ranked.reduce(
    (acc, curr) => (curr.total > acc.total ? curr : acc),
    ranked[0]
  );
  const bestCompany = ranked.reduce(
    (acc, curr) => (curr.total < acc.total ? curr : acc),
    ranked[0]
  );
  const mostDismissals = ranked.reduce(
    (acc, curr) => (curr.dismissal > acc.dismissal ? curr : acc),
    ranked[0]
  );

  const totalTickets = companyStats.reduce((sum, stat) => sum + stat.total, 0);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Analyse par entreprise</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Vue d&apos;ensemble des requêtes syndicales par entreprise.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:w-56">
            <Select value={period} onValueChange={(value) => setPeriod(value as PeriodFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(periodLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-64">
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as TicketType | 'all')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type de requête" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {ticketTypes.map(([typeKey, label]) => (
                  <SelectItem key={typeKey} value={typeKey}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportPdf}
              className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent/50"
            >
              Export PDF
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent/50"
            >
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {ranked.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucune requête disponible pour l&apos;analyse.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard
              title="Entreprise la plus touchée"
              value={mostProblems?.company ?? '—'}
              description={
                mostProblems ? `${mostProblems.total} requête(s)` : 'Aucune donnée'
              }
              icon={AlertTriangle}
              variant="warning"
            />
            <StatsCard
              title="Entreprise la plus stable"
              value={bestCompany?.company ?? '—'}
              description={
                bestCompany ? `${bestCompany.total} requête(s)` : 'Aucune donnée'
              }
              icon={CheckCircle}
              variant="success"
            />
            <StatsCard
              title="Plus de licenciements signalés"
              value={mostDismissals?.company ?? '—'}
              description={
                mostDismissals
                  ? `${mostDismissals.dismissal} signalement(s)`
                  : 'Aucune donnée'
              }
              icon={ShieldAlert}
              variant="danger"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Requêtes par entreprise
                </CardTitle>
                <CardDescription>
                  Total: {totalTickets} requête(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={companyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="company" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" name="Total requêtes" fill="hsl(var(--primary))" />
                    <Bar dataKey="critical" name="Critiques" fill="hsl(var(--urgency-critical))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Licenciements signalés
                </CardTitle>
                <CardDescription>
                  Basé sur les requêtes contenant le mot &quot;licenciement&quot;.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={companyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="company" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="dismissal" name="Signalements" fill="hsl(var(--status-processing))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Top 5 entreprises
                </CardTitle>
                <CardDescription>
                  Classement selon le volume de requêtes ({periodLabels[period]}).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {top5Companies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune donnée.</p>
                ) : (
                  top5Companies.map((company, index) => (
                    <div
                      key={company.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">
                          {index + 1}. {company.company}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {company.total} requête(s)
                        </p>
                      </div>
                      <Badge variant="secondary">{company.critical} critiques</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Heatmap entreprise × type
                </CardTitle>
                <CardDescription>
                  Intensité basée sur le nombre de requêtes par type.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left py-2 pr-2">Entreprise</th>
                      {ticketTypes.map(([typeKey, label]) => (
                        <th key={typeKey} className="text-left py-2 px-2 min-w-[120px]">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapData.map((row) => (
                      <tr key={row.company} className="border-t">
                        <td className="py-2 pr-2 font-medium">{row.company}</td>
                        {ticketTypes.map(([typeKey]) => {
                          const value = row.counts[typeKey] ?? 0;
                          const intensity = maxHeatmapValue
                            ? Math.min(0.85, value / maxHeatmapValue + 0.15)
                            : 0;
                          return (
                            <td key={`${row.company}-${typeKey}`} className="py-2 px-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setHeatmapDetail({
                                    companyId: companies.find((c) => c.name === row.company)?.id ?? '',
                                    type: typeKey as TicketType,
                                  })
                                }
                                className="w-full"
                                disabled={!companies.find((c) => c.name === row.company)?.id}
                              >
                                <div
                                  className="rounded-md px-2 py-1 text-center text-[11px]"
                                  style={{
                                    backgroundColor: `hsl(var(--primary) / ${intensity})`,
                                    color: intensity > 0.5 ? 'white' : 'hsl(var(--foreground))',
                                  }}
                                >
                                  {value}
                                </div>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Dialog open={!!heatmapDetail} onOpenChange={(open) => !open && setHeatmapDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails des requêtes</DialogTitle>
            <DialogDescription>
              {selectedCompany?.name ?? 'Entreprise'} —{' '}
              {heatmapDetail ? ticketTypeLabels[heatmapDetail.type] : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[320px] overflow-auto">
            {detailTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune requête pour ce filtre.</p>
            ) : (
              detailTickets.map((ticket) => (
                <div key={ticket.id} className="rounded-lg border p-3 text-sm">
                  <div className="font-medium">{ticket.subject}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {ticket.reference} · {statusLabels[ticket.status]} ·{' '}
                    {urgencyLabels[ticket.urgency]}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
