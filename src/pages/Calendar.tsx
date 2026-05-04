import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Phone,
  CalendarCheck,
  FileText,
  MessageSquare,
  Clock,
  CheckCircle2,
  Filter,
  X,
  Loader2,
  AlertTriangle,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { fetchHRInteractions, type ApiHRInteraction } from '@/lib/api/hr';

// ── Types ────────────────────────────────────────────────────────────

type CalendarActivityType = 'call' | 'meeting' | 'email' | 'document' | 'note';
type CalendarActivityStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

interface CalendarActivity {
  id: string;
  ticketId: string | null;
  ticketReference: string | null;
  type: CalendarActivityType;
  title: string;
  description?: string;
  scheduledDate: Date;
  status: CalendarActivityStatus;
  hrName: string;
  poleName: string | null;
  activityTypeLabel: string | null;
  createdBy: string | null;
  source: 'interaction';
}

// ── Helpers ──────────────────────────────────────────────────────────

function mapInteractionToActivity(i: ApiHRInteraction): CalendarActivity {
  let status: CalendarActivityStatus = 'planned';
  if (i.status === 'done') status = 'completed';
  else if (i.status === 'canceled') status = 'cancelled';
  else if (i.status === 'in_progress') status = 'in_progress';

  let type: CalendarActivityType = 'note';
  if (i.channel === 'call') type = 'call';
  else if (i.channel === 'meeting') type = 'meeting';
  else if (i.channel === 'email') type = 'email';

  return {
    id: i.id,
    ticketId: i.ticket,
    ticketReference: i.ticket_reference,
    type,
    title: i.summary || i.activity_type_label || 'Activité',
    description: i.notes || i.outcome || undefined,
    scheduledDate: new Date(i.scheduled_for || i.interaction_date || i.created_at),
    status,
    hrName: i.hr_name,
    poleName: i.pole_name,
    activityTypeLabel: i.activity_type_label,
    createdBy: i.created_by_name,
    source: 'interaction',
  };
}

const activityTypeLabels: Record<CalendarActivityType, string> = {
  call: 'Appel',
  meeting: 'Rendez-vous',
  email: 'E-mail',
  document: 'Document',
  note: 'Note',
};

const activityTypeIcons: Record<CalendarActivityType, React.ReactNode> = {
  call: <Phone className="w-4 h-4" />,
  meeting: <CalendarCheck className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  document: <FileText className="w-4 h-4" />,
  note: <MessageSquare className="w-4 h-4" />,
};

