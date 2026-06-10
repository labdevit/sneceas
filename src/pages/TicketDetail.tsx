import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  MessageSquare,
  Paperclip,
  Send,
  User,
  Users,
  FileText,
  CheckCircle2,
  Tag,
  AlertTriangle,
  Loader2,
  Download,
  Eye,
  Share2,
  History,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Zap,
  Edit2,
  Layers,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ActivityTracker } from '@/components/tickets/ActivityTracker';
import { ClosingReport } from '@/components/tickets/ClosingReport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { UrgencyBadge } from '@/components/ui/UrgencyBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { authenticatedDownload, resolveFileUrl } from '@/lib/api';
import { fetchTicket, updateTicket, type ApiTicket } from '@/lib/api/tickets';
import { fetchUsers } from '@/lib/api/users';
import { fetchConversations, createConversation } from '@/lib/api/conversations';
import { fetchTicketHRInteractions } from '@/lib/api/hr';
import { fetchDocuments, uploadDocument, deleteDocument, updateDocument } from '@/lib/api/documents';
import { fetchAuditLogs, type ApiAuditLog } from '@/lib/api/reports';
import DocumentShareDialog from '@/components/documents/DocumentShareDialog';
import DocumentPreviewDialog from '@/components/documents/DocumentPreviewDialog';
import { fetchQuickActions, type ApiQuickAction } from '@/lib/api/quickActions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fetchPoles } from '@/lib/api/poles';
import { fetchDelegates } from '@/lib/api/delegates';
import { useTicketMeta } from '@/hooks/useTicketMeta';
import { urgencyLabels } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useAcl } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Labels humains par défaut pour les codes de statut connus (référence snecea_idy)
const DEFAULT_STATUS_LABELS: Record<string, string> = {
  new: 'Nouveau',
  info_needed: "Besoin d'infos",
  processing: 'En traitement',
  hr_escalated: 'Escaladé RH',
  hr_pending: 'En attente RH',
  resolved: 'Résolu',
  non_resolu: 'Non résolu',
  closed: 'Clôturé',
  open: 'Ouvert',
  pending: 'En attente',
  in_progress: 'En cours',
  done: 'Terminé',
  cancelled: 'Annulé',
};

const urgencyLevels = Object.entries(urgencyLabels) as [string, string][];

