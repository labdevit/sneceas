import { useState, useRef, useMemo, useEffect } from 'react';
import { authenticatedDownload, authenticatedOpen } from '@/lib/api';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Loader2,
  Paperclip,
  Upload,
  XCircle,
  Eye,
  Download,
  ArrowLeft,
  CalendarCheck,
  Filter,
  Users,
  Building,
  Search,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  fetchHRInteractions,
  fetchMyInteractions,
  createHRInteraction,
  updateHRInteraction,
  deleteHRInteraction,
  uploadInteractionAttachment,
  type CreateHRInteractionPayload,
  type ApiHRInteraction,
} from '@/lib/api/hr';
import { fetchTicketsList, type ApiTicket } from '@/lib/api/tickets';
import {
  fetchMyActivityTypes,
  type ApiActivityType,
  type ActivityTypeFieldConfig,
} from '@/lib/api/activityTypes';
import { fetchPoles, type ApiPole } from '@/lib/api/poles';

const statusLabels: Record<string, string> = {
  planned: 'Planifié',
  in_progress: 'En cours',
  done: 'Terminé',
  canceled: 'Annulé',
};

const statusColors: Record<string, string> = {
  planned: 'bg-primary/10 text-primary border-primary/30',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-300',
  done: 'bg-status-resolved/10 text-status-resolved border-status-resolved/30',
  canceled: 'bg-muted text-muted-foreground border-border',
};

const channelLabels: Record<string, string> = {
  call: 'Appel',
  email: 'E-mail',
  meeting: 'Réunion',
};

