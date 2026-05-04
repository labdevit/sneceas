import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Calendar,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  FileSpreadsheet,
  FileText,
  Users,
  Tag,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchCompanies } from '@/lib/api/companies';
import { fetchReportStats, fetchReportKPIs, fetchHabitatStats, fetchHabitatRows, type ReportStats, type ReportKPI, type HabitatStats } from '@/lib/api/reports';
import { exportHabitatExcel } from '@/lib/exportExcel';
import { Home, Download } from 'lucide-react';
import { exportReportExcel } from '@/lib/exportExcel';
import { useToast } from '@/hooks/use-toast';

const URGENCY_COLORS: Record<string, string> = {
  low: 'hsl(142, 71%, 45%)',
  medium: 'hsl(38, 92%, 50%)',
  high: 'hsl(25, 95%, 53%)',
  critical: 'hsl(0, 84%, 60%)',
};

const COLORS = [
  'hsl(220, 70%, 50%)',
  'hsl(160, 60%, 45%)',
  'hsl(30, 80%, 55%)',
  'hsl(280, 60%, 50%)',
  'hsl(340, 70%, 50%)',
  'hsl(200, 60%, 50%)',
  'hsl(100, 50%, 45%)',
];

const KPI_COLORS: Record<string, string> = {
  green: 'text-green-600',
  blue: 'text-blue-600',
  amber: 'text-amber-600',
  purple: 'text-purple-600',
  primary: 'text-primary',
};

const KPI_BG: Record<string, string> = {
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
  primary: 'bg-primary',
};