// ── Followers panel for internal tickets ────────────────────────────
function FollowersPanel({
  ticket,
  canEdit,
  onSaved,
}: {
  ticket: ApiTicket;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => fetchUsers(),
    staleTime: 5 * 60 * 1000,
    enabled: addDialogOpen,
  });

  async function handleAdd() {
    if (!selectedId) return;
    setSaving(true);
    try {
      const newIds = [...ticket.follower_users, Number(selectedId)];
      await updateTicket(ticket.id, { follower_users: newIds });
      onSaved();
      setAddDialogOpen(false);
      setSelectedId('');
    } catch {
      toast({ title: 'Erreur', description: "Impossible d'ajouter le suiveur.", variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveUser(userId: number) {
    try {
      const newIds = ticket.follower_users.filter((id) => id !== userId);
      await updateTicket(ticket.id, { follower_users: newIds });
      onSaved();
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de retirer le suiveur.', variant: 'destructive' });
    }
  }

  async function handleRemovePole(poleId: string) {
    try {
      const newIds = ticket.follower_poles.filter((id) => id !== poleId);
      await updateTicket(ticket.id, { follower_poles: newIds });
      onSaved();
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de retirer le pôle suiveur.', variant: 'destructive' });
    }
  }

  return (
    <div className="bg-card rounded-xl border shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Suiveurs</h3>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Ajouter
          </Button>
        )}
      </div>

      {ticket.follower_user_names.length === 0 && ticket.follower_pole_names.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">Aucun suiveur</p>
      ) : (
        <div className="space-y-3">
          {ticket.follower_user_names.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Utilisateurs</p>
              <div className="space-y-1.5">
                {ticket.follower_user_names.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{u.name || u.username}</span>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => handleRemoveUser(u.id)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        title="Retirer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {ticket.follower_pole_names.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Pôles</p>
              <div className="space-y-1.5">
                {ticket.follower_pole_names.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{p.name}</span>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => handleRemovePole(p.id)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        title="Retirer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={addDialogOpen} onOpenChange={(open) => { if (!open) { setAddDialogOpen(false); setSelectedId(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un utilisateur suiveur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un utilisateur" />
              </SelectTrigger>
              <SelectContent>
                {allUsers
                  .filter((u) => !ticket.follower_users.includes(u.id))
                  .map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name || u.username}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={saving}>Annuler</Button>
              <Button onClick={handleAdd} disabled={!selectedId || saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Ajouter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TicketDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const { can } = useAcl();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canClassify = can('ticket_classify');

  const { types, statuses, statusCode, statusLabel } = useTicketMeta();

  // Fetch ticket
  const { data: ticket, isLoading: ticketLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => fetchTicket(id!),
    enabled: !!id,
  });

  // Fetch conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', id],
    queryFn: () => fetchConversations(id!),
    enabled: !!id,
  });

  // Fetch HR interactions
  const { data: hrInteractions = [] } = useQuery({
    queryKey: ['interactions', id],
    queryFn: () => fetchTicketHRInteractions(id!),
    enabled: !!id,
  });

  // Fetch documents linked to this ticket
  const { data: documents = [] } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => fetchDocuments({ ticket: id! }),
    enabled: !!id,
    staleTime: 30 * 1000,
  });

  // Fetch audit logs for this ticket (ticket events + activity events)
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['audit-logs', id],
    queryFn: () => fetchAuditLogs({ ticket_id: id!, page_size: '1000' }),
    enabled: !!id,
    staleTime: 30 * 1000,
  });

  // Fetch poles and delegates for classification
  const { data: poles = [] } = useQuery({
    queryKey: ['poles'],
    queryFn: () => fetchPoles(),
    enabled: canClassify,
    staleTime: 5 * 60 * 1000,
  });

  const { data: delegatesList = [] } = useQuery({
    queryKey: ['delegates'],
    queryFn: () => fetchDelegates({ page_size: '1000' }),
    enabled: canClassify,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch quick actions for ticket's pole
  const { data: quickActions = [] } = useQuery<ApiQuickAction[]>({
    queryKey: ['quick-actions', ticket?.pole],
    queryFn: () => fetchQuickActions({ pole: ticket!.pole! }),
    enabled: !!ticket?.pole && canClassify,
    staleTime: 5 * 60 * 1000,
  });

  const [newMessage, setNewMessage] = useState('');
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [shareDocId, setShareDocId] = useState<string | null>(null);
  const [shareDocName, setShareDocName] = useState('');
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string } | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [showAllDocs, setShowAllDocs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSuperAdmin = user?.is_superuser ?? false;

  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadDocName, setUploadDocName] = useState('');
  const [uploadDocType, setUploadDocType] = useState<string>('other');

  // Edit document dialog state
  const [editingDoc, setEditingDoc] = useState<{ id: string; name: string; doc_type: string } | null>(null);
  const [isSavingDoc, setIsSavingDoc] = useState(false);

  // Classification state
  const [classification, setClassification] = useState({
    type: '',
    urgency: '',
    poleId: '',
    delegateId: '',
  });
  const [isClassifying, setIsClassifying] = useState(false);

  // Sort statuses by order for timeline
  const sortedStatuses = [...statuses].sort((a, b) => a.order - b.order);

  // Build timeline steps based on ticket type
  const currentCode = statuses.find(s => s.id === ticket?.status)?.code ?? '';
  const timelineSteps = useMemo(() => {
    if (ticket?.model_ticket === 'interne') {
      // Tickets internes : 3 étapes fixes new → in_progress → done
      const codes = ['new', 'in_progress', 'done'];
      const filtered = codes
        .map(code => sortedStatuses.find(s => s.code === code))
        .filter(Boolean) as typeof sortedStatuses;
      if (filtered.length < 3 && sortedStatuses.length >= 3) {
        const mid = Math.floor((sortedStatuses.length - 1) / 2);
        return [sortedStatuses[0], sortedStatuses[mid], sortedStatuses[sortedStatuses.length - 1]].filter(Boolean);
      }
      return filtered;
    }
    // Tickets RH : flux complet new → processing → hr_escalated → (resolved|non_resolu) → closed
    const mainCodes = ['new', 'processing', 'hr_escalated'];
    const isNonResolu = currentCode === 'non_resolu' || currentCode === 'closed';
    const endCodes = isNonResolu ? ['non_resolu', 'closed'] : ['resolved', 'closed'];
    return [...mainCodes, ...endCodes]
      .map(code => sortedStatuses.find(s => s.code === code))
      .filter(Boolean) as typeof sortedStatuses;
  }, [sortedStatuses, currentCode, ticket?.model_ticket]);

  // Initialize classification when ticket loads
  useEffect(() => {
    if (!ticket) return;
    setClassification({
      type: ticket.ticket_type ?? '',
      urgency: ticket.urgency ?? '',
      poleId: ticket.pole ?? '',
      delegateId: ticket.delegate ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id]);

  if (ticketLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Requête non trouvée</p>
        <Button variant="link" asChild className="mt-2">
          <Link to="/tickets">Retour à la liste</Link>
        </Button>
      </div>
    );
  }

  const needsClassification = !ticket.ticket_type || !ticket.urgency;

  const isInternal = ticket.model_ticket === 'interne';
  const isFollower = isInternal && (ticket.follower_users?.includes(user?.id ?? -1) ?? false);

  // Pôle principal de l'utilisateur (depuis ses rôles)
  const userPoleId = user?.roles?.find((r: { pole_id: string | null }) => r.pole_id)?.pole_id ?? null;
  // L'utilisateur appartient au pôle du ticket (ou est admin, ou le ticket n'a pas de pôle assigné)
  const isOwnPole = !ticket.pole || ticket.pole === userPoleId || canClassify;

  // Peut modifier : admin toujours ; membre du même pôle si non-suiveur
  const canEditThisTicket = isInternal
    ? !isFollower && (canClassify || isOwnPole)
    : canClassify;

  // Peut voir la vue complète (activités, suiveurs, historique) :
  // admin, même pôle, ou suiveur direct → oui ; autre pôle → lecture partielle seulement
  const canSeeFullView = !isInternal || canClassify || isOwnPole || isFollower;

  const internalStatusCodes = ['new', 'in_progress', 'done'];
  const statusesForChange = isInternal
    ? sortedStatuses.filter(s => internalStatusCodes.includes(s.code)).length > 0
      ? sortedStatuses.filter(s => internalStatusCodes.includes(s.code))
      : sortedStatuses
    : sortedStatuses;

  const handleSendMessage = async () => {
    if (newMessage.trim() && ticket) {
      try {
        await createConversation({
          ticket: ticket.id,
          message: newMessage.trim(),
        });
        setNewMessage('');
        queryClient.invalidateQueries({ queryKey: ['conversations', id] });
      } catch (error: any) {
        toast({
          title: 'Erreur',
          description: error.message || 'Impossible d\'envoyer le message.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSaveClassification = async () => {
    if (!ticket) return;
    setIsClassifying(true);
    try {
      const payload: Record<string, unknown> = {};
      if (classification.type) payload.ticket_type = classification.type;
      if (classification.urgency) payload.urgency = classification.urgency;
      if (classification.poleId) payload.pole = classification.poleId;
      if (classification.delegateId) payload.delegate = classification.delegateId;

      await updateTicket(ticket.id, payload as any);

      toast({
        title: 'Classification enregistrée',
        description: 'Le type et l\'urgence ont été mis à jour avec succès.',
      });

      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de sauvegarder la classification.',
        variant: 'destructive',
      });
    } finally {
      setIsClassifying(false);
    }
  };

  const handleChangeStatus = async (newStatusId: string) => {
    if (!ticket || isChangingStatus || newStatusId === ticket.status) return;
    setIsChangingStatus(true);
    try {
      await updateTicket(ticket.id, { status: newStatusId });
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast({
        title: 'Statut mis à jour',
        description: statusLabel(newStatusId),
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier le statut.',
        variant: 'destructive',
      });
    } finally {
      setIsChangingStatus(false);
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('fr-FR');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to={isInternal ? '/internal-tickets' : '/tickets'} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          {isInternal ? 'Retour aux activités internes' : 'Retour aux requêtes'}
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary card */}
          <div className="bg-card rounded-xl border shadow-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-mono text-muted-foreground">
                    {ticket.reference}
                  </span>
                  <Badge variant="outline">{ticket.ticket_type_label}</Badge>
                </div>
                <h1 className="text-xl font-bold">{ticket.subject}</h1>
              </div>
              <div className="flex items-center gap-3">
                {!isInternal && <UrgencyBadge urgency={ticket.urgency} />}
                <StatusBadge status={statusCode(ticket.status)} />
              </div>
            </div>

            <Separator className="my-6" />

            {/* Timeline */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-4">Progression du dossier</h3>
              <div className="relative">
                {(() => {
                  const rawIdx = timelineSteps.findIndex(s => s.id === ticket.status);
                  // Pour les tickets internes, les statuts terminaux pointent sur la dernière étape
                  const isTerminal = ['done', 'resolved', 'non_resolu', 'closed'].includes(currentCode);
                  const currentIdx = rawIdx === -1 && isInternal && isTerminal
                    ? timelineSteps.length - 1
                    : rawIdx;
                  return (
                    <>
                      <div className="flex justify-between">
                        {timelineSteps.map((statusObj, index) => {
                          const isCompleted = index <= currentIdx;
                          const isCurrent = index === currentIdx;
                          return (
                            <div key={statusObj.id} className="flex flex-col items-center flex-1">
                              <div
                                className={cn(
                                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium z-10',
                                  isCompleted
                                    ? 'bg-status-resolved text-status-resolved-foreground'
                                    : 'bg-muted text-muted-foreground',
                                  isCurrent && 'ring-4 ring-status-resolved/20'
                                )}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 inline-block" />
                                )}
                              </div>
                              <span
                                className={cn(
                                  'text-xs mt-2 text-center',
                                  isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'
                                )}
                              >
                                {DEFAULT_STATUS_LABELS[statusObj.code] || statusObj.label || statusObj.code}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Progress line */}
                      <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted -z-0">
                        <div
                          className="h-full bg-status-resolved transition-all duration-500"
                          style={{
                            width: `${timelineSteps.length > 1 ? (Math.max(0, currentIdx) / (timelineSteps.length - 1)) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Description</h3>
              <p className="text-muted-foreground leading-relaxed">
                {ticket.description}
              </p>
            </div>

            {/* Attachments - placeholder for file API */}
          </div>

          {/* Activity Tracker — masqué pour les membres d'un autre pôle sur tickets internes */}
          {canSeeFullView && (
            <ActivityTracker
              ticketId={ticket.id}
              ticketReference={ticket.reference}
              ticketSubject={ticket.subject}
              recipientEmail=""
              recipientName={ticket.worker_name || ''}
              canManage={isInternal ? canEditThisTicket : canClassify}
              poleId={ticket.pole || undefined}
            />
          )}

          {/* Compte-rendu de clôture – visible quand le statut est terminal */}
          {sortedStatuses.find(s => s.id === ticket.status)?.is_terminal && (
            <ClosingReport
              ticketId={ticket.id}
              closingReport={(ticket as any).closing_report ?? null}
              closedAt={(ticket as any).closed_at ?? null}
            />
          )}

          {/* Échanges – masqué pour l'instant
          <div className="bg-card rounded-xl border shadow-card">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold">Échanges</h3>
              <Badge variant="secondary" className="ml-auto">
                {conversations.length}
              </Badge>
            </div>

            <ScrollArea className="h-80">
              <div className="p-4 space-y-4">
                {conversations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun message pour le moment
                  </p>
                ) : (
                  conversations.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex gap-3',
                        msg.author === user?.id && 'flex-row-reverse'
                      )}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div
                        className={cn(
                          'flex-1 max-w-[80%]',
                          msg.author === user?.id && 'text-right'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {msg.author_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleDateString('fr-FR')}
                          </span>
                          {msg.internal_only && (
                            <Badge variant="outline" className="text-xs">
                              Interne
                            </Badge>
                          )}
                        </div>
                        <div
                          className={cn(
                            'p-3 rounded-lg',
                            msg.author === user?.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          )}
                        >
                          <p className="text-sm">{msg.message}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border">
              <div className="flex gap-3">
                <Textarea
                  placeholder="Écrire un message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              <div className="flex justify-between items-center mt-3">
                <Button variant="outline" size="sm">
                  <Paperclip className="w-4 h-4 mr-2" />
                  Joindre
                </Button>
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer
                </Button>
              </div>
            </div>
          </div>
          */}

          {/* Documents / Pièces jointes */}
          <div className="bg-card rounded-xl border shadow-card">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold">Pièces jointes</h3>
              <Badge variant="secondary" className="ml-auto">
                {documents.length}
              </Badge>
            </div>
            <div className="p-4 space-y-2">
              {documents.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune pièce jointe</p>
              )}
              {(showAllDocs ? documents : documents.slice(0, 3)).map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 rounded-lg border hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-sm font-medium truncate">
                      {doc.name || doc.template_name || 'Document'}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {doc.doc_type && doc.doc_type !== 'other' && (
                        <Badge variant="outline" className="text-xs capitalize">{doc.doc_type}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(doc.generated_at || doc.created_at)}
                      </span>
                    </div>
                  </div>
                  {doc.ticket_reference && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {doc.ticket_reference}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const raw = doc.preview_url || doc.file_url || doc.file;
                        const url = raw ? resolveFileUrl(raw) : null;
                        if (url) setPreviewDoc({ url, name: doc.template_name || 'Document' });
                      }}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Aperçu
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => authenticatedDownload(resolveFileUrl(doc.file_url || doc.file || ''), doc.name || doc.template_name || 'document')}
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Télécharger
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShareDocId(doc.id);
                        setShareDocName(doc.template_name || 'Document');
                      }}
                    >
                      <Share2 className="w-3.5 h-3.5 mr-1" />
                      Partager
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingDoc({ id: doc.id, name: doc.name || doc.template_name || '', doc_type: doc.doc_type || 'other' })}
                      title="Modifier le nom / type"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    {isSuperAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 ml-auto"
                        disabled={deletingDocId === doc.id}
                        onClick={async () => {
                          if (!confirm('Supprimer cette pièce jointe ?')) return;
                          setDeletingDocId(doc.id);
                          try {
                            await deleteDocument(doc.id);
                            queryClient.invalidateQueries({ queryKey: ['documents', id] });
                            toast({ title: 'Pièce jointe supprimée' });
                          } catch (error: any) {
                            toast({ title: 'Erreur', description: error.message || 'Impossible de supprimer.', variant: 'destructive' });
                          } finally {
                            setDeletingDocId(null);
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {documents.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowAllDocs(!showAllDocs)}
                >
                  {showAllDocs ? (
                    <><ChevronUp className="w-4 h-4 mr-1" /> Voir moins</>
                  ) : (
                    <><ChevronDown className="w-4 h-4 mr-1" /> Voir tout ({documents.length})</>
                  )}
                </Button>
              )}

              {/* Ajouter une pièce jointe */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  setPendingFile(file);
                  setUploadDocName(file.name.replace(/\.[^/.]+$/, ''));
                  setUploadDocType('other');
                  setUploadDialogOpen(true);
                }}
              />
              <Button
                variant="outline"
                className="w-full mt-2"
                disabled={isUploadingDoc}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploadingDoc ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Envoi en cours...</>
                ) : (
                  <><Plus className="w-4 h-4 mr-2" /> Ajouter une pièce jointe</>
                )}
              </Button>
            </div>
          </div>

          {/* Upload document dialog */}
          <Dialog open={uploadDialogOpen} onOpenChange={(open) => { if (!open) { setUploadDialogOpen(false); setPendingFile(null); } }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter une pièce jointe</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label className="mb-2 block">Nom du document</Label>
                  <Input
                    value={uploadDocName}
                    onChange={(e) => setUploadDocName(e.target.value)}
                    placeholder="Nom du document"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Type de document</Label>
                  <Select value={uploadDocType} onValueChange={setUploadDocType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pv">Procès-verbal</SelectItem>
                      <SelectItem value="convocation">Convocation</SelectItem>
                      <SelectItem value="cr">Compte-rendu</SelectItem>
                      <SelectItem value="lettre">Lettre</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {pendingFile && (
                  <p className="text-xs text-muted-foreground">Fichier : {pendingFile.name} ({(pendingFile.size / 1024).toFixed(1)} Ko)</p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setUploadDialogOpen(false); setPendingFile(null); }}>
                    Annuler
                  </Button>
                  <Button
                    disabled={isUploadingDoc || !uploadDocName.trim()}
                    onClick={async () => {
                      if (!pendingFile || !ticket) return;
                      setIsUploadingDoc(true);
                      try {
                        const form = new FormData();
                        form.append('file', pendingFile);
                        form.append('ticket', ticket.id);
                        form.append('name', uploadDocName.trim());
                        form.append('doc_type', uploadDocType);
                        await uploadDocument(form);
                        queryClient.invalidateQueries({ queryKey: ['documents', id] });
                        toast({ title: 'Pièce jointe ajoutée', description: uploadDocName });
                        setUploadDialogOpen(false);
                        setPendingFile(null);
                      } catch (error: any) {
                        toast({ title: 'Erreur', description: error.message || "Impossible d'ajouter la pièce jointe.", variant: 'destructive' });
                      } finally {
                        setIsUploadingDoc(false);
                      }
                    }}
                  >
                    {isUploadingDoc ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi...</> : 'Ajouter'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit document dialog */}
          <Dialog open={!!editingDoc} onOpenChange={(open) => { if (!open) setEditingDoc(null); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifier le document</DialogTitle>
              </DialogHeader>
              {editingDoc && (
                <div className="space-y-4 mt-2">
                  <div>
                    <Label className="mb-2 block">Nom du document</Label>
                    <Input
                      value={editingDoc.name}
                      onChange={(e) => setEditingDoc({ ...editingDoc, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">Type de document</Label>
                    <Select value={editingDoc.doc_type} onValueChange={(v) => setEditingDoc({ ...editingDoc, doc_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pv">Procès-verbal</SelectItem>
                        <SelectItem value="convocation">Convocation</SelectItem>
                        <SelectItem value="cr">Compte-rendu</SelectItem>
                        <SelectItem value="lettre">Lettre</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setEditingDoc(null)}>
                      Annuler
                    </Button>
                    <Button
                      disabled={isSavingDoc}
                      onClick={async () => {
                        setIsSavingDoc(true);
                        try {
                          await updateDocument(editingDoc.id, { name: editingDoc.name.trim(), doc_type: editingDoc.doc_type });
                          queryClient.invalidateQueries({ queryKey: ['documents', id] });
                          toast({ title: 'Document mis à jour' });
                          setEditingDoc(null);
                        } catch (error: any) {
                          toast({ title: 'Erreur', description: error.message || 'Impossible de mettre à jour.', variant: 'destructive' });
                        } finally {
                          setIsSavingDoc(false);
                        }
                      }}
                    >
                      {isSavingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Historique des changements */}
          <div className="bg-card rounded-xl border shadow-card">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <History className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold">Historique</h3>
              {auditLogs.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {auditLogs.length}
                </Badge>
              )}
            </div>
            {auditLogs.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Aucune action enregistrée pour le moment.
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="p-4 space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{log.username || 'Système'}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {new Date(log.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {log.action === 'create' && 'Création de la requête'}
                          {log.action === 'update' && (
                            <>
                              Mise à jour
                              {log.payload && Object.keys(log.payload).length > 0 && (
                                <span className="ml-1">
                                  ({Object.entries(log.payload).map(([field, val]: [string, any], i) => (
                                    <span key={field}>
                                      {i > 0 && ', '}
                                      {field.replace(/_id$/, '')}{val?.from ? ` : ${val.from} → ${val.to}` : ''}
                                    </span>
                                  ))})
                                </span>
                              )}
                            </>
                          )}
                          {log.action === 'status_change' && `Changement de statut${log.payload?.from ? ` : ${log.payload.from} → ${log.payload.to}` : ''}`}
                          {log.action === 'delete' && 'Suppression'}
                          {!['create', 'update', 'status_change', 'delete'].includes(log.action) && log.action}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Preview dialog */}
          <DocumentPreviewDialog
            open={!!previewDoc}
            onOpenChange={(open) => { if (!open) setPreviewDoc(null); }}
            previewUrl={previewDoc?.url ?? null}
            title={previewDoc?.name ?? 'Document'}
          />

          {/* Share dialog */}
          <DocumentShareDialog
            open={!!shareDocId}
            onOpenChange={(open) => { if (!open) setShareDocId(null); }}
            documentId={shareDocId ?? ''}
            documentName={shareDocName}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Classification Panel - Only for RH tickets */}
          {canClassify && !isInternal && (
            <div className={cn(
              "bg-card rounded-xl border shadow-card p-6",
              needsClassification && "ring-2 ring-urgency-medium"
            )}>
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Classification</h3>
                {needsClassification && (
                  <Badge variant="outline" className="ml-auto text-urgency-medium border-urgency-medium">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    À classifier
                  </Badge>
                )}
              </div>

              <div className="space-y-4">
                {/* Type de requête — désactivé temporairement
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">Type de requête</Label>
                  <Select
                    value={classification.type}
                    onValueChange={(value) => setClassification({ ...classification, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent>
                      {types.map((tt) => (
                        <SelectItem key={tt.id} value={tt.id}>
                          {tt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                */}

                {/* Niveau d'urgence */}
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">Niveau d'urgence</Label>
                  <RadioGroup
                    value={classification.urgency}
                    onValueChange={(value) => setClassification({ ...classification, urgency: value })}
                    className="grid grid-cols-2 gap-2"
                  >
                    {urgencyLevels.map(([value, label]) => (
                      <div key={value}>
                        <RadioGroupItem
                          value={value}
                          id={`urgency-${value}`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`urgency-${value}`}
                          className={cn(
                            'flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-all text-sm',
                            'hover:bg-accent/50',
                            classification.urgency === value
                              ? value === 'critical' ? 'border-urgency-critical text-urgency-critical bg-urgency-critical/10'
                                : value === 'high' ? 'border-urgency-high text-urgency-high bg-urgency-high/10'
                                  : value === 'medium' ? 'border-urgency-medium text-urgency-medium bg-urgency-medium/10'
                                    : 'border-urgency-low text-urgency-low bg-urgency-low/10'
                              : 'border-border'
                          )}
                        >
                          {label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <Separator />

                {/* Pôle assigné */}
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">Pôle assigné</Label>
                  <Select
                    value={classification.poleId}
                    onValueChange={(value) => setClassification({ ...classification, poleId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assigner à un pôle" />
                    </SelectTrigger>
                    <SelectContent>
                      {poles.map((pole) => (
                        <SelectItem key={pole.id} value={pole.id}>
                          {pole.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Délégué assigné */}
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">Délégué assigné</Label>
                  <Select
                    value={classification.delegateId}
                    onValueChange={(value) => setClassification({ ...classification, delegateId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assigner à un délégué" />
                    </SelectTrigger>
                    <SelectContent>
                      {delegatesList.filter((d) => d.id).map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full mt-2"
                  onClick={handleSaveClassification}
                  disabled={isClassifying || (!classification.type && !classification.urgency)}
                >
                  {isClassifying ? 'Enregistrement...' : 'Enregistrer la classification'}
                </Button>
              </div>
            </div>
          )}

          {/* Changer le statut */}
          {canEditThisTicket && (
            <div className="bg-card rounded-xl border shadow-card p-6">
              <h3 className="font-semibold mb-3">Changer le statut</h3>
              <Select
                value={ticket.status}
                onValueChange={handleChangeStatus}
                disabled={isChangingStatus}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusesForChange.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isChangingStatus && (
                <p className="text-xs text-muted-foreground mt-2">Mise à jour...</p>
              )}
            </div>
          )}

          {/* Quick Actions */}
          {canEditThisTicket && !isInternal && quickActions.length > 0 && (
            <div className="bg-card rounded-xl border shadow-card p-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Actions rapides</h3>
              </div>
              <div className="space-y-2">
                {quickActions.map((action) => (
                  <Button
                    key={action.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      if (action.action_type === 'status_change' && action.config?.target_status) {
                        handleChangeStatus(action.config.target_status as string);
                      } else {
                        toast({ title: action.label, description: action.description || 'Action exécutée.' });
                      }
                    }}
                  >
                    <Zap className="w-4 h-4 mr-2 shrink-0" />
                    <span className="truncate">{action.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Info card */}
          <div className="bg-card rounded-xl border shadow-card p-6 space-y-4">
            <h3 className="font-semibold">Informations</h3>

            <div className="space-y-3">
              {!isInternal && (
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Demandeur</p>
                    <p className="font-medium">{ticket.worker_name || '-'}</p>
                  </div>
                </div>
              )}

              {!isInternal && (
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Compagnie</p>
                    <p className="font-medium">{ticket.company_name}</p>
                  </div>
                </div>
              )}

              {ticket.pole_name && (
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Pôle assigné</p>
                    <p className="font-medium">{ticket.pole_name}</p>
                  </div>
                </div>
              )}

              {ticket.delegate_name && (
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Délégué</p>
                    <p className="font-medium">
                      {ticket.delegate_name}
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Créée le</p>
                  <p className="font-medium">
                    {new Date(ticket.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Dernière mise à jour</p>
                  <p className="font-medium">
                    {new Date(ticket.updated_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* HR Interactions – masqué pour l'instant
          {hrInteractions.length > 0 && (
            <div className="bg-card rounded-xl border shadow-card p-6">
              <h3 className="font-semibold mb-4">Interactions RH</h3>
              <div className="space-y-4">
                {hrInteractions.map((interaction) => (
                  <div
                    key={interaction.id}
                    className="p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {interaction.hr_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date((interaction.interaction_date || interaction.scheduled_for || interaction.created_at) as string).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {interaction.channel} · {interaction.status}
                    </p>
                    <p className="text-sm">{interaction.summary}</p>
                    {interaction.outcome && (
                      <p className="text-sm text-muted-foreground mt-1">Résultat: {interaction.outcome}</p>
                    )}
                    {interaction.notes && (
                      <p className="text-sm text-muted-foreground mt-1">Notes: {interaction.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          */}

          {/* Followers panel — tickets internes, vue complète uniquement */}
          {isInternal && canSeeFullView && (
            <FollowersPanel
              ticket={ticket}
              canEdit={canEditThisTicket}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ['ticket', id] })}
            />
          )}

          {/* Need more info alert */}
          {!isInternal && statusCode(ticket.status) === 'info_needed' && (
            <div className="bg-urgency-medium/10 border border-urgency-medium/30 rounded-xl p-4">
              <h4 className="font-semibold text-urgency-medium mb-2">
                Action requise
              </h4>
              <p className="text-sm">
                Le gestionnaire a besoin d'informations supplémentaires.
                Veuillez répondre au message ci-dessus.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