const statusLabels: Record<CalendarActivityStatus, string> = {
  planned: 'Planifié',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

const statusColors: Record<CalendarActivityStatus, string> = {
  planned: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  completed: 'bg-green-500',
  cancelled: 'bg-gray-400',
};

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

function getDaysInMonth(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  let startDayOfWeek = firstDay.getDay();
  startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

// Get unique tickets from activities
function getUniqueTickets(activities: CalendarActivity[]): { id: string; reference: string }[] {
  const ticketMap = new Map<string, { id: string; reference: string }>();
  activities.forEach((activity) => {
    if (activity.ticketId && activity.ticketReference && !ticketMap.has(activity.ticketId)) {
      ticketMap.set(activity.ticketId, {
        id: activity.ticketId,
        reference: activity.ticketReference,
      });
    }
  });
  return Array.from(ticketMap.values());
}

export default function Calendar() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Data state
  const [activities, setActivities] = useState<CalendarActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [selectedTypes, setSelectedTypes] = useState<CalendarActivityType[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<CalendarActivityStatus[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>('all');

  // ── Fetch interactions from API ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchHRInteractions();
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data as any).results ?? [];
        setActivities(list.map(mapInteractionToActivity));
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'Erreur de chargement des activités');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const uniqueTickets = useMemo(() => getUniqueTickets(activities), [activities]);

  // Apply filters
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      if (selectedTypes.length > 0 && !selectedTypes.includes(activity.type)) return false;
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(activity.status)) return false;
      if (selectedTicketId !== 'all' && activity.ticketId !== selectedTicketId) return false;
      return true;
    });
  }, [activities, selectedTypes, selectedStatuses, selectedTicketId]);

  const hasActiveFilters = selectedTypes.length > 0 || selectedStatuses.length > 0 || selectedTicketId !== 'all';
  const activeFilterCount = selectedTypes.length + selectedStatuses.length + (selectedTicketId !== 'all' ? 1 : 0);

  const clearFilters = () => {
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setSelectedTicketId('all');
  };

  const toggleType = (type: CalendarActivityType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleStatus = (status: CalendarActivityStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const days = useMemo(() => getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth()), [currentDate]);

  const activitiesByDate = useMemo(() => {
    const map = new Map<string, CalendarActivity[]>();
    filteredActivities.forEach((activity) => {
      const date = activity.scheduledDate;
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(activity);
    });
    return map;
  }, [filteredActivities]);

  const getActivitiesForDate = (date: Date): CalendarActivity[] => {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return activitiesByDate.get(key) || [];
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const handleDayClick = (date: Date) => {
    const activities = getActivitiesForDate(date);
    if (activities.length > 0) {
      setSelectedDate(date);
      setIsDialogOpen(true);
    }
  };

  const isToday = (date: Date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const selectedActivities = selectedDate ? getActivitiesForDate(selectedDate) : [];

  // Stats based on filtered activities
  const plannedCount = filteredActivities.filter((a) => a.status === 'planned').length;
  const completedCount = filteredActivities.filter((a) => a.status === 'completed').length;
  const upcomingThisWeek = filteredActivities.filter((a) => {
    const date = new Date(a.scheduledDate);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return a.status === 'planned' && date >= today && date <= weekFromNow;
  }).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-primary" />
            Calendrier des activités
          </h1>
          <p className="text-muted-foreground mt-1">
            Vue d'ensemble de toutes les activités planifiées sur l'ensemble des requêtes
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Select value={selectedTicketId} onValueChange={setSelectedTicketId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Toutes les requêtes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les requêtes</SelectItem>
              {uniqueTickets.map((ticket) => (
                <SelectItem key={ticket.id} value={ticket.id}>
                  {ticket.reference}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Filtres
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filtres</h4>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto py-1 px-2 text-xs">
                      Réinitialiser
                    </Button>
                  )}
                </div>

                <Separator />

                {/* Type filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Type d'activité</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(activityTypeLabels) as CalendarActivityType[]).map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${type}`}
                          checked={selectedTypes.includes(type)}
                          onCheckedChange={() => toggleType(type)}
                        />
                        <label
                          htmlFor={`type-${type}`}
                          className="text-sm cursor-pointer flex items-center gap-1"
                        >
                          {activityTypeIcons[type]}
                          {activityTypeLabels[type]}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Status filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Statut</Label>
                  <div className="space-y-2">
                    {(Object.keys(statusLabels) as CalendarActivityStatus[]).map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status}`}
                          checked={selectedStatuses.includes(status)}
                          onCheckedChange={() => toggleStatus(status)}
                        />
                        <label
                          htmlFor={`status-${status}`}
                          className="text-sm cursor-pointer flex items-center gap-2"
                        >
                          <div className={cn('w-2.5 h-2.5 rounded', statusColors[status])} />
                          {statusLabels[status]}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} title="Effacer les filtres">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filtres actifs :</span>
          {selectedTypes.map((type) => (
            <Badge key={type} variant="secondary" className="gap-1">
              {activityTypeIcons[type]}
              {activityTypeLabels[type]}
              <button onClick={() => toggleType(type)} className="ml-1 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {selectedStatuses.map((status) => (
            <Badge key={status} variant="secondary" className="gap-1">
              <div className={cn('w-2 h-2 rounded', statusColors[status])} />
              {statusLabels[status]}
              <button onClick={() => toggleStatus(status)} className="ml-1 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {selectedTicketId !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              <FileText className="w-3 h-3" />
              {uniqueTickets.find((t) => t.id === selectedTicketId)?.reference}
              <button onClick={() => setSelectedTicketId('all')} className="ml-1 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Chargement des activités…</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5 text-destructive">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Erreur</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{plannedCount}</p>
                <p className="text-sm text-muted-foreground">Activités planifiées</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedCount}</p>
                <p className="text-sm text-muted-foreground">Activités terminées</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingThisWeek}</p>
                <p className="text-sm text-muted-foreground">Cette semaine</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Aujourd'hui
              </Button>
              <div className="flex">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-r-none"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-l-none border-l-0"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-px mb-2">
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {days.map((date, index) => {
              const dayActivities = getActivitiesForDate(date);
              const hasActivities = dayActivities.length > 0;

              return (
                <div
                  key={index}
                  onClick={() => handleDayClick(date)}
                  className={cn(
                    'min-h-[100px] p-2 bg-card transition-colors',
                    !isCurrentMonth(date) && 'bg-muted/30 text-muted-foreground',
                    hasActivities && 'cursor-pointer hover:bg-accent/50',
                    isToday(date) && 'ring-2 ring-primary ring-inset'
                  )}
                >
                  <div className={cn(
                    'text-sm font-medium mb-1',
                    isToday(date) && 'text-primary'
                  )}>
                    {date.getDate()}
                  </div>

                  {hasActivities && (
                    <div className="space-y-1">
                      {dayActivities.slice(0, 2).map((activity) => (
                        <div
                          key={activity.id}
                          className={cn(
                            'text-xs px-1.5 py-0.5 rounded truncate text-white',
                            statusColors[activity.status]
                          )}
                          title={activity.title}
                        >
                          {activity.title}
                        </div>
                      ))}
                      {dayActivities.length > 2 && (
                        <div className="text-xs text-muted-foreground pl-1">
                          +{dayActivities.length - 2} autres
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-sm flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-muted-foreground">Planifié</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-muted-foreground">En cours</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-muted-foreground">Terminé</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gray-400" />
              <span className="text-muted-foreground">Annulé</span>
            </div>
          </div>

          {/* No results message */}
          {!loading && !hasActiveFilters && activities.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Aucune activité enregistrée pour le moment</p>
              <p className="text-xs mt-1">Les activités créées dans les requêtes apparaîtront ici</p>
            </div>
          )}
          {hasActiveFilters && filteredActivities.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Aucune activité ne correspond aux filtres sélectionnés</p>
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Réinitialiser les filtres
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day details dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Activités du {selectedDate?.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-4 max-h-[400px] overflow-y-auto">
            {selectedActivities.map((activity) => (
              <div
                key={activity.id}
                className="p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'p-2 rounded-lg shrink-0',
                    activity.status === 'completed'
                      ? 'bg-green-500/10 text-green-500'
                      : activity.status === 'in_progress'
                      ? 'bg-amber-500/10 text-amber-500'
                      : activity.status === 'planned'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {activityTypeIcons[activity.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{activity.title}</p>
                      <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                        {statusLabels[activity.status]}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span>{activityTypeLabels[activity.type]}</span>
                      <span>•</span>
                      <span>{activity.scheduledDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      {activity.activityTypeLabel && (
                        <>
                          <span>•</span>
                          <span>{activity.activityTypeLabel}</span>
                        </>
                      )}
                    </div>

                    {activity.hrName && (
                      <p className="text-xs mt-1">
                        <span className="text-muted-foreground">Contact : </span>
                        <span className="font-medium">{activity.hrName}</span>
                      </p>
                    )}

                    {activity.poleName && (
                      <p className="text-xs">
                        <span className="text-muted-foreground">Pôle : </span>
                        <span>{activity.poleName}</span>
                      </p>
                    )}

                    {activity.description && (
                      <p className="text-sm text-muted-foreground mt-1.5 line-clamp-3">
                        {activity.description}
                      </p>
                    )}

                    {activity.ticketId && activity.ticketReference && (
                      <Link
                        to={`/tickets/${activity.ticketId}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        <ExternalLink className="w-3 h-3" />
                        {activity.ticketReference}
                      </Link>
                    )}

                    {activity.createdBy && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Par {activity.createdBy}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
