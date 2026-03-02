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
  ExternalLink
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
import { getCalendarEvents, type CalendarEvent } from '@/lib/api';
import type { ActivityType, ActivityStatus } from '@/components/tickets/ActivityTracker';

/** Origine : activité créée sur une requête (date planifiée) ou réunion de dossier */
export type CalendarEventSource = 'activite' | 'reunion';

/** Activité affichée : activité de requête (à sa date planifiée) ou réunion */
interface TicketActivity {
  id: string;
  ticketId: string;
  ticketReference: string;
  ticketSubject: string;
  type: ActivityType;
  /** Libellé du type renvoyé par l’API (ex. "Appel téléphonique") */
  typeDisplay?: string;
  title: string;
  description?: string;
  scheduledDate: Date;
  status: ActivityStatus;
  createdBy?: string;
  createdAt?: Date;
  source: CalendarEventSource;
}

function mapCalendarEventToActivity(e: CalendarEvent): TicketActivity {
  const statut = (e.statut ?? '').toString();
  const status: ActivityStatus =
    statut === 'TERMINEE' || statut === 'completed' ? 'completed'
      : statut === 'ANNULEE' || statut === 'cancelled' ? 'cancelled'
      : 'planned';
  const isActivite = (e.event_type ?? '').toString().toLowerCase() === 'activite';
  const source: CalendarEventSource = isActivite ? 'activite' : 'reunion';
  const ticketId = isActivite ? String(e.requete_id ?? '') : String(e.dossier_id ?? '');
  const ticketReference = (isActivite ? e.numero_reference : e.dossier_numero) ?? '';
  const type: ActivityType = isActivite
    ? (e.type_activite === 'call' ? 'call' : e.type_activite === 'document' ? 'document' : e.type_activite === 'note' ? 'note' : 'meeting')
    : 'meeting';
  const startStr = String(e.start ?? '').trim();
  let scheduledDate: Date;
  if (startStr) {
    const parsed = new Date(startStr);
    scheduledDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  } else {
    scheduledDate = new Date();
  }
  const typeDisplay = isActivite ? (e.type_activite_display ?? '') : (e.type_reunion_display ?? '');
  return {
    id: e.id ?? `evt-${ticketId}-${startStr}`,
    ticketId,
    ticketReference,
    ticketSubject: e.title ?? '',
    type,
    typeDisplay: typeDisplay || undefined,
    title: e.title ?? '',
    description: e.description || (e.lieu ? `Lieu : ${e.lieu}` : undefined),
    scheduledDate,
    status,
    createdBy: undefined,
    createdAt: undefined,
    source,
  };
}

const activityTypeLabels: Record<ActivityType, string> = {
  call: 'Appel',
  meeting: 'Rendez-vous',
  document: 'Document',
  note: 'Note',
};

const activityTypeIcons: Record<ActivityType, React.ReactNode> = {
  call: <Phone className="w-4 h-4" />,
  meeting: <CalendarCheck className="w-4 h-4" />,
  document: <FileText className="w-4 h-4" />,
  note: <MessageSquare className="w-4 h-4" />,
};

