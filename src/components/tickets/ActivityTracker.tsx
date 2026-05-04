import { useState, useRef, useMemo } from 'react';
import { authenticatedDownload, authenticatedOpen } from '@/lib/api';
import {
  Phone,
  CalendarCheck,
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  Paperclip,
  MessageSquare,
  X,
  Upload,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  Download,
  Share2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTicketHRInteractions,
  createHRInteraction,
  updateHRInteraction,
  deleteHRInteraction,
  uploadInteractionAttachment,
  type CreateHRInteractionPayload,
  type ApiHRInteraction,
} from '@/lib/api/hr';
import { fetchActivityTypes, type ApiActivityType, type ActivityTypeFieldConfig } from '@/lib/api/activityTypes';

export type ActivityType = 'call' | 'meeting' | 'document' | 'note';
export type ActivityStatus = 'planned' | 'completed' | 'cancelled';

export interface Activity {
  id: string;
  type: ActivityType;
  activityTypeId?: string;
  activityTypeLabel?: string;
  title: string;
  description?: string;
  scheduledDate: Date;
  completedDate?: Date;
  status: ActivityStatus;
  comment?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  createdBy: string;
  createdAt: Date;
  extraData?: Record<string, unknown>;
}

const activityTypeLabels: Record<ActivityType, string> = {
  call: 'Appel téléphonique',
  meeting: 'Rendez-vous',
  document: 'Document à fournir',
  note: 'Note interne',
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
  planned: 'bg-primary/10 text-primary border-primary/30',
  completed: 'bg-status-resolved/10 text-status-resolved border-status-resolved/30',
  cancelled: 'bg-muted text-muted-foreground border-border opacity-60',
};

const DEFAULT_VISIBLE = 3;

interface ActivityTrackerProps {
  ticketId: string;
  ticketReference?: string;
  ticketSubject?: string;
  recipientEmail?: string;
  recipientName?: string;
  canManage: boolean;
  poleId?: string;
}

// ── Conversion helpers ────────────────────────────────────────────────────────

function channelToType(channel: string): ActivityType {
  if (channel === 'call') return 'call';
  if (channel === 'meeting') return 'meeting';
  return 'note';
}

function typeToChannel(type: ActivityType): 'call' | 'email' | 'meeting' {
  if (type === 'call') return 'call';
  if (type === 'meeting') return 'meeting';
  return 'email';
}

function backendStatusToFrontend(status: string): ActivityStatus {
  if (status === 'done') return 'completed';
  if (status === 'canceled') return 'cancelled';
  return 'planned';
}

function interactionToActivity(i: ApiHRInteraction): Activity {
  const frontendType: ActivityType =
    typeof i.extra_data?.type === 'string'
      ? (i.extra_data.type as ActivityType)
      : channelToType(i.channel);
  // Exclude internal 'type' key from extra_data display
  const extraData: Record<string, unknown> | undefined =
    i.extra_data && Object.keys(i.extra_data).filter((k) => k !== 'type').length > 0
      ? Object.fromEntries(Object.entries(i.extra_data).filter(([k]) => k !== 'type'))
      : undefined;
  return {
    id: String(i.id),
    type: frontendType,
    activityTypeId: i.activity_type ?? undefined,
    activityTypeLabel: i.activity_type_label ?? undefined,
    title: i.summary,
    description: i.notes || undefined,
    scheduledDate: i.scheduled_for
      ? new Date(i.scheduled_for)
      : new Date(i.created_at),
    completedDate: i.interaction_date ? new Date(i.interaction_date) : undefined,
    status: backendStatusToFrontend(i.status),
    comment: i.outcome || undefined,
    attachmentName: i.report_attachment
      ? i.report_attachment.split('/').pop() || 'pièce jointe'
      : undefined,
    attachmentUrl: i.report_attachment_url || i.report_attachment || undefined,
    createdBy: i.hr_name,
    createdAt: new Date(i.created_at),
    extraData,
  };
}