function formatDateFr(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MesActivites() {
  const { typeCode } = useParams<{ typeCode?: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Fetch user's activity types ─────────────────────────────────
  const { data: activityTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ['my-activity-types'],
    queryFn: fetchMyActivityTypes,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch poles for filter
  const { data: poles = [] } = useQuery({
    queryKey: ['poles'],
    queryFn: () => fetchPoles(),
    staleTime: 5 * 60 * 1000,
  });

  // Find the selected activity type
  const selectedType = useMemo(
    () => (typeCode ? activityTypes.find((t) => t.code === typeCode) : null),
    [typeCode, activityTypes],
  );

  // ── Filter state ───────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string>('mine');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [poleFilter, setPoleFilter] = useState<string>('all');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Fetch interactions (server-side filters) ───────────────────
  const interactionParams = useMemo(() => {
    const p: Record<string, string | undefined> = {};
    if (debouncedSearch) p.q = debouncedSearch;
    if (selectedType) p.activity_type = selectedType.id;
    if (statusFilter && statusFilter !== 'all') p.status = statusFilter;
    if (poleFilter && poleFilter !== 'all') p.pole = poleFilter;
    return p;
  }, [debouncedSearch, selectedType, statusFilter, poleFilter]);

  const { data: interactions = [], isLoading: interactionsLoading } = useQuery({
    queryKey: ['interactions', ownerFilter, interactionParams],
    queryFn: () =>
      ownerFilter === 'mine'
        ? fetchMyInteractions(interactionParams)
        : fetchHRInteractions(interactionParams),
    staleTime: 30 * 1000,
  });

  // ── State ───────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [detailInteraction, setDetailInteraction] = useState<ApiHRInteraction | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Form state
  const [form, setForm] = useState({
    ticket: '',
    activity_type: '',
    summary: '',
    notes: '',
    scheduled_for: '',
    hr_name: '',
    channel: 'email' as string,
    status: 'planned' as string,
    outcome: '',
  });
  const [dynamicFields, setDynamicFields] = useState<Record<string, unknown>>({});
  const [ticketSearch, setTicketSearch] = useState('');
  const [debouncedTicketSearch, setDebouncedTicketSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTicketSearch(ticketSearch), 250);
    return () => clearTimeout(timer);
  }, [ticketSearch]);

  const { data: ticketOptions = [], isLoading: ticketOptionsLoading } = useQuery({
    queryKey: ['activity-ticket-options', debouncedTicketSearch],
    queryFn: () =>
      fetchTicketsList({
        q: debouncedTicketSearch || undefined,
      }),
    enabled: dialogOpen,
    staleTime: 30 * 1000,
  });

  // Dynamic fields config for selected form type
  const formTypeConfig = useMemo(() => {
    const atId = form.activity_type;
    const at = activityTypes.find((t) => t.id === atId);
    return (at?.fields_config ?? []).sort((a, b) => a.order - b.order);
  }, [form.activity_type, activityTypes]);

  // ── Mutations ──────────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['interactions'] });
  };

  const createMutation = useMutation({
    mutationFn: createHRInteraction,
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateHRInteractionPayload> }) =>
      updateHRInteraction(id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHRInteraction,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Activité supprimée' });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadInteractionAttachment(id, file),
  });

  // ── Handlers ───────────────────────────────────────────────────
  const resetForm = () => {
    setForm({
      ticket: '',
      activity_type: selectedType?.id ?? '',
      summary: '',
      notes: '',
      scheduled_for: '',
      hr_name: '',
      channel: selectedType?.default_channel || 'email',
      status: 'planned',
      outcome: '',
    });
    setDynamicFields({});
    setSelectedFile(null);
    setTicketSearch('');
    setEditingId(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (interaction: ApiHRInteraction) => {
    setEditingId(interaction.id);
    setForm({
      ticket: interaction.ticket ?? '',
      activity_type: interaction.activity_type ?? '',
      summary: interaction.summary,
      notes: interaction.notes || '',
      scheduled_for: interaction.scheduled_for
        ? new Date(interaction.scheduled_for).toISOString().slice(0, 16)
        : '',
      hr_name: interaction.hr_name,
      channel: interaction.channel,
      status: interaction.status,
      outcome: interaction.outcome || '',
    });
    setDynamicFields(interaction.extra_data ?? {});
    setTicketSearch(interaction.ticket_reference ?? '');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.summary.trim()) {
      toast({ title: 'Champ requis', description: 'Le résumé est obligatoire.', variant: 'destructive' });
      return;
    }

    // Check required dynamic fields
    for (const field of formTypeConfig) {
      if (field.required && !dynamicFields[field.name]) {
        toast({ title: 'Champ requis', description: `"${field.label}" est obligatoire.`, variant: 'destructive' });
        return;
      }
    }

    const payload: CreateHRInteractionPayload = {
      ticket: form.ticket || undefined,
      activity_type: form.activity_type || undefined,
      summary: form.summary.trim(),
      notes: form.notes || undefined,
      scheduled_for: form.scheduled_for ? new Date(form.scheduled_for).toISOString() : undefined,
      hr_name: form.hr_name || 'Suivi interne',
      channel: form.channel as 'call' | 'email' | 'meeting',
      status: form.status as 'planned' | 'in_progress' | 'done' | 'canceled',
      outcome: form.outcome || undefined,
      extra_data: { ...dynamicFields },
    };

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: payload });
        if (selectedFile) {
          await uploadMutation.mutateAsync({ id: editingId, file: selectedFile });
        }
        toast({ title: 'Activité mise à jour' });
      } else {
        const created = await createMutation.mutateAsync(payload);
        if (selectedFile && created?.id) {
          await uploadMutation.mutateAsync({ id: created.id, file: selectedFile });
          invalidate();
        }
        toast({ title: 'Activité créée' });
      }
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Une erreur est survenue.', variant: 'destructive' });
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
    setDeleteConfirmId(null);
  };

  const isLoading = typesLoading || interactionsLoading;

  // ── Page title ─────────────────────────────────────────────────
  const pageTitle = selectedType ? selectedType.label : 'Activités';
  const pageDesc = selectedType
    ? `Liste des activités de type "${selectedType.label}"`
    : 'Vue d\'ensemble de toutes les activités';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {typeCode && (
            <Button variant="ghost" size="icon" asChild>
              <Link to="/activities"><ArrowLeft className="w-4 h-4" /></Link>
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarCheck className="w-6 h-6 text-primary" />
              {pageTitle}
            </h1>
            <p className="text-sm text-muted-foreground">{pageDesc}</p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-1" />
          Nouvelle activité
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-[200px]"
          />
        </div>
        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
          <SelectTrigger className="w-[160px]">
            <Users className="w-4 h-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mine">Mes activités</SelectItem>
            <SelectItem value="all">Toutes</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="w-4 h-4 mr-1" />
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="planned">Planifié</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="done">Terminé</SelectItem>
            <SelectItem value="canceled">Annulé</SelectItem>
          </SelectContent>
        </Select>
        <Select value={poleFilter} onValueChange={setPoleFilter}>
          <SelectTrigger className="w-[170px]">
            <Building className="w-4 h-4 mr-1" />
            <SelectValue placeholder="Tous les pôles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les pôles</SelectItem>
            {poles.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Activity type cards (when no type selected) */}
      {!typeCode && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activityTypes.map((at) => (
            <Link
              key={at.id}
              to={`/activities/${at.code}`}
              className="block p-4 rounded-xl border bg-card hover:bg-accent/40 transition-colors shadow-card"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{at.label}</h3>
              </div>
              {at.primary_pole_name && (
                <p className="text-xs text-muted-foreground">Pôle : {at.primary_pole_name}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Canal par défaut : {channelLabels[at.default_channel] ?? at.default_channel}
              </p>
            </Link>
          ))}
          {typesLoading && (
            <div className="col-span-full flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!typesLoading && activityTypes.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-8">
              Aucun type d'activité disponible pour votre profil.
            </p>
          )}
        </div>
      )}

      {/* Activity list table — always visible */}
      <div className="bg-card rounded-xl border shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Résumé</TableHead>
              <TableHead className="w-[100px]">Statut</TableHead>
              <TableHead className="w-[100px]">Canal</TableHead>
              <TableHead className="w-[120px]">Type</TableHead>
              <TableHead className="w-[130px]">Requête</TableHead>
              <TableHead className="w-[120px]">Pôle</TableHead>
              {ownerFilter === 'all' && <TableHead className="w-[120px]">Créé par</TableHead>}
              <TableHead className="w-[140px]">Date prévue</TableHead>
              <TableHead className="w-[120px]">Contact</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={ownerFilter === 'all' ? 10 : 9} className="text-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && interactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={ownerFilter === 'all' ? 10 : 9} className="text-center py-8 text-muted-foreground">
                  Aucune activité trouvée
                </TableCell>
              </TableRow>
            )}
            {interactions.map((interaction) => (
              <TableRow key={interaction.id} className="hover:bg-accent/30">
                <TableCell>
                  <div>
                    <p className="font-medium text-sm truncate max-w-[300px]">{interaction.summary}</p>
                    {interaction.notes && (
                      <p className="text-xs text-muted-foreground truncate max-w-[300px]">{interaction.notes}</p>
                    )}
                    {interaction.report_attachment && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Paperclip className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Pièce jointe</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn('text-xs', statusColors[interaction.status])}>
                    {statusLabels[interaction.status] ?? interaction.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {channelLabels[interaction.channel] ?? interaction.channel}
                </TableCell>
                <TableCell className="text-xs">
                  {interaction.activity_type_label ?? activityTypes.find((t) => t.id === interaction.activity_type)?.label ?? '-'}
                </TableCell>
                <TableCell className="text-xs">
                  {interaction.ticket_reference ?? '-'}
                </TableCell>
                <TableCell className="text-xs">
                  {interaction.pole_name ?? '-'}
                </TableCell>
                {ownerFilter === 'all' && (
                  <TableCell className="text-xs">
                    {interaction.created_by_name ?? '-'}
                  </TableCell>
                )}
                <TableCell className="text-sm">
                  {formatDateFr(interaction.scheduled_for)}
                </TableCell>
                <TableCell className="text-sm truncate max-w-[120px]">
                  {interaction.hr_name}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {interaction.status === 'planned' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-status-resolved"
                        title="Marquer comme terminée"
                        onClick={() => {
                          updateMutation.mutate(
                            { id: interaction.id, data: { status: 'done', interaction_date: new Date().toISOString() } },
                            { onSuccess: () => toast({ title: 'Marquer comme terminée' }) },
                          );
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      title="Voir le détail"
                      onClick={() => setDetailInteraction(interaction)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      title="Modifier"
                      onClick={() => openEditDialog(interaction)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive"
                      title="Supprimer"
                      onClick={() => setDeleteConfirmId(interaction.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier l\'activité' : 'Nouvelle activité'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Modifiez les informations de cette activité' : 'Planifiez une nouvelle activité'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Activity type selector */}
            <div>
              <Label className="mb-2 block">Requête liée (optionnel)</Label>
              <Input
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                placeholder="Rechercher une requête (référence, objet...)"
                className="mb-2"
              />
              <Select
                value={form.ticket || '__none__'}
                onValueChange={(v) => setForm({ ...form, ticket: v === '__none__' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucune requête liée" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucune (activité hors ticket)</SelectItem>
                  {ticketOptionsLoading ? (
                    <SelectItem value="__loading__" disabled>Chargement...</SelectItem>
                  ) : (
                    ticketOptions.map((t: ApiTicket) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.reference} - {t.subject}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Type d'activité</Label>
              <Select
                value={form.activity_type}
                onValueChange={(v) => {
                  setForm({ ...form, activity_type: v });
                  setDynamicFields({});
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {activityTypes.map((at) => (
                    <SelectItem key={at.id} value={at.id}>{at.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="act-summary">Résumé / Titre *</Label>
              <Input
                id="act-summary"
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                placeholder="Ex: Appel avec M. Diop"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="act-notes">Notes / Description</Label>
              <Textarea
                id="act-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Détails..."
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="act-date">Date prévue</Label>
                <Input
                  id="act-date"
                  type="datetime-local"
                  value={form.scheduled_for}
                  onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="act-channel">Canal</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Appel</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="meeting">Réunion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="act-hr">Contact</Label>
                <Input
                  id="act-hr"
                  value={form.hr_name}
                  onChange={(e) => setForm({ ...form, hr_name: e.target.value })}
                  placeholder="Nom du contact"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="act-status">Statut</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planifié</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="done">Terminé</SelectItem>
                    <SelectItem value="canceled">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editingId && (
              <div>
                <Label htmlFor="act-outcome">Résultat / Compte-rendu</Label>
                <Textarea
                  id="act-outcome"
                  value={form.outcome}
                  onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                  placeholder="Résultat de l'activité..."
                  className="mt-1"
                />
              </div>
            )}

            {/* File attachment */}
            <div>
              <Label>Pièce jointe</Label>
              <div className="mt-1 flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setSelectedFile(file);
                  }}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                />
                <Input
                  value={selectedFile?.name ?? ''}
                  readOnly
                  placeholder="Aucun fichier"
                  className="flex-1"
                />
                <Button variant="outline" size="icon" type="button" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Dynamic fields */}
            {formTypeConfig.length > 0 && (
              <>
                <Separator />
                <p className="text-xs font-medium text-muted-foreground">Champs spécifiques</p>
                {formTypeConfig.map((field: ActivityTypeFieldConfig) => (
                  <div key={field.id}>
                    <Label htmlFor={`dyn-${field.name}`}>
                      {field.label}{field.required ? ' *' : ''}
                    </Label>
                    {field.field_type === 'text' && (
                      <Input
                        id={`dyn-${field.name}`}
                        value={(dynamicFields[field.name] as string) ?? ''}
                        onChange={(e) => setDynamicFields({ ...dynamicFields, [field.name]: e.target.value })}
                        className="mt-1"
                      />
                    )}
                    {field.field_type === 'textarea' && (
                      <Textarea
                        id={`dyn-${field.name}`}
                        value={(dynamicFields[field.name] as string) ?? ''}
                        onChange={(e) => setDynamicFields({ ...dynamicFields, [field.name]: e.target.value })}
                        className="mt-1"
                      />
                    )}
                    {field.field_type === 'number' && (
                      <Input
                        id={`dyn-${field.name}`}
                        type="number"
                        value={(dynamicFields[field.name] as string) ?? ''}
                        onChange={(e) => setDynamicFields({ ...dynamicFields, [field.name]: e.target.value })}
                        className="mt-1"
                      />
                    )}
                    {field.field_type === 'date' && (
                      <Input
                        id={`dyn-${field.name}`}
                        type="date"
                        value={(dynamicFields[field.name] as string) ?? ''}
                        onChange={(e) => setDynamicFields({ ...dynamicFields, [field.name]: e.target.value })}
                        className="mt-1"
                      />
                    )}
                    {field.field_type === 'datetime' && (
                      <Input
                        id={`dyn-${field.name}`}
                        type="datetime-local"
                        value={(dynamicFields[field.name] as string) ?? ''}
                        onChange={(e) => setDynamicFields({ ...dynamicFields, [field.name]: e.target.value })}
                        className="mt-1"
                      />
                    )}
                    {field.field_type === 'boolean' && (
                      <div className="flex items-center gap-2 mt-1">
                        <Checkbox
                          id={`dyn-${field.name}`}
                          checked={!!dynamicFields[field.name]}
                          onCheckedChange={(checked) => setDynamicFields({ ...dynamicFields, [field.name]: !!checked })}
                        />
                        <Label htmlFor={`dyn-${field.name}`} className="text-sm font-normal">{field.label}</Label>
                      </div>
                    )}
                    {field.field_type === 'choice' && field.options && (
                      <Select
                        value={(dynamicFields[field.name] as string) ?? ''}
                        onValueChange={(v) => setDynamicFields({ ...dynamicFields, [field.name]: v })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingId ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detailInteraction} onOpenChange={(open) => { if (!open) setDetailInteraction(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailInteraction?.summary}
            </DialogTitle>
            <DialogDescription>
              {detailInteraction?.activity_type_label
                ? `Type : ${detailInteraction.activity_type_label}`
                : 'Activité'}
            </DialogDescription>
          </DialogHeader>
          {detailInteraction && (() => {
            const typeFields =
              activityTypes.find((t) => t.id === detailInteraction.activity_type)?.fields_config ?? [];
            const extraEntries = Object.entries(detailInteraction.extra_data ?? {}).filter(
              ([k]) => k !== 'type',
            );
            return (
              <div className="space-y-4 mt-2">
                {/* Statut + type */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn('text-xs', statusColors[detailInteraction.status])}>
                    {statusLabels[detailInteraction.status] ?? detailInteraction.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {channelLabels[detailInteraction.channel] ?? detailInteraction.channel}
                  </span>
                  {detailInteraction.pole_name && (
                    <span className="text-xs text-muted-foreground">• {detailInteraction.pole_name}</span>
                  )}
                  {detailInteraction.ticket_reference && (
                    <span className="text-xs text-muted-foreground">• Requête : {detailInteraction.ticket_reference}</span>
                  )}
                </div>

                <Separator />

                {/* Dates + contact */}
                <div className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
                  {detailInteraction.scheduled_for && (
                    <>
                      <span className="text-xs text-muted-foreground font-medium">Date prévue</span>
                      <span>{formatDateFr(detailInteraction.scheduled_for)}</span>
                    </>
                  )}
                  {detailInteraction.interaction_date && (
                    <>
                      <span className="text-xs text-muted-foreground font-medium">Date réalisée</span>
                      <span>{formatDateFr(detailInteraction.interaction_date)}</span>
                    </>
                  )}
                  {detailInteraction.hr_name && (
                    <>
                      <span className="text-xs text-muted-foreground font-medium">Contact</span>
                      <span>{detailInteraction.hr_name}</span>
                    </>
                  )}
                  {detailInteraction.created_by_name && (
                    <>
                      <span className="text-xs text-muted-foreground font-medium">Créé par</span>
                      <span>{detailInteraction.created_by_name}</span>
                    </>
                  )}
                </div>

                {/* Notes */}
                {detailInteraction.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm whitespace-pre-wrap">{detailInteraction.notes}</p>
                    </div>
                  </>
                )}

                {/* Champs dynamiques du modèle */}
                {extraEntries.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Champs du modèle</p>
                      <div className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
                        {extraEntries.map(([key, value]) => {
                          const fieldDef = typeFields.find((f: ActivityTypeFieldConfig) => f.name === key);
                          const label = fieldDef?.label ?? key;
                          const displayValue =
                            typeof value === 'boolean'
                              ? (value ? 'Oui' : 'Non')
                              : value !== null && value !== undefined && String(value) !== ''
                                ? String(value)
                                : null;
                          if (!displayValue) return null;
                          return (
                            <>
                              <span key={`${key}-label`} className="text-xs text-muted-foreground font-medium">{label}</span>
                              <span key={`${key}-value`} className="text-sm break-words">{displayValue}</span>
                            </>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Résultat */}
                {detailInteraction.outcome && (
                  <>
                    <Separator />
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Résultat / Compte-rendu</p>
                      <p className="text-sm whitespace-pre-wrap">{detailInteraction.outcome}</p>
                    </div>
                  </>
                )}

                {/* Pièce jointe */}
                {detailInteraction.report_attachment_url && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Pièce jointe</p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => authenticatedOpen(detailInteraction.report_attachment_url!)}>
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Aperçu
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => authenticatedDownload(detailInteraction.report_attachment_url!, 'piece-jointe')}>
                            <Download className="w-3.5 h-3.5 mr-1" />
                            Télécharger
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setDetailInteraction(null)}>Fermer</Button>
                  <Button onClick={() => { setDetailInteraction(null); openEditDialog(detailInteraction); }}>
                    <Edit2 className="w-4 h-4 mr-1" />
                    Modifier
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>Cette action est irréversible.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Supprimer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
