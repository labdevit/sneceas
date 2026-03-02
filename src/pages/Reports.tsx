import { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import { getRequetes, getEntreprises, type RequeteListDto, type EntrepriseDto } from '@/lib/api';
import { ticketTypeLabels } from '@/lib/mock-data';
import { statusLabels, urgencyLabels } from '@/lib/mock-data';

const STATUT_CLOSED = ['resolved', 'non_resolu', 'closed'];
const STATUS_KEYS = ['new', 'info_needed', 'processing', 'hr_escalated', 'hr_pending', 'resolved', 'non_resolu', 'closed'] as const;
const COLORS = ['hsl(220, 70%, 50%)', 'hsl(160, 60%, 45%)', 'hsl(30, 80%, 55%)', 'hsl(280, 60%, 50%)', 'hsl(340, 70%, 50%)', 'hsl(200, 60%, 50%)', 'hsl(100, 50%, 45%)', 'hsl(25, 95%, 44%)'];

const MONTH_LABELS: Record<number, string> = {
  1: 'Jan', 2: 'Fév', 3: 'Mar', 4: 'Avr', 5: 'Mai', 6: 'Juin',
  7: 'Juil', 8: 'Août', 9: 'Sept', 10: 'Oct', 11: 'Nov', 12: 'Déc',
};
const WEEKDAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function filterByPeriod(requetes: RequeteListDto[], period: string, dateKey: 'created_at' | 'updated_at'): RequeteListDto[] {
  const now = new Date();
  let start = new Date(now);
  if (period === 'week') {
    const day = now.getDay();
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (period === 'quarter') {
    const q = Math.floor(now.getMonth() / 3) + 1;
    start.setMonth((q - 1) * 3, 1);
    start.setHours(0, 0, 0, 0);
  } else if (period === 'year') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  } else {
    return requetes;
  }
  return requetes.filter((r) => {
    const raw = dateKey === 'created_at' ? r.created_at : r.updated_at;
    const d = raw ? new Date(raw) : new Date(r.updated_at);
    return d >= start;
  });
}

export default function Reports() {
  const [period, setPeriod] = useState('month');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [requetes, setRequetes] = useState<RequeteListDto[]>([]);
  const [entreprises, setEntreprises] = useState<EntrepriseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resReq, resEnt] = await Promise.all([
        getRequetes({ page_size: 500 }),
        getEntreprises(),
      ]);
      setRequetes(resReq.results ?? []);
      setEntreprises(Array.isArray(resEnt) ? resEnt : []);
    } catch {
      setError('Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRequetes = useMemo(() => {
    let list = filterByPeriod(requetes, period, 'updated_at');
    if (selectedCompany !== 'all') {
      list = list.filter((r) => String(r.entreprise?.id) === selectedCompany);
    }
    return list;
  }, [requetes, period, selectedCompany]);

  const ticketsInProgress = useMemo(
    () => filteredRequetes.filter((r) => !STATUT_CLOSED.includes(r.statut)).length,
    [filteredRequetes]
  );
  const ticketsClosed = useMemo(
    () => filteredRequetes.filter((r) => STATUT_CLOSED.includes(r.statut)).length,
    [filteredRequetes]
  );

  const ticketsByUrgency = useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0, critical: 0 };
    filteredRequetes.forEach((r) => {
      const p = (r.priorite || 'medium') as keyof typeof counts;
      if (p in counts) counts[p]++;
      else counts.medium++;
    });
    return [
      { name: 'Faible', value: counts.low, color: 'hsl(var(--urgency-low))' },
      { name: 'Moyenne', value: counts.medium, color: 'hsl(var(--urgency-medium))' },
      { name: 'Élevée', value: counts.high, color: 'hsl(var(--urgency-high))' },
      { name: 'Critique', value: counts.critical, color: 'hsl(var(--urgency-critical))' },
    ];
  }, [filteredRequetes]);

  const ticketsByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUS_KEYS.forEach((k) => { counts[k] = 0; });
    filteredRequetes.forEach((r) => {
      const s = (r.statut || 'new') as string;
      if (s in counts) counts[s]++;
      else counts.new++;
    });
    return STATUS_KEYS.map((k) => ({
      name: statusLabels[k] ?? k,
      value: counts[k] ?? 0,
    }));
  }, [filteredRequetes]);

  const ticketsByCompany = useMemo(() => {
    const byName: Record<string, number> = {};
    filteredRequetes.forEach((r) => {
      const name = r.entreprise?.nom ?? '—';
      byName[name] = (byName[name] ?? 0) + 1;
    });
    const arr = Object.entries(byName).map(([company, count]) => ({ company, count }));
    arr.sort((a, b) => b.count - a.count);
    return arr.map((item, index) => ({
      ...item,
      color: COLORS[index % COLORS.length],
    }));
  }, [filteredRequetes]);

  const monthlyTrend = useMemo(() => {
    const byMonth: Record<number, { nouveaux: number; resolus: number; enCours: number }> = {};
    for (let m = 1; m <= 12; m++) byMonth[m] = { nouveaux: 0, resolus: 0, enCours: 0 };
    requetes.forEach((r) => {
      const raw = r.created_at ?? r.updated_at;
      const d = new Date(raw);
      const m = d.getMonth() + 1;
      if (!byMonth[m]) byMonth[m] = { nouveaux: 0, resolus: 0, enCours: 0 };
      byMonth[m].nouveaux++;
      if (STATUT_CLOSED.includes(r.statut)) byMonth[m].resolus++;
      else byMonth[m].enCours++;
    });
    const now = new Date();
    const last5 = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1);
      const monthNum = d.getMonth() + 1;
      const data = byMonth[monthNum] ?? { nouveaux: 0, resolus: 0, enCours: 0 };
      return { month: MONTH_LABELS[monthNum] ?? String(monthNum), ...data };
    });
    return last5;
  }, [requetes]);

  const weeklyDistribution = useMemo(() => {
    const byDay = [0, 0, 0, 0, 0, 0, 0];
    requetes.forEach((r) => {
      const raw = r.created_at ?? r.updated_at;
      const d = new Date(raw);
      byDay[d.getDay()]++;
    });
    return WEEKDAY_LABELS.map((jour, i) => ({ jour, tickets: byDay[i] }));
  }, [requetes]);

  const topByType = useMemo(() => {
    const byType: Record<string, number> = {};
    filteredRequetes.forEach((r) => {
      const t = r.type_probleme || 'other';
      byType[t] = (byType[t] ?? 0) + 1;
    });
    return Object.entries(byType)
      .map(([type, count]) => ({ type: ticketTypeLabels[type] ?? type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredRequetes]);

  const resolutionTime = useMemo(() => {
    const byType: Record<string, number[]> = {};
    filteredRequetes.filter((r) => STATUT_CLOSED.includes(r.statut)).forEach((r) => {
      const t = r.type_probleme || 'other';
      if (!byType[t]) byType[t] = [];
      const created = r.created_at ? new Date(r.created_at) : new Date(r.updated_at);
      const updated = new Date(r.updated_at);
      const days = Math.max(0, (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      byType[t].push(days);
    });
    return Object.entries(byType)
      .map(([type, days]) => ({
        type: ticketTypeLabels[type] ?? type,
        jours: days.length ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 : 0,
      }))
      .filter((x) => x.jours > 0)
      .sort((a, b) => b.jours - a.jours)
      .slice(0, 6);
  }, [filteredRequetes]);

  const totalTickets = filteredRequetes.length;
  const avgResolutionTime =
    resolutionTime.length > 0
      ? (resolutionTime.reduce((s, x) => s + x.jours, 0) / resolutionTime.length).toFixed(1)
      : '—';
  const resolutionRate = totalTickets > 0 ? Math.round((ticketsClosed / totalTickets) * 100) : 0;
  const companiesForSelect = useMemo(
    () => entreprises.map((e) => ({ id: String(e.id), name: e.nom })),
    [entreprises]
  );

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
        <div className="flex gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
              {companiesForSelect.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border p-6 h-28 animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : (
      <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Requêtes</p>
                <p className="text-3xl font-bold text-foreground">{totalTickets}</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +12% vs mois dernier
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
                <p className="text-3xl font-bold text-foreground">{ticketsInProgress}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalTickets > 0 ? Math.round((ticketsInProgress / totalTickets) * 100) : 0}% du total
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
                <p className="text-3xl font-bold text-foreground">{ticketsClosed}</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
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
                <p className="text-3xl font-bold text-foreground">{avgResolutionTime}j</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  -2j vs mois dernier
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
        </TabsList>

        {/* Overview Tab */}
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
                        data={ticketsByUrgency}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {ticketsByUrgency.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {ticketsByUrgency.map((item) => (
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
                    <BarChart data={ticketsByCompany} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="company" type="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {ticketsByCompany.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
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
                    <BarChart data={ticketsByStatus}>
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

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Évolution Mensuelle</CardTitle>
                <CardDescription>Tendance des requêtes sur les 5 derniers mois</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrend}>
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
                    <BarChart data={weeklyDistribution}>
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

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resolution Time */}
            <Card>
              <CardHeader>
                <CardTitle>Temps de Résolution par Type</CardTitle>
                <CardDescription>Durée moyenne en jours (requêtes clôturées)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {resolutionTime.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      Aucune requête clôturée pour calculer le délai.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={resolutionTime} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" unit="j" />
                        <YAxis dataKey="type" type="category" width={100} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value) => [`${value} jours`, 'Durée moyenne']} />
                        <Bar dataKey="jours" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                          {resolutionTime.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Indicateurs de Performance</CardTitle>
                <CardDescription>Métriques clés du mois en cours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Taux de résolution</span>
                    <span className="text-lg font-semibold text-green-600">{resolutionRate}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${resolutionRate}%` }} />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Satisfaction adhérents</span>
                    <span className="text-lg font-semibold text-blue-600">4.2/5</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '84%' }} />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Délai première réponse</span>
                    <span className="text-lg font-semibold text-amber-600">2.4h</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '68%' }} />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Escalades RH résolues</span>
                    <span className="text-lg font-semibold text-purple-600">82%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: '82%' }} />
                  </div>
                </div>
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
                  {topByType.length === 0 ? (
                    <p className="text-sm text-muted-foreground col-span-3">Aucune requête pour la période sélectionnée.</p>
                  ) : (
                    topByType.map((item) => (
                      <div
                        key={item.type}
                        className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-foreground">{item.type}</p>
                            <p className="text-2xl font-bold text-primary mt-1">{item.count}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </>
      )}
    </div>
  );
}