function formatDateFr(date: Date) {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Map API activity types to internal ActivityType codes
function apiTypeToLocalType(code: string): ActivityType {
  if (code.includes('call') || code.includes('appel')) return 'call';
  if (code.includes('meeting') || code.includes('rdv') || code.includes('reunion')) return 'meeting';
  if (code.includes('document') || code.includes('doc')) return 'document';
  return 'note';
}

export function ActivityTracker({
  ticketId,
  ticketReference = 'REQ-XXXX',
  ticketSubject = '',
  canManage,
  poleId,
}: ActivityTrackerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [detailActivity, setDetailActivity] = useState<Activity | null>(null);
  const [isCompletingActivity, setIsCompletingActivity] = useState(false);
  const [completingFromDetail, setCompletingFromDetail] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // File upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // New activity form state
  const [newActivity, setNewActivity] = useState({
    type: '' as string,
    title: '',
    description: '',
    scheduledDate: '',
    hrName: '',
  });

  // Dynamic fields state (keyed by field name/slug)
  const [dynamicFields, setDynamicFields] = useState<Record<string, unknown>>({});

  // ── Fetch activity types from API (filtered by pole) ────────────────────────
  const { data: apiActivityTypes = [] } = useQuery({
    queryKey: ['activity-types', poleId],
    queryFn: () => fetchActivityTypes(poleId ? { poles: poleId } : undefined),
    staleTime: 5 * 60 * 1000,
  });

  // Get the fields_config for the currently selected activity type
  const selectedTypeConfig = useMemo(() => {
    if (!newActivity.type) return [];
    const at = apiActivityTypes.find((t: ApiActivityType) => t.code === newActivity.type);
    return (at?.fields_config ?? []).sort((a: ActivityTypeFieldConfig, b: ActivityTypeFieldConfig) => a.order - b.order);
  }, [newActivity.type, apiActivityTypes]);

  // Complete activity form state
  const [completeForm, setCompleteForm] = useState({
    comment: '',
    attachmentName: '',
  });
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Build dynamic type options: use API types if available, fallback to hardcoded
  const typeOptions = useMemo(() => {
    if (apiActivityTypes.length > 0) {
      return apiActivityTypes.map((at: ApiActivityType) => ({
        value: at.code,
        label: at.label,
        localType: apiTypeToLocalType(at.code),
      }));
    }
    return Object.entries(activityTypeLabels).map(([key, label]) => ({
      value: key,
      label,
      localType: key as ActivityType,
    }));
  }, [apiActivityTypes]);

  // ── Fetch interactions from API ─────────────────────────────────────────────
  const { data: rawInteractions = [], isLoading } = useQuery({
    queryKey: ['interactions', ticketId],
    queryFn: () => fetchTicketHRInteractions(ticketId),
    enabled: !!ticketId,
  });

  // Sort activities by date (newest first)
  const activities = useMemo(() => {
    const mapped = rawInteractions.map(interactionToActivity);
    return mapped.sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime());
  }, [rawInteractions]);

  const visibleActivities = showAll ? activities : activities.slice(0, DEFAULT_VISIBLE);
  const hasMore = activities.length > DEFAULT_VISIBLE;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['interactions', ticketId] });

  const createMutation = useMutation({
    mutationFn: createHRInteraction,
    onSuccess: invalidate,
    onError: () =>
      toast({ title: 'Erreur', description: "Impossible de créer l'activité.", variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateHRInteraction>[1] }) =>
      updateHRInteraction(id, data),
    onSuccess: invalidate,
    onError: () =>
      toast({ title: 'Erreur', description: "Impossible de mettre à jour l'activité.", variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHRInteraction,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Activité supprimée' });
    },
    onError: () =>
      toast({ title: 'Erreur', description: "Impossible de supprimer l'activité.", variant: 'destructive' }),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadInteractionAttachment(id, file),
    onError: () =>
      toast({ title: 'Erreur', description: 'Impossible de téléverser le fichier.', variant: 'destructive' }),
  });

  const handleDeleteActivity = (activityId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette activité ?')) {
      deleteMutation.mutate(activityId);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCompleteForm((prev) => ({ ...prev, attachmentName: file.name }));
    }
  };

  const handleAddActivity = () => {
    if (!newActivity.title || !newActivity.scheduledDate) {
      toast({
        title: 'Champs requis',
        description: 'Veuillez remplir le titre et la date.',
        variant: 'destructive',
      });
      return;
    }

    // Check required dynamic fields
    for (const field of selectedTypeConfig) {
      if (field.required && !dynamicFields[field.name]) {
        toast({
          title: 'Champs requis',
          description: `Le champ "${field.label}" est obligatoire.`,
          variant: 'destructive',
        });
        return;
      }
    }

    const selectedType = typeOptions.find((t) => t.value === newActivity.type);
    const localType = selectedType?.localType || 'note';

    createMutation.mutate(
      {
        ticket: ticketId,
        channel: typeToChannel(localType),
        summary: newActivity.title,
        notes: newActivity.description || undefined,
        scheduled_for: new Date(newActivity.scheduledDate).toISOString(),
        status: 'planned',
        hr_name: newActivity.hrName || 'Suivi interne',
        activity_type: apiActivityTypes.find((at) => at.code === newActivity.type)?.id || undefined,
        extra_data: { type: localType, ...dynamicFields },
      } satisfies CreateHRInteractionPayload,
      {
        onSuccess: () => {
          setNewActivity({ type: '', title: '', description: '', scheduledDate: '', hrName: '' });
          setDynamicFields({});
          setIsDialogOpen(false);
          toast({ title: 'Activité ajoutée', description: "L'activité a été planifiée avec succès." });
        },
      },
    );
  };

  const handleCompleteActivity = async () => {
    const target = selectedActivity;
    if (!target) return;
    if (!completeForm.comment.trim()) return;

    try {
      await updateMutation.mutateAsync({
        id: target.id,
        data: {
          status: 'done',
          outcome: completeForm.comment,
          interaction_date: new Date().toISOString(),
        },
      });

      if (selectedFile) {
        await uploadMutation.mutateAsync({ id: target.id, file: selectedFile });
      }

      setIsCompletingActivity(false);
      setSelectedActivity(null);
      setSelectedFile(null);
      setCompleteForm({ comment: '', attachmentName: '' });
      // If completing from detail popup, close it too
      if (completingFromDetail) {
        setDetailActivity(null);
        setCompletingFromDetail(false);
      }
      toast({ title: 'Activité terminée', description: "L'activité a été marquée comme terminée." });
    } catch {
      // Errors handled by mutation onError
    }
  };

  const handleCancelActivity = (activityId: string) => {
    updateMutation.mutate(
      { id: activityId, data: { status: 'canceled' } },
      {
        onSuccess: () => toast({ title: 'Activité annulée' }),
      },
    );
  };

  const openCompleteDialog = (activity: Activity, fromDetail = false) => {
    setSelectedActivity(activity);
    setIsCompletingActivity(true);
    setCompletingFromDetail(fromDetail);
  };

  // ── Render an activity row (used in list) ────────────────────────────────────
  const renderActivityRow = (activity: Activity) => (
    <div
      key={activity.id}
      className={cn(
        'p-3 rounded-lg border transition-colors cursor-pointer',
        activity.status === 'completed'
          ? 'border-status-resolved/30 bg-status-resolved/5 hover:bg-status-resolved/10'
          : activity.status === 'cancelled'
            ? 'border-border bg-muted/20 opacity-60 hover:opacity-80'
            : 'border-border bg-muted/30 hover:bg-muted/50',
      )}
      onClick={() => setDetailActivity(activity)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className={cn(
              'p-2 rounded-lg shrink-0',
              activity.status === 'completed'
                ? 'bg-status-resolved/10 text-status-resolved'
                : activity.status === 'cancelled'
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-primary/10 text-primary',
            )}
          >
            {activityTypeIcons[activity.type] || <MessageSquare className="w-4 h-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={cn('font-medium text-sm truncate', activity.status === 'cancelled' && 'line-through')}>
                {activity.title}
              </p>
              <Badge variant="outline" className={cn('text-xs shrink-0', statusColors[activity.status])}>
                {statusLabels[activity.status]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activityTypeLabels[activity.type] || activity.type} · {formatDateFr(activity.scheduledDate)}
            </p>
            {activity.attachmentName && (
              <div className="flex items-center gap-1 mt-1">
                <Paperclip className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{activity.attachmentName}</span>
              </div>
            )}
          </div>
        </div>
        {canManage && activity.status === 'planned' && (
          <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-status-resolved hover:text-status-resolved"
              onClick={() => openCompleteDialog(activity)}
              title="Marquer comme terminée"
            >
              <CheckCircle2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground"
              onClick={() => handleCancelActivity(activity.id)}
              title="Annuler"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-card rounded-xl border shadow-card">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Suivi des activités</h3>
          <Badge variant="secondary">{isLoading ? '…' : activities.length}</Badge>
        </div>

        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nouvelle activité</DialogTitle>
                <DialogDescription>
                  Planifiez une nouvelle activité pour cette requête
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div>
                  <Label className="mb-2 block">Type d'activité</Label>
                  <Select
                    value={newActivity.type}
                    onValueChange={(value) => {
                      setNewActivity({ ...newActivity, type: value });
                      setDynamicFields({});
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="act-title">Titre *</Label>
                  <Input
                    id="act-title"
                    value={newActivity.title}
                    onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                    placeholder="Ex: Appel avec M. Diop"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="act-desc">Description</Label>
                  <Textarea
                    id="act-desc"
                    value={newActivity.description}
                    onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                    placeholder="Détails de l'activité..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="act-date">Date prévue *</Label>
                  <Input
                    id="act-date"
                    type="datetime-local"
                    value={newActivity.scheduledDate}
                    onChange={(e) => setNewActivity({ ...newActivity, scheduledDate: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="act-hr">Contact</Label>
                  <Input
                    id="act-hr"
                    value={newActivity.hrName}
                    onChange={(e) => setNewActivity({ ...newActivity, hrName: e.target.value })}
                    placeholder="Nom du contact (ex : M. Diop)"
                    className="mt-1"
                  />
                </div>

                {/* Dynamic fields based on selected activity type */}
                {selectedTypeConfig.length > 0 && (
                  <>
                    <Separator />
                    <p className="text-xs font-medium text-muted-foreground">Champs spécifiques</p>
                    {selectedTypeConfig.map((field: ActivityTypeFieldConfig) => (
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
                            <Label htmlFor={`dyn-${field.name}`} className="text-sm font-normal">
                              {field.label}
                            </Label>
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
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddActivity} disabled={createMutation.isPending}>
                    Planifier l'activité
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Complete activity dialog */}
      <Dialog open={isCompletingActivity} onOpenChange={setIsCompletingActivity}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marquer comme terminée</DialogTitle>
            <DialogDescription>{selectedActivity?.title}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="complete-comment">Commentaire / Compte-rendu *</Label>
              <Textarea
                id="complete-comment"
                value={completeForm.comment}
                onChange={(e) => setCompleteForm({ ...completeForm, comment: e.target.value })}
                placeholder="Résumé de l'activité, résultats obtenus..."
                className="mt-1 min-h-[100px]"
              />
            </div>

            <div>
              <Label htmlFor="complete-file">Pièce jointe (compte-rendu)</Label>
              <div className="mt-1 flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                />
                <Input
                  id="complete-file"
                  value={completeForm.attachmentName}
                  readOnly
                  placeholder="Aucun fichier sélectionné"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
              {selectedFile && (
                <p className="text-xs text-status-resolved mt-1">
                  Fichier sélectionné: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} Ko)
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCompletingActivity(false);
                  setSelectedFile(null);
                  setCompleteForm({ comment: '', attachmentName: '' });
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleCompleteActivity}
                disabled={!completeForm.comment.trim() || updateMutation.isPending || uploadMutation.isPending}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {uploadMutation.isPending ? 'Téléversement...' : 'Confirmer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activity detail popup */}
      <Dialog open={!!detailActivity} onOpenChange={(open) => { if (!open) setDetailActivity(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              {detailActivity && (activityTypeIcons[detailActivity.type] || <MessageSquare className="w-4 h-4" />)}
              {detailActivity?.title}
            </DialogTitle>
            <DialogDescription>
              {detailActivity && (activityTypeLabels[detailActivity.type] || detailActivity.type)}
            </DialogDescription>
          </DialogHeader>
          {detailActivity && (
            <ScrollArea className="max-h-[70vh]">
              <div className="p-4 pt-0 space-y-4">
                {/* Status badge */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={statusColors[detailActivity.status]}>
                    {statusLabels[detailActivity.status]}
                  </Badge>
                  {(detailActivity.activityTypeLabel) && (
                    <Badge variant="secondary" className="text-xs">
                      {detailActivity.activityTypeLabel}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    par {detailActivity.createdBy}
                  </span>
                </div>

                <Separator />

                {/* Dates */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Prévu le :</span>
                    <span className="font-medium">{formatDateFr(detailActivity.scheduledDate)}</span>
                  </div>
                  {detailActivity.completedDate && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-status-resolved" />
                      <span className="text-muted-foreground">Réalisé le :</span>
                      <span className="font-medium">{formatDateFr(detailActivity.completedDate)}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {detailActivity.description && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                      <p className="text-sm">{detailActivity.description}</p>
                    </div>
                  </>
                )}

                {/* Champs dynamiques du modèle d'activité */}
                {detailActivity.extraData && Object.keys(detailActivity.extraData).length > 0 && (() => {
                  const typeFields = apiActivityTypes.find(
                    (at: ApiActivityType) => at.id === detailActivity.activityTypeId
                  )?.fields_config ?? [];
                  return (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Champs du modèle</p>
                        {Object.entries(detailActivity.extraData).map(([key, value]) => {
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
                            <div key={key} className="grid grid-cols-[160px_1fr] gap-2 text-sm">
                              <span className="text-muted-foreground text-xs font-medium">{label}</span>
                              <span className="text-sm break-words">{displayValue}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}

                {/* Compte-rendu */}
                {detailActivity.comment && (
                  <>
                    <Separator />
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Compte-rendu</p>
                      <p className="text-sm">{detailActivity.comment}</p>
                    </div>
                  </>
                )}

                {/* Attachment with preview/download/share */}
                {detailActivity.attachmentName && detailActivity.attachmentUrl && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Pièce jointe</p>
                      <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
                        <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate flex-1">{detailActivity.attachmentName}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button variant="outline" size="sm" onClick={() => authenticatedOpen(detailActivity.attachmentUrl!)}>
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Aperçu
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => authenticatedDownload(detailActivity.attachmentUrl!, detailActivity.attachmentName || 'piece-jointe')}>
                            <Download className="w-3.5 h-3.5 mr-1" />
                            Télécharger
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(detailActivity.attachmentUrl!);
                            toast({ title: 'Lien copié' });
                          }}
                        >
                          <Share2 className="w-3.5 h-3.5 mr-1" />
                          Partager
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Actions */}
                {canManage && (
                  <div className="flex flex-wrap gap-2">
                    {detailActivity.status === 'planned' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => openCompleteDialog(detailActivity, true)}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Marquer comme fait
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            handleCancelActivity(detailActivity.id);
                            setDetailActivity(null);
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Annuler
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        handleDeleteActivity(detailActivity.id);
                        setDetailActivity(null);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Supprimer
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Activities list */}
      <div className="p-4 space-y-2">
        {activities.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">Aucune activité planifiée</p>
        ) : (
          <>
            {visibleActivities.map(renderActivityRow)}

            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-1"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    Voir moins
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    Voir tout ({activities.length})
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