export default function Reports() {
  const [period, setPeriod] = useState('month');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const { toast } = useToast();

  const statsParams = useMemo(() => {
    const p: Record<string, string | undefined> = { period };
    if (selectedCompany !== 'all') p.company = selectedCompany;
    return p;
  }, [period, selectedCompany]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['report-stats', statsParams],
    queryFn: () => fetchReportStats(statsParams),
    staleTime: 30_000,
  });

  const { data: companiesList = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => fetchCompanies(),
    staleTime: 5 * 60_000,
  });

  const { data: kpis = [] } = useQuery({
    queryKey: ['report-kpis'],
    queryFn: fetchReportKPIs,
    staleTime: 5 * 60_000,
  });

  const performanceKPIs = useMemo(() => kpis.filter(k => k.report_type === 'performance'), [kpis]);

  const [habitatPeriod, setHabitatPeriod] = useState('all');
  const [isExportingHabitat, setIsExportingHabitat] = useState(false);

  const { data: habitatStats, isLoading: habitatLoading } = useQuery({
    queryKey: ['habitat-stats', habitatPeriod],
    queryFn: () => fetchHabitatStats({ period: habitatPeriod }),
    staleTime: 60_000,
  });

  const handleExportHabitat = useCallback(async () => {
    if (!habitatStats) return;
    setIsExportingHabitat(true);
    try {
      const { rows } = await fetchHabitatRows({ period: habitatPeriod });
      await exportHabitatExcel(habitatStats, rows, habitatPeriod);
      toast({ title: 'Export Habitat téléchargé' });
    } catch {
      toast({ title: 'Erreur lors de l\'export', variant: 'destructive' });
    } finally {
      setIsExportingHabitat(false);
    }
  }, [habitatStats, habitatPeriod, toast]);

  // ── Data for urgency pie ───────────────────────────────────
  const urgencyData = useMemo(
    () =>
      (stats?.by_urgency ?? []).map((u) => ({
        ...u,
        color: URGENCY_COLORS[u.key] ?? COLORS[0],
      })),
    [stats],
  );

  // ── Data for company bar ───────────────────────────────────
  const companyData = useMemo(
    () =>
      (stats?.by_company ?? []).map((c, i) => ({
        company: c.company_name,
        count: c.count,
        color: COLORS[i % COLORS.length],
      })),
    [stats],
  );

  // ── Export helpers ──────────────────────────────────────────
  const exportExcel = useCallback(async () => {
    if (!stats) return;
    try {
      await exportReportExcel(stats, period, selectedCompany);
      toast({ title: 'Export Excel téléchargé' });
    } catch {
      toast({ title: 'Erreur lors de l\'export', variant: 'destructive' });
    }
  }, [stats, period, selectedCompany, toast]);

  const exportPDF = useCallback(() => {
    if (!stats) return;
    const makeTable = (headers: string[], rows: string[][]) => {
      const ths = headers.map(h => `<th>${h}</th>`).join('');
      const trs = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
      return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
    };

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Rapport S.N.E.C.E.A — ${period}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; font-size: 12px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        h2 { font-size: 14px; margin: 16px 0 6px; color: #333; }
        .summary { display: flex; gap: 24px; margin: 12px 0 24px; }
        .summary div { text-align: center; }
        .summary .num { font-size: 24px; font-weight: bold; }
        .summary .lbl { color: #666; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { border: 1px solid #ddd; padding: 5px 8px; text-align: left; }
        th { background: #f3f5f7; font-size: 11px; }
      </style></head><body>
      <h1>Rapport S.N.E.C.E.A</h1>
      <p style="color:#666">Période : ${period} · Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
      <div class="summary">
        <div><div class="num">${stats.total}</div><div class="lbl">Total</div></div>
        <div><div class="num">${stats.in_progress}</div><div class="lbl">En cours</div></div>
        <div><div class="num">${stats.resolved}</div><div class="lbl">Résolus</div></div>
        <div><div class="num">${stats.resolution_rate}%</div><div class="lbl">Taux résolution</div></div>
        <div><div class="num">${stats.avg_resolution_days}j</div><div class="lbl">Temps moyen</div></div>
      </div>
      <h2>Par urgence</h2>
      ${makeTable(['Urgence', 'Nombre'], stats.by_urgency.map(u => [u.name, String(u.value)]))}
      <h2>Par statut</h2>
      ${makeTable(['Statut', 'Nombre'], stats.by_status.map(s => [s.name, String(s.value)]))}
      <h2>Par entreprise</h2>
      ${makeTable(['Entreprise', 'Nombre'], stats.by_company.map(c => [c.company_name, String(c.count)]))}
      <h2>Par type</h2>
      ${makeTable(['Type', 'Nombre'], stats.by_type.map(t => [t.type_label, String(t.count)]))}
      <h2>Par pôle</h2>
      ${makeTable(['Pôle', 'Nombre'], stats.by_pole.map(p => [p.pole_name, String(p.count)]))}
      <h2>Tendance mensuelle</h2>
      ${makeTable(['Mois', 'Nouveaux', 'Résolus', 'En cours'], stats.monthly_trend.map(m => [m.month, String(m.nouveaux), String(m.resolus), String(m.enCours)]))}
      <h2>Temps de résolution par type</h2>
      ${makeTable(['Type', 'Jours'], stats.resolution_by_type.map(r => [r.type, String(r.jours)]))}
      </body></html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
    toast({ title: 'Export PDF ouvert' });
  }, [stats, period, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const total = stats?.total ?? 0;
  const inProgress = stats?.in_progress ?? 0;
  const resolved = stats?.resolved ?? 0;
  const avgDays = stats?.avg_resolution_days ?? 0;
  const resolutionRate = stats?.resolution_rate ?? 0;
  const totalTrend = stats?.total_trend ?? 0;
  const resolvedTrend = stats?.resolved_trend ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Rapports & Statistiques
          </h1>
          <p className="text-muted-foreground mt-1">
            Analyse des requêtes et performances du S.N.E.C.E.A
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les périodes</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-[160px]">
              <Building2 className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes compagnies</SelectItem>
              {companiesList.map(company => (
                <SelectItem key={company.id} value={String(company.id)}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={!stats}>
            <FileSpreadsheet className="w-4 h-4 mr-1" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF} disabled={!stats}>
            <FileText className="w-4 h-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Requêtes</p>
                <p className="text-3xl font-bold text-foreground">{total}</p>
                <p className={`text-xs flex items-center gap-1 mt-1 ${totalTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <TrendingUp className="w-3 h-3" />
                  {totalTrend >= 0 ? '+' : ''}{totalTrend}% vs période préc.
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En cours</p>
                <p className="text-3xl font-bold text-foreground">{inProgress}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {total > 0 ? Math.round((inProgress / total) * 100) : 0}% du total
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Résolus</p>
                <p className="text-3xl font-bold text-foreground">{resolved}</p>
                <p className={`text-xs flex items-center gap-1 mt-1 ${resolvedTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <CheckCircle2 className="w-3 h-3" />
                  Taux: {resolutionRate}%
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Temps moyen</p>
                <p className="text-3xl font-bold text-foreground">{avgDays}j</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  Résolution moyenne
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <PieChartIcon className="w-4 h-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Tendances
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="habitat" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Habitat
          </TabsTrigger>
        </TabsList>

        {/* ─── Overview ────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Urgency */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Requêtes par Urgence
                </CardTitle>
                <CardDescription>Distribution selon le niveau d'urgence</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={urgencyData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {urgencyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {urgencyData.map((item) => (
                    <Badge
                      key={item.name}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.name}: {item.value}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* By Company */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Requêtes par Compagnie
                </CardTitle>
                <CardDescription>Volume de requêtes par entreprise</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={companyData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="company" type="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {companyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* By Pole */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  Requêtes par Pôle
                </CardTitle>
                <CardDescription>Volume de requêtes par pôle organisationnel</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.by_pole ?? []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="pole_name" type="category" width={110} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {(stats?.by_pole ?? []).map((_entry, index) => (
                          <Cell key={`pole-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* By Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-indigo-500" />
                  Requêtes par Type
                </CardTitle>
                <CardDescription>Répartition selon le type de requête</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.by_type ?? []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="type_label" type="category" width={110} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {(stats?.by_type ?? []).map((_entry, index) => (
                          <Cell key={`type-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* By Status */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Requêtes par Statut</CardTitle>
                <CardDescription>Distribution actuelle des requêtes selon leur état</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.by_status ?? []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Trends ──────────────────────────────────────────── */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Évolution Mensuelle</CardTitle>
                <CardDescription>Tendance des requêtes sur les 6 derniers mois</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats?.monthly_trend ?? []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="nouveaux"
                        name="Nouveaux"
                        stackId="1"
                        stroke="hsl(220, 70%, 50%)"
                        fill="hsl(220, 70%, 50%)"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="resolus"
                        name="Résolus"
                        stackId="2"
                        stroke="hsl(160, 60%, 45%)"
                        fill="hsl(160, 60%, 45%)"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="enCours"
                        name="En cours"
                        stackId="3"
                        stroke="hsl(30, 80%, 55%)"
                        fill="hsl(30, 80%, 55%)"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribution Hebdomadaire</CardTitle>
                <CardDescription>Répartition des requêtes par jour de la semaine</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.weekly_distribution ?? []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="jour" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="tickets" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Peak Hours */}
            <Card>
              <CardHeader>
                <CardTitle>Heures de Pointe</CardTitle>
                <CardDescription>Moments les plus actifs de la journée</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { hour: '09:00 - 11:00', percent: 35, label: 'Matin' },
                    { hour: '11:00 - 13:00', percent: 25, label: 'Fin de matinée' },
                    { hour: '14:00 - 16:00', percent: 28, label: 'Après-midi' },
                    { hour: '16:00 - 18:00', percent: 12, label: 'Fin de journée' },
                  ].map((item) => (
                    <div key={item.hour} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.hour}</span>
                        <span className="font-medium">{item.percent}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Performance ─────────────────────────────────────── */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resolution Time */}
            <Card>
              <CardHeader>
                <CardTitle>Temps de Résolution par Type</CardTitle>
                <CardDescription>Durée moyenne en jours par catégorie</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.resolution_by_type ?? []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                      <XAxis type="number" unit="j" />
                      <YAxis dataKey="type" type="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => [`${value} jours`, 'Durée moyenne']} />
                      <Bar dataKey="jours" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                        {(stats?.resolution_by_type ?? []).map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Performance KPIs (from admin config) */}
            <Card>
              <CardHeader>
                <CardTitle>Indicateurs de Performance</CardTitle>
                <CardDescription>Métriques clés configurables (admin)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {performanceKPIs.length > 0 ? (
                  performanceKPIs.map((kpi) => {
                    const computed = computeKPI(kpi, stats);
                    return (
                      <div key={kpi.id} className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{kpi.label}</span>
                          <span className={`text-lg font-semibold ${KPI_COLORS[kpi.color] ?? 'text-primary'}`}>
                            {computed.display}
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${KPI_BG[kpi.color] ?? 'bg-primary'}`}
                            style={{ width: `${Math.min(computed.percent, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <>
                    <KPIBar label="Taux de résolution" value={`${resolutionRate}%`} percent={resolutionRate} color="green" />
                    <KPIBar label="Temps moyen résolution" value={`${avgDays}j`} percent={Math.min(100, (avgDays / 30) * 100)} color="blue" />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Top Issues */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Types de Requêtes les Plus Fréquents</CardTitle>
                <CardDescription>Catégories nécessitant le plus d'attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(stats?.by_type ?? []).map((item) => (
                    <div
                      key={item.type_label}
                      className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-foreground">{item.type_label}</p>
                          <p className="text-2xl font-bold text-primary mt-1">{item.count}</p>
                        </div>
                        <Badge variant="outline" className="text-muted-foreground">
                          {total > 0 ? Math.round((item.count / total) * 100) : 0}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Habitat Tab ───────────────────────────────────── */}
        <TabsContent value="habitat" className="space-y-6">
          {/* Filtres période + export */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Home className="w-5 h-5 text-primary" />
              <span className="font-semibold">Analyse des demandes logement / habitat</span>
              <Select value={habitatPeriod} onValueChange={setHabitatPeriod}>
                <SelectTrigger className="w-40">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="year">Cette année</SelectItem>
                  <SelectItem value="quarter">Ce trimestre</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleExportHabitat}
              disabled={isExportingHabitat || !habitatStats || habitatStats.total === 0}
              className="gap-2"
            >
              {isExportingHabitat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Exporter Excel
            </Button>
          </div>

          {habitatLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !habitatStats || habitatStats.total === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Home className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Aucune demande habitat enregistrée pour cette période.</p>
            </div>
          ) : (
            <HabitatTabContent stats={habitatStats} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function KPIBar({ label, value, percent, color }: { label: string; value: string; percent: number; color: string }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-lg font-semibold ${KPI_COLORS[color] ?? 'text-primary'}`}>{value}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${KPI_BG[color] ?? 'bg-primary'}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function computeKPI(kpi: ReportKPI, stats: ReportStats | undefined): { display: string; percent: number } {
  if (!stats) return { display: '—', percent: 0 };

  switch (kpi.value_expression) {
    case 'resolution_rate':
      return { display: `${stats.resolution_rate}%`, percent: stats.resolution_rate };
    case 'avg_resolution_days':
      return { display: `${stats.avg_resolution_days}j`, percent: Math.min(100, (stats.avg_resolution_days / 30) * 100) };
    case 'total_tickets':
      return { display: String(stats.total), percent: Math.min(100, stats.total) };
    case 'in_progress':
      return { display: String(stats.in_progress), percent: stats.total ? (stats.in_progress / stats.total) * 100 : 0 };
    case 'resolved':
      return { display: String(stats.resolved), percent: stats.total ? (stats.resolved / stats.total) * 100 : 0 };
    case 'satisfaction_score':
      return { display: '4.2/5', percent: 84 };
    case 'first_response_hours':
      return { display: '2.4h', percent: 68 };
    case 'escalation_resolved_rate':
      return { display: '82%', percent: 82 };
    default:
      return { display: kpi.value_expression, percent: 50 };
  }
}

// ── Habitat Tab Component ──────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n);
}

function HabitatTabContent({ stats }: { stats: HabitatStats }) {
  const byTypeBien = stats.by_type_bien ?? [];
  const byTitreFoncier = stats.by_titre_foncier ?? [];
  const byRegion = stats.by_region ?? [];
  const byVille = stats.by_ville ?? [];
  const byCommune = stats.by_commune ?? [];
  const budgetTranches = stats.budget_tranches ?? [];
  const budgetByType = stats.budget_by_type ?? [];
  const mensualiteByType = stats.mensualite_by_type ?? [];
  const nbTerrainsTotal = stats.nb_terrains_total ?? 0;
  const nbWithTerrains = stats.nb_with_terrains ?? 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Total demandes</p>
            <p className="text-2xl font-bold text-primary mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Budget moyen</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{fmt(stats.budget_moyen ?? 0)}</p>
            <p className="text-xs text-muted-foreground">FCFA</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Mensualité moy.</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{fmt(stats.mensualite_moyenne ?? 0)}</p>
            <p className="text-xs text-muted-foreground">FCFA/mois</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Superficie moy.</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{fmt(stats.superficie_moyenne ?? 0)}</p>
            <p className="text-xs text-muted-foreground">m²</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Terrains totaux</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{fmt(nbTerrainsTotal)}</p>
            <p className="text-xs text-muted-foreground">{nbWithTerrains} demandes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Budget total</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{fmt(Math.round((stats.budget_total ?? 0) / 1_000_000))}M</p>
            <p className="text-xs text-muted-foreground">FCFA</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 1: Type de bien + Titre foncier */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Par type de bien
            </CardTitle>
            <CardDescription>Distribution des demandes selon le type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byTypeBien} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={90} label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}>
                    {byTypeBien.map((_e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, 'Demandes']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Titre foncier
            </CardTitle>
            <CardDescription>Type de titre souhaité</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byTitreFoncier} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="label" type="category" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => [v, 'Demandes']} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {byTitreFoncier.map((_e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Géographie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Par région</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byRegion} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="label" type="category" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [v, 'Demandes']} />
                  <Bar dataKey="count" fill={COLORS[0]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Par ville (top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byVille} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="label" type="category" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [v, 'Demandes']} />
                  <Bar dataKey="count" fill={COLORS[1]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Par commune (top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            {byCommune.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Aucune donnée</p>
            ) : (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byCommune} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="label" type="category" width={90} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [v, 'Demandes']} />
                    <Bar dataKey="count" fill={COLORS[2]} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Budget */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tranches budgétaires (FCFA)</CardTitle>
            <CardDescription>Répartition des demandes par montant</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetTranches}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, 'Demandes']} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {budgetTranches.map((_e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget moyen par type de bien</CardTitle>
            <CardDescription>Montant moyen demandé (FCFA)</CardDescription>
          </CardHeader>
          <CardContent>
            {budgetByType.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Aucune donnée</p>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetByType}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${Math.round(v / 1_000_000)}M`} />
                    <Tooltip formatter={(v: number) => [fmt(v) + ' FCFA', 'Budget moyen']} />
                    <Bar dataKey="budget_moyen" radius={[4, 4, 0, 0]}>
                      {budgetByType.map((_e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Mensualité + Foncier */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Mensualité moyenne par type de bien</CardTitle>
            <CardDescription>Remboursement mensuel moyen (FCFA)</CardDescription>
          </CardHeader>
          <CardContent>
            {mensualiteByType.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Aucune donnée</p>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mensualiteByType}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${Math.round(v / 1_000)}k`} />
                    <Tooltip formatter={(v: number) => [fmt(v) + ' FCFA', 'Mensualité moy.']} />
                    <Bar dataKey="mensualite_moyenne" radius={[4, 4, 0, 0]}>
                      {mensualiteByType.map((_e, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Données foncières</CardTitle>
            <CardDescription>Superficies et terrains demandés</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Superficie moyenne</p>
                <p className="text-2xl font-bold text-amber-600">{fmt(stats.superficie_moyenne ?? 0)}</p>
                <p className="text-xs text-muted-foreground">m²</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Terrains demandés</p>
                <p className="text-2xl font-bold text-purple-600">{fmt(nbTerrainsTotal)}</p>
                <p className="text-xs text-muted-foreground">sur {nbWithTerrains} demandes</p>
              </div>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Budget total engagé</p>
              <p className="text-3xl font-bold text-rose-600">{fmt(Math.round((stats.budget_total ?? 0) / 1_000_000))} M FCFA</p>
              <p className="text-xs text-muted-foreground">sur {stats.nb_with_budget ?? 0} demandes avec budget renseigné</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