const statusLabels: Record<ActivityStatus, string> = {
  planned: 'Planifié',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

const statusColors: Record<ActivityStatus, string> = {
  planned: 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-muted',
};

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/** Clé unique pour regrouper les activités par jour (année-mois-jour en heure locale). */
function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Heure seule (ex. "02:25"). */
function formatActivityTime(scheduledDate: Date | string): string {
  const d = typeof scheduledDate === 'string' ? new Date(scheduledDate) : (scheduledDate instanceof Date ? scheduledDate : new Date(scheduledDate as unknown as string));
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** Date courte + heure pour la grille (ex. "25 févr. 02:25"). */
function formatActivityDateShort(scheduledDate: Date | string): string {
  const d = typeof scheduledDate === 'string' ? new Date(scheduledDate) : (scheduledDate instanceof Date ? scheduledDate : new Date(scheduledDate as unknown as string));
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

/** Date complète pour le détail (ex. "25 févr. 2026 à 02:25"). */
function formatActivityDateTime(scheduledDate: Date | string): string {
  const d = typeof scheduledDate === 'string' ? new Date(scheduledDate) : (scheduledDate instanceof Date ? scheduledDate : new Date(scheduledDate as unknown as string));
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

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
function getUniqueTickets(activities: TicketActivity[]): { id: string; reference: string; subject: string }[] {
  const ticketMap = new Map<string, { id: string; reference: string; subject: string }>();
  activities.forEach((activity) => {
    if (!ticketMap.has(activity.ticketId)) {
      ticketMap.set(activity.ticketId, {
        id: activity.ticketId,
        reference: activity.ticketReference,
        subject: activity.ticketSubject,
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

  // Données calendrier depuis l’API (réunions planifiées)
  const [activitiesFromApi, setActivitiesFromApi] = useState<TicketActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Filter state
  const [selectedTypes, setSelectedTypes] = useState<ActivityType[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<ActivityStatus[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>('all');

  // Charger les événements calendrier pour le mois affiché (plage couvrant tout le mois en UTC)
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    // Début du mois à 00:00 UTC, fin du mois à 23:59:59.999 UTC
    const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const lastDay = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
    setLoading(true);
    setApiError(null);
    getCalendarEvents({
      start: start.toISOString(),
      end: lastDay.toISOString(),
    })
      .then((data) => {
        const raw = data as
          | CalendarEvent[]
          | { events?: CalendarEvent[]; debug?: Record<string, unknown> }
          | { results?: CalendarEvent[] }
          | { data?: CalendarEvent[] };
        const events: CalendarEvent[] = Array.isArray(raw)
          ? raw
          : (raw as { events?: CalendarEvent[] })?.events ??
            (raw as { results?: CalendarEvent[] })?.results ??
            (raw as { data?: CalendarEvent[] })?.data ??
            [];
        const mapped = events
          .filter((e) => e && (e.start || e.id))
          .map(mapCalendarEventToActivity)
          .filter((a) => {
            if (!a?.id) return false;
            const d = a.scheduledDate;
            const t = d instanceof Date ? d.getTime() : (typeof d === 'string' ? new Date(d).getTime() : NaN);
            return !Number.isNaN(t);
          });
        if (import.meta.env.DEV) {
          const nActivites = events.filter((e) => e.event_type === 'activite').length;
          console.debug('[Calendar] API:', events.length, 'événements dont', nActivites, 'activités → affichés:', mapped.length);
        }
        setActivitiesFromApi(mapped);
      })
      .catch((err: { status?: number; data?: { detail?: string } }) => {
        setActivitiesFromApi([]);
        const detail = err?.data?.detail;
        const status = err?.status;
        if (status === 401) {
          setApiError(detail || 'Session expirée ou non authentifié. Reconnectez-vous.');
        } else if (status && status >= 500) {
          setApiError(detail || 'Erreur serveur. Vérifiez que le backend est démarré.');
        } else if (status === 404 || status === 0) {
          setApiError('API introuvable. Vérifiez VITE_API_URL (ex. http://127.0.0.1:8000/api).');
        } else {
          setApiError(typeof detail === 'string' ? detail : 'Impossible de charger le calendrier.');
        }
      })
      .finally(() => setLoading(false));
  }, [currentDate]);

  const uniqueTickets = useMemo(() => getUniqueTickets(activitiesFromApi), [activitiesFromApi]);

  // Apply filters (activitiesFromApi dans les deps pour recalculer quand les données API arrivent)
  const filteredActivities = useMemo(() => {
    return activitiesFromApi.filter((activity) => {
      // Type filter
      if (selectedTypes.length > 0 && !selectedTypes.includes(activity.type)) {
        return false;
      }
      // Status filter
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(activity.status)) {
        return false;
      }
      // Ticket filter
      if (selectedTicketId !== 'all' && activity.ticketId !== selectedTicketId) {
        return false;
      }
      return true;
    });
  }, [activitiesFromApi, selectedTypes, selectedStatuses, selectedTicketId]);

  const hasActiveFilters = selectedTypes.length > 0 || selectedStatuses.length > 0 || selectedTicketId !== 'all';
  const activeFilterCount = selectedTypes.length + selectedStatuses.length + (selectedTicketId !== 'all' ? 1 : 0);

  const clearFilters = () => {
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setSelectedTicketId('all');
  };

  const toggleType = (type: ActivityType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleStatus = (status: ActivityStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const days = useMemo(() => getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth()), [currentDate]);

  const activitiesByDate = useMemo(() => {
    const map = new Map<string, TicketActivity[]>();
    filteredActivities.forEach((activity) => {
      const raw = activity.scheduledDate;
      const date = raw instanceof Date ? raw : new Date(raw as unknown as string);
      if (Number.isNaN(date.getTime())) return; // exclure événements sans date valide
      const key = getDateKey(date);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(activity);
    });
    return map;
  }, [filteredActivities]);

  const getActivitiesForDate = (date: Date): TicketActivity[] => {
    return activitiesByDate.get(getDateKey(date)) || [];
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
            Calendrier
          </h1>
          <p className="text-muted-foreground mt-1">
            Activités créées sur les requêtes (affichées à leur date planifiée) et réunions des dossiers
            {!loading && (
              <span className="ml-2 text-sm">
                — {activitiesFromApi.length} événement{activitiesFromApi.length !== 1 ? 's' : ''} ce mois
              </span>
            )}
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Select value={selectedTicketId} onValueChange={setSelectedTicketId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tous les dossiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les dossiers</SelectItem>
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
                    {(Object.keys(activityTypeLabels) as ActivityType[]).map((type) => (
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
                    {(Object.keys(statusLabels) as ActivityStatus[]).map((status) => (
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

      {/* Message d'erreur API */}
      {apiError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center justify-between gap-4 flex-wrap">
          <span>{apiError}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setApiError(null);
              const year = currentDate.getFullYear();
              const month = currentDate.getMonth();
              const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
              const lastDay = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
              setLoading(true);
              getCalendarEvents({ start: start.toISOString(), end: lastDay.toISOString() })
                .then((data) => {
                  const raw = data as CalendarEvent[] | { events?: CalendarEvent[]; results?: CalendarEvent[]; data?: CalendarEvent[] };
                  const events: CalendarEvent[] = Array.isArray(raw)
                    ? raw
                    : (raw as { events?: CalendarEvent[] })?.events ?? (raw as { results?: CalendarEvent[] })?.results ?? (raw as { data?: CalendarEvent[] })?.data ?? [];
                  const mapped = events
                    .filter((e) => e && (e.start || e.id))
                    .map(mapCalendarEventToActivity)
                    .filter((a) => {
                      if (!a?.id) return false;
                      const d = a.scheduledDate;
                      const t = d instanceof Date ? d.getTime() : (typeof d === 'string' ? new Date(d).getTime() : NaN);
                      return !Number.isNaN(t);
                    });
                  setActivitiesFromApi(mapped);
                })
                .catch((e: { status?: number; data?: { detail?: string } }) => {
                  setApiError(e?.data?.detail ?? 'Erreur lors du rechargement.');
                })
                .finally(() => setLoading(false));
            }}
          >
            Réessayer
          </Button>
        </div>
      )}

      {/* Message quand l'API répond mais aucun événement (pas d'erreur) */}
      {!loading && !apiError && activitiesFromApi.length === 0 && !hasActiveFilters && (
        <div className="rounded-lg border border-muted bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
          <p className="font-medium">Aucun événement ce mois-ci</p>
          <p className="mt-1">
            Ce calendrier affiche les <strong>activités créées sur les requêtes</strong> (à leur date planifiée) et les <strong>réunions</strong> des dossiers. Créez une activité depuis le détail d&apos;une requête pour la voir ici.
          </p>
          <Link to="/tickets" className="inline-flex items-center gap-1 text-primary hover:underline mt-2">
            Voir les requêtes
          </Link>
        </div>
      )}

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
          <div className={cn('grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden', loading && 'opacity-60 pointer-events-none')}>
            {days.map((date, index) => {
              const activities = getActivitiesForDate(date);
              const hasActivities = activities.length > 0;

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
                      {activities.slice(0, 2).map((activity) => (
                        <div
                          key={activity.id}
                          className={cn(
                            'text-xs px-1.5 py-0.5 rounded text-white',
                            statusColors[activity.status]
                          )}
                          title={`${activity.source === 'activite' ? 'Activité requête' : 'Réunion'} — ${activity.title} — ${formatActivityDateShort(activity.scheduledDate)} — ${activity.source === 'activite' ? 'Requête' : 'Dossier'} ${activity.ticketReference}`}
                        >
                          <span className="flex items-center gap-1 truncate">
                            {activityTypeIcons[activity.type]}
                            <span className="truncate">{activity.title}</span>
                          </span>
                          <div className="truncate mt-0.5 opacity-90 text-[10px] font-medium">
                            {activity.source === 'activite' ? 'Requête' : 'Réunion'} {activity.ticketReference} · {formatActivityDateShort(activity.scheduledDate)}
                          </div>
                        </div>
                      ))}
                      {activities.length > 2 && (
                        <div className="text-xs text-muted-foreground pl-1">
                          +{activities.length - 2} autres
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-muted-foreground">Planifié</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-muted-foreground">Terminé</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-muted" />
              <span className="text-muted-foreground">Annulé</span>
            </div>
            <span className="text-muted-foreground border-l pl-4">Affichage : activités des requêtes (à leur date) + réunions</span>
          </div>

          {/* No results message */}
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
              Activités requêtes et réunions — {selectedDate?.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-4 max-h-[400px] overflow-y-auto">
            {selectedActivities.map((activity) => {
              const isActivite = activity.source === 'activite' && activity.ticketId;
              return (
                <div key={activity.id} className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'p-2 rounded-lg shrink-0',
                      activity.status === 'completed'
                        ? 'bg-green-500/10 text-green-500'
                        : activity.status === 'planned'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                    )}>
                      {activityTypeIcons[activity.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-sm">{activity.title}</p>
                        <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                          {statusLabels[activity.status]}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {activity.source === 'activite' ? 'Activité requête' : 'Réunion'}
                        </Badge>
                        {isActivite && (
                          <Link
                            to={`/tickets/${activity.ticketId}`}
                            onClick={() => setIsDialogOpen(false)}
                            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 rounded p-1 -m-1"
                            title={`Ouvrir la requête ${activity.ticketReference}`}
                          >
                            <ExternalLink className="w-4 h-4 shrink-0" />
                          </Link>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1">
                        {activity.typeDisplay || activityTypeLabels[activity.type]}
                        <span>•</span>
                        <span><strong>Date :</strong> {formatActivityDateTime(activity.scheduledDate)}</span>
                        <span>•</span>
                        <span>{activity.source === 'activite' ? 'Requête' : 'Dossier'} {activity.ticketReference}</span>
                      </p>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {activity.description}
                        </p>
                      )}
                      {!isActivite && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-2">
                          <FileText className="w-3 h-3" />
                          Dossier {activity.ticketReference}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
