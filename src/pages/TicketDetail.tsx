import { useEffect, useMemo, useRef, useState } from 'react';
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
  FileDown,
  CheckCircle2,
  Tag,
  AlertTriangle
} from 'lucide-react';
import { ActivityTracker } from '@/components/tickets/ActivityTracker';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { UrgencyBadge } from '@/components/ui/UrgencyBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ticketTypeLabels, urgencyLabels, statusLabels } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import type { TicketStatus, TicketType, TicketUrgency } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, downloadFile, getMediaUrl } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Zap } from 'lucide-react';

// Étapes de progression : 5 étapes de traitement + 1 étape de clôture (résolu OU non résolu, pas les deux)
const progressionStepKeys: TicketStatus[] = [
  'new',
  'info_needed',
  'processing',
  'hr_escalated',
  'hr_pending',
];
const CLOTURE_STATUSES: TicketStatus[] = ['resolved', 'non_resolu', 'closed'];
// Liste complète des statuts pour le sélecteur de changement de statut (API / Activity Tracker)
const allStatusesForChange: TicketStatus[] = [...progressionStepKeys, 'resolved', 'non_resolu', 'closed'];

const ticketTypes = Object.entries(ticketTypeLabels) as [TicketType, string][];
const urgencyLevels = Object.entries(urgencyLabels) as [TicketUrgency, string][];

type ApiTicket = {
  id: number;
  numero_reference: string;
  type_probleme: TicketType;
  priorite: TicketUrgency;
  statut: TicketStatus;
  titre: string;
  description: string;
  created_at: string;
  updated_at: string;
  travailleur: string | null;
  pole?: { id: number; nom: string } | null;
  entreprise?: { id: number; nom: string } | null;
  delegue_syndical?: string | null;
  delegue_syndical_id_read?: number | null;
  dossier?: string | null;
  dossier_id?: number | null;
  date_cloture?: string | null;
  compte_rendu?: string | null;
};

type ApiMaquetteCompteRendu = {
  id: number;
  nom: string;
  contenu: string;
  is_default: boolean;
  ordre: number;
};

type ApiPieceJointe = {
  id: number;
  fichier: string;
  description: string;
};

type ApiPole = { id: number; nom: string; description?: string | null };

type ApiDelegue = {
  id: number;
  user_first_name: string;
  user_last_name: string;
  entreprise?: { id: number; nom: string } | null;
};

type ApiProfile = {
  user_id_read: number;
  role: string;
};

type PoleActionItem = {
  id: string;
  label: string;
  description: string;
  required_fields: string[];
  optional_fields: string[];
};

type PoleActionsResponse = {
  actions: PoleActionItem[];
  allowed_transitions: string[];
};

type ApiRequeteMessage = {
  id: number;
  contenu: string;
  is_interne: boolean;
  created_at: string;
  auteur: string;
};

type ApiPoleMember = {
  id: number;
  user_id_read: number;
  user_first_name: string;
  user_last_name: string;
  user_email: string;
};

type TicketView = {
  id: string;
  reference: string;
  type: TicketType;
  urgency: TicketUrgency;
  status: TicketStatus;
  subject: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  companyName: string;
  poleId?: string;
  poleName?: string;
  delegateName?: string | null;
  requesterName?: string | null;
  dossierDisplay?: string | null;
  dateCloture?: string | null;
  compteRendu?: string | null;
};

export default function TicketDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<TicketView | null>(null);
  const [attachments, setAttachments] = useState<ApiPieceJointe[]>([]);
  const [poles, setPoles] = useState<ApiPole[]>([]);
  const [delegates, setDelegates] = useState<ApiDelegue[]>([]);
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messages, setMessages] = useState<ApiRequeteMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Classification state
  const [classification, setClassification] = useState({
    type: '' as TicketType | '',
    urgency: '' as TicketUrgency | '',
    poleId: '',
    delegateId: '',
  });
  const [isClassifying, setIsClassifying] = useState(false);

  // Actions du pôle (processeur métier)
  const [poleActions, setPoleActions] = useState<PoleActionItem[]>([]);
  const [allowedTransitions, setAllowedTransitions] = useState<string[]>([]);
  const [poleActionsLoading, setPoleActionsLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<PoleActionItem | null>(null);
  const [actionForm, setActionForm] = useState<Record<string, string>>({});
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [poleMembersForAssign, setPoleMembersForAssign] = useState<ApiPoleMember[]>([]);
  const [poleMembersLoading, setPoleMembersLoading] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [maquetteDefault, setMaquetteDefault] = useState<ApiMaquetteCompteRendu | null>(null);
  const [compteRenduForm, setCompteRenduForm] = useState({ dateCloture: '', compteRendu: '' });
  const [isSavingCompteRendu, setIsSavingCompteRendu] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const canClassify = useMemo(
    () =>
      profile?.role === 'member' ||
      profile?.role === 'delegate' ||
      profile?.role === 'admin' ||
      profile?.role === 'super_admin',
    [profile]
  );

  useEffect(() => {
    if (!id) {
      return;
    }
    const loadTicket = async () => {
      try {
        setIsLoading(true);
        const [ticketData, piecesData, polesData, delegatesData, profileData] = await Promise.all([
          apiRequest<ApiTicket>(`/requetes/${id}/`),
          apiRequest<ApiPieceJointe[] | { results: ApiPieceJointe[] }>(
            `/pieces-jointes/?requete=${id}`
          ),
          apiRequest<ApiPole[] | { results: ApiPole[] }>('/poles/'),
          apiRequest<ApiDelegue[] | { results: ApiDelegue[] }>('/delegues/'),
          apiRequest<ApiProfile>('/profils/me/'),
        ]);
        const piecesList = Array.isArray(piecesData) ? piecesData : piecesData.results ?? [];
        const polesList = Array.isArray(polesData) ? polesData : polesData.results ?? [];
        const delegatesList = Array.isArray(delegatesData)
          ? delegatesData
          : delegatesData.results ?? [];

        const mapped: TicketView = {
          id: String(ticketData.id),
          reference: ticketData.numero_reference,
          type: ticketData.type_probleme,
          urgency: ticketData.priorite,
          status: ticketData.statut,
          subject: ticketData.titre,
          description: ticketData.description,
          createdAt: ticketData.created_at,
          updatedAt: ticketData.updated_at,
          companyName: ticketData.entreprise?.nom ?? '-',
          poleId: ticketData.pole ? String(ticketData.pole.id) : undefined,
          poleName: ticketData.pole?.nom,
          delegateName: ticketData.delegue_syndical ?? null,
          requesterName: ticketData.travailleur ?? null,
          dossierDisplay: ticketData.dossier ?? null,
          dateCloture: ticketData.date_cloture ?? null,
          compteRendu: ticketData.compte_rendu ?? null,
        };

        setTicket(mapped);
        setAttachments(piecesList);
        setPoles(polesList);
        setDelegates(delegatesList);
        setProfile(profileData);
        setClassification({
          type: ticketData.type_probleme,
          urgency: ticketData.priorite,
          poleId: ticketData.pole ? String(ticketData.pole.id) : '',
          delegateId:
            ticketData.delegue_syndical_id_read != null
              ? String(ticketData.delegue_syndical_id_read)
              : '',
        });
        setErrorMessage(null);

        // Charger les actions métier du pôle (processeur)
        if (ticketData.pole) {
          setPoleActionsLoading(true);
          try {
            const poleActionsData = await apiRequest<PoleActionsResponse>(
              `/requetes/${id}/pole-actions/`
            );
            setPoleActions(poleActionsData.actions ?? []);
            setAllowedTransitions(poleActionsData.allowed_transitions ?? []);
          } catch {
            setPoleActions([]);
            setAllowedTransitions([]);
          } finally {
            setPoleActionsLoading(false);
          }
        } else {
          setPoleActions([]);
          setAllowedTransitions([]);
        }

        // Charger les messages (dont demandes d'information)
        try {
          const messagesData = await apiRequest<ApiRequeteMessage[]>(
            `/requetes/${id}/messages/`
          );
          setMessages(Array.isArray(messagesData) ? messagesData : []);
        } catch {
          setMessages([]);
        }
      } catch {
        setErrorMessage("Impossible de charger la requête.");
      } finally {
        setIsLoading(false);
      }
    };

    loadTicket();
  }, [id]);

  // Charger les responsables assignables (membres du pôle) quand on ouvre l'action "Assigner à un responsable"
  useEffect(() => {
    if (selectedAction?.id !== 'assign' || !ticket?.id) {
      setPoleMembersForAssign([]);
      return;
    }
    let cancelled = false;
    setPoleMembersLoading(true);
    apiRequest<ApiPoleMember[]>(`/requetes/${ticket.id}/assignable-members/`)
      .then((data) => {
        if (!cancelled) setPoleMembersForAssign(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setPoleMembersForAssign([]);
      })
      .finally(() => {
        if (!cancelled) setPoleMembersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAction?.id, ticket?.id]);

  // Charger la maquette par défaut quand la requête est clôturée (résolu, non résolu ou closed)
  const isCloture = ticket && ['resolved', 'non_resolu', 'closed'].includes(ticket.status);
  useEffect(() => {
    if (!isCloture) {
      setMaquetteDefault(null);
      return;
    }
    setCompteRenduForm({
      dateCloture: ticket?.dateCloture ?? '',
      compteRendu: ticket?.compteRendu ?? '',
    });
    apiRequest<ApiMaquetteCompteRendu[] | { results: ApiMaquetteCompteRendu[] }>(
      '/maquettes-compte-rendu/?is_default=true'
    )
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.results ?? [];
        setMaquetteDefault(list[0] ?? null);
      })
      .catch(() => setMaquetteDefault(null));
  }, [isCloture, ticket?.status, ticket?.dateCloture, ticket?.compteRendu]);

  // Check if ticket needs classification (no type or urgency)
  const needsClassification = ticket && (!ticket.type || !ticket.urgency);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (errorMessage || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">{errorMessage ?? 'Requête non trouvée'}</p>
        <Button variant="link" asChild className="mt-2">
          <Link to="/tickets">Retour à la liste</Link>
        </Button>
      </div>
    );
  }

  const currentStatusIndex = (() => {
    const i = progressionStepKeys.indexOf(ticket.status);
    if (i >= 0) return i;
    if (CLOTURE_STATUSES.includes(ticket.status)) return progressionStepKeys.length; // dernière étape = clôture
    return progressionStepKeys.length;
  })();
  const lastStepLabel =
    ticket.status === 'resolved'
      ? 'Résolu et clôture'
      : ticket.status === 'non_resolu'
        ? 'Non résolu et clôture'
        : ticket.status === 'closed'
          ? 'Clôturé'
          : 'Clôture (résolu / non résolu)';
  const progressionLabels = [
    ...progressionStepKeys.map((k) => statusLabels[k] ?? k),
    lastStepLabel,
  ];
  const totalSteps = progressionLabels.length;

  const handleSendMessage = async () => {
    const text = newMessage.trim();
    if (!text || !ticket || isSendingMessage) return;
    setIsSendingMessage(true);
    try {
      const created = await apiRequest<ApiRequeteMessage>(
        `/requetes/${ticket.id}/messages/`,
        { method: 'POST', body: JSON.stringify({ contenu: text }) }
      );
      setMessages((prev) => [...prev, created]);
      setNewMessage('');
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le message.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSaveCompteRendu = async () => {
    if (!ticket) return;
    setIsSavingCompteRendu(true);
    try {
      const body: Record<string, string> = {};
      if (compteRenduForm.dateCloture?.trim()) body.date_cloture = compteRenduForm.dateCloture.trim();
      if (compteRenduForm.compteRendu?.trim()) body.compte_rendu = compteRenduForm.compteRendu.trim();
      const updated = await apiRequest<ApiTicket>(`/requetes/${ticket.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setTicket((prev) => prev ? { ...prev, dateCloture: updated.date_cloture ?? undefined, compteRendu: updated.compte_rendu ?? undefined } : prev);
      setCompteRenduForm({ dateCloture: updated.date_cloture ?? '', compteRendu: updated.compte_rendu ?? '' });
      toast({ title: 'Compte rendu enregistré', description: 'Le compte rendu de clôture a été mis à jour.' });
    } catch {
      toast({ title: 'Erreur', description: "Impossible d'enregistrer le compte rendu.", variant: 'destructive' });
    } finally {
      setIsSavingCompteRendu(false);
    }
  };

  const handleDownloadCompteRenduPdf = async () => {
    if (!ticket) return;
    setIsDownloadingPdf(true);
    try {
      await downloadFile(
        `/requetes/${ticket.id}/compte-rendu-pdf/`,
        `compte-rendu-${ticket.reference}.pdf`
      );
      toast({ title: 'Téléchargement démarré', description: 'Le PDF du compte rendu a été téléchargé.' });
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err && err.data && typeof err.data === 'object' && 'detail' in (err.data as object)
          ? String((err.data as { detail: unknown }).detail)
          : "Impossible de télécharger le PDF.";
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleAttachClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !ticket) return;
    setIsUploadingAttachment(true);
    try {
      const form = new FormData();
      form.append('fichier', file);
      form.append('description', file.name);
      form.append('type_document', 'AUTRE');
      const created = await apiRequest<ApiPieceJointe>(
        `/requetes/${ticket.id}/pieces-jointes/`,
        { method: 'POST', body: form }
      );
      setAttachments((prev) => [...prev, created]);
      toast({ title: 'Pièce jointe ajoutée', description: file.name });
    } catch {
      toast({
        title: 'Erreur',
        description: "Impossible d'ajouter la pièce jointe.",
        variant: 'destructive',
      });
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleSaveClassification = async () => {
    const body: Record<string, number | string> = {};
    if (classification.type?.trim()) body.type_probleme = classification.type.trim();
    if (classification.urgency?.trim()) body.priorite = classification.urgency.trim();
    if (classification.poleId?.trim()) body.pole_id = Number(classification.poleId);
    if (classification.delegateId?.trim()) body.delegue_syndical_id = Number(classification.delegateId);
    if (Object.keys(body).length === 0) {
      toast({
        title: 'Aucune modification',
        description: 'Renseignez au moins un champ (type, urgence, pôle ou délégué).',
        variant: 'destructive',
      });
      return;
    }
    setIsClassifying(true);
    try {
      await apiRequest(`/requetes/${ticket.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      toast({
        title: 'Classification enregistrée',
        description: "Le type et l'urgence ont été mis à jour avec succès.",
      });
      const updated = await apiRequest<ApiTicket>(`/requetes/${ticket.id}/`);
      setTicket({
        id: String(updated.id),
        reference: updated.numero_reference,
        type: updated.type_probleme,
        urgency: updated.priorite,
        status: updated.statut,
        subject: updated.titre,
        description: updated.description,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
        companyName: updated.entreprise?.nom ?? '-',
        poleId: updated.pole ? String(updated.pole.id) : undefined,
        poleName: updated.pole?.nom,
        delegateName: updated.delegue_syndical ?? null,
        requesterName: updated.travailleur ?? null,
        dossierDisplay: updated.dossier ?? null,
        dateCloture: updated.date_cloture ?? null,
        compteRendu: updated.compte_rendu ?? null,
      });
      setClassification({
        type: updated.type_probleme,
        urgency: updated.priorite,
        poleId: updated.pole ? String(updated.pole.id) : '',
        delegateId:
          updated.delegue_syndical_id_read != null
            ? String(updated.delegue_syndical_id_read)
            : '',
      });
    } catch {
      toast({
        title: 'Erreur',
        description: "Impossible d'enregistrer la classification.",
        variant: 'destructive',
      });
    } finally {
      setIsClassifying(false);
    }
  };

  const openActionDialog = (action: PoleActionItem) => {
    setSelectedAction(action);
    const initial: Record<string, string> = {};
    [...action.required_fields, ...action.optional_fields].forEach((f) => {
      initial[f] = '';
    });
    setActionForm(initial);
  };

  const handleChangeStatus = async (newStatus: string) => {
    if (!ticket || isChangingStatus) return;
    setIsChangingStatus(true);
    try {
      const updated = await apiRequest<ApiTicket>(`/requetes/${ticket.id}/change-status/`, {
        method: 'POST',
        body: JSON.stringify({ statut: newStatus }),
      });
      setTicket({
        id: String(updated.id),
        reference: updated.numero_reference,
        type: updated.type_probleme,
        urgency: updated.priorite,
        status: updated.statut,
        subject: updated.titre,
        description: updated.description,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
        companyName: updated.entreprise?.nom ?? '-',
        poleId: updated.pole ? String(updated.pole.id) : undefined,
        poleName: updated.pole?.nom,
        delegateName: updated.delegue_syndical ?? null,
        requesterName: updated.travailleur ?? null,
        dossierDisplay: updated.dossier ?? null,
        dateCloture: updated.date_cloture ?? null,
        compteRendu: updated.compte_rendu ?? null,
      });
      toast({
        title: 'Statut mis à jour',
        description: statusLabels[newStatus as TicketStatus] ?? newStatus,
      });
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le statut.',
        variant: 'destructive',
      });
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleExecutePoleAction = async () => {
    if (!selectedAction || !ticket) return;
    const payload: Record<string, string> = { action_id: selectedAction.id };
    [...selectedAction.required_fields, ...selectedAction.optional_fields].forEach((key) => {
      const v = actionForm[key];
      if (v != null && v.trim() !== '') payload[key] = v.trim();
    });
    const missing = selectedAction.required_fields.filter((f) => !payload[f]?.trim());
    if (missing.length > 0) {
      toast({
        title: 'Champs requis',
        description: `Veuillez renseigner : ${missing.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }
    setIsExecutingAction(true);
    try {
      const result = await apiRequest<{ message?: string; data?: Record<string, unknown> }>(
        `/requetes/${ticket.id}/execute-pole-action/`,
        { method: 'POST', body: JSON.stringify(payload) }
      );
      toast({
        title: 'Action exécutée',
        description: result.message || selectedAction.label,
      });
      setSelectedAction(null);
      setActionForm({});
      // Recharger la requête pour mettre à jour l'affichage
      const ticketData = await apiRequest<ApiTicket>(`/requetes/${ticket.id}/`);
      setTicket({
        ...ticket,
        status: ticketData.statut as TicketStatus,
        updatedAt: ticketData.updated_at,
        dateCloture: ticketData.date_cloture ?? undefined,
        compteRendu: ticketData.compte_rendu ?? undefined,
      });
      const poleActionsData = await apiRequest<PoleActionsResponse>(
        `/requetes/${ticket.id}/pole-actions/`
      );
      setPoleActions(poleActionsData.actions ?? []);
      setAllowedTransitions(poleActionsData.allowed_transitions ?? []);
      // Recharger les messages (ex. nouvelle demande d'information)
      const messagesData = await apiRequest<ApiRequeteMessage[]>(
        `/requetes/${ticket.id}/messages/`
      );
      setMessages(Array.isArray(messagesData) ? messagesData : []);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err && err.data && typeof err.data === 'object' && 'detail' in err.data
          ? String((err.data as { detail: unknown }).detail)
          : "Impossible d'exécuter l'action.";
      toast({
        title: 'Erreur',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsExecutingAction(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/tickets" className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Retour aux requêtes
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
                  <Badge variant="outline">{ticketTypeLabels[ticket.type]}</Badge>
                </div>
                <h1 className="text-xl font-bold">{ticket.subject}</h1>
              </div>
              <div className="flex items-center gap-3">
                <UrgencyBadge urgency={ticket.urgency} />
                <StatusBadge status={ticket.status} />
              </div>
            </div>

            <Separator className="my-6" />

            {/* Timeline */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-4">Progression du dossier</h3>
              <div className="relative">
                <div className="flex justify-between">
                  {progressionLabels.map((label, index) => {
                    const isCompleted = index <= currentStatusIndex;
                    const isCurrent = index === currentStatusIndex;
                    const isClotureStep = index === totalSteps - 1;
                    const isNonResolu = isClotureStep && ticket.status === 'non_resolu';
                    return (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium z-10',
                            isCompleted
                              ? isNonResolu
                                ? 'bg-status-non-resolu text-status-non-resolu-foreground'
                                : 'bg-status-resolved text-status-resolved-foreground'
                              : 'bg-muted text-muted-foreground',
                            isCurrent && (isNonResolu ? 'ring-4 ring-status-non-resolu/20' : 'ring-4 ring-status-resolved/20')
                          )}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <span
                          className={cn(
                            'text-xs mt-2 text-center',
                            isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'
                          )}
                        >
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* Progress line */}
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted -z-0">
                  <div
                    className={cn(
                      'h-full transition-all duration-500',
                      ticket.status === 'non_resolu' && currentStatusIndex >= totalSteps - 1
                        ? 'bg-status-non-resolu'
                        : 'bg-status-resolved'
                    )}
                    style={{
                      width: `${(currentStatusIndex / (totalSteps - 1)) * 100}%`,
                    }}
                  />
                </div>
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

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold mb-3">Pièces jointes</h3>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file) => (
                    <Button
                      key={file.id}
                      variant="outline"
                      size="sm"
                      className="h-auto py-2"
                      asChild
                    >
                      <a
                        href={getMediaUrl(file.fichier)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center"
                      >
                        <Paperclip className="w-4 h-4 mr-2" />
                        {file.description || 'Pièce jointe'}
                      </a>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Activity Tracker - Only for delegates and pole managers */}
          {canClassify && (
            <ActivityTracker
              ticketId={ticket.id}
              poleId={ticket.poleId}
              ticketReference={ticket.reference}
              ticketSubject={ticket.subject}
              recipientName={ticket.requesterName ?? ''}
              canManage={canClassify}
            />
          )}

          {/* Messages */}
          <div className="bg-card rounded-xl border shadow-card">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold">Échanges</h3>
              <Badge variant="secondary" className="ml-auto">
                {messages.length}
              </Badge>
            </div>

            <ScrollArea className="h-80">
              <div className="p-4 space-y-4">
                {messages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun message pour le moment
                  </p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className="flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 max-w-[80%]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {message.auteur || 'Utilisateur'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="p-3 rounded-lg bg-muted">
                          <p className="text-sm whitespace-pre-wrap">{message.contenu}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Message input */}
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
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="*/*"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAttachClick}
                  disabled={isUploadingAttachment}
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  {isUploadingAttachment ? 'Envoi...' : 'Joindre'}
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSendingMessage}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSendingMessage ? 'Envoi...' : 'Envoyer'}
                </Button>
              </div>
            </div>
          </div>

          {/* Compte rendu de clôture - visible quand la requête est clôturée (résolu, non résolu ou closed) */}
          {isCloture && (
            <div className="bg-card rounded-xl border shadow-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold">Compte rendu de clôture</h3>
              </div>
              <div className="p-4 space-y-4">
                {maquetteDefault && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Maquette (référence)</Label>
                    <pre className="mt-1 p-3 rounded-lg bg-muted text-sm whitespace-pre-wrap font-sans border border-border overflow-auto max-h-48">
                      {maquetteDefault.contenu}
                    </pre>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium">Date de clôture</Label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={compteRenduForm.dateCloture}
                    onChange={(e) => setCompteRenduForm((p) => ({ ...p, dateCloture: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Compte rendu</Label>
                  <Textarea
                    className="mt-1 min-h-[120px]"
                    placeholder="Rédigez le compte rendu de clôture (résumé, actions menées, conclusion)..."
                    value={compteRenduForm.compteRendu}
                    onChange={(e) => setCompteRenduForm((p) => ({ ...p, compteRendu: e.target.value }))}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleSaveCompteRendu}
                    disabled={isSavingCompteRendu}
                  >
                    {isSavingCompteRendu ? 'Enregistrement...' : 'Enregistrer le compte rendu'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownloadCompteRenduPdf}
                    disabled={isDownloadingPdf}
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    {isDownloadingPdf ? 'Téléchargement...' : 'Télécharger en PDF'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Classification Panel - Only for members/delegates when needed */}
          {canClassify && (
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
                {/* Type de requête */}
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
                      {ticketTypes.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
                        <SelectItem key={pole.id} value={String(pole.id)}>
                          {pole.nom}
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
                      {delegates.map((delegate) => (
                        <SelectItem key={delegate.id} value={String(delegate.id)}>
                          {delegate.user_first_name} {delegate.user_last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  className="w-full mt-2" 
                  onClick={handleSaveClassification}
                  disabled={
                    isClassifying ||
                    (!classification.type?.trim() &&
                      !classification.urgency?.trim() &&
                      !classification.poleId?.trim() &&
                      !classification.delegateId?.trim())
                  }
                >
                  {isClassifying ? 'Enregistrement...' : 'Enregistrer la classification'}
                </Button>
              </div>
            </div>
          )}

          {/* Actions du pôle (processeur métier) */}
          {ticket.poleId && (canClassify || poleActions.length > 0) && (
            <div className="bg-card rounded-xl border shadow-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Actions du pôle</h3>
              </div>
              {poleActionsLoading ? (
                <p className="text-sm text-muted-foreground">Chargement des actions...</p>
              ) : poleActions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune action spécifique pour ce pôle.
                </p>
              ) : (
                <div className="space-y-2">
                  {poleActions.map((action) => (
                    <Button
                      key={action.id}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => openActionDialog(action)}
                    >
                      <span className="truncate">{action.label}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Changer le statut - connecté à l'API */}
          {canClassify && (
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
                  {(allowedTransitions.length > 0 ? allowedTransitions : allStatusesForChange).map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabels[s as TicketStatus] ?? s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isChangingStatus && (
                <p className="text-xs text-muted-foreground mt-2">Mise à jour...</p>
              )}
            </div>
          )}

          {/* Info card */}
          <div className="bg-card rounded-xl border shadow-card p-6 space-y-4">
            <h3 className="font-semibold">Informations</h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Demandeur</p>
                  <p className="font-medium">{ticket.requesterName ?? '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Compagnie</p>
                  <p className="font-medium">{ticket.companyName}</p>
                </div>
              </div>

              {ticket.poleName && (
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Pôle assigné</p>
                    <p className="font-medium">{ticket.poleName}</p>
                  </div>
                </div>
              )}

              {ticket.dossierDisplay && (
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Dossier</p>
                    <p className="font-medium">{ticket.dossierDisplay}</p>
                  </div>
                </div>
              )}

              {ticket.delegateName && (
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Délégué</p>
                    <p className="font-medium">
                      {ticket.delegateName}
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
                    {new Date(ticket.createdAt).toLocaleDateString('fr-FR', {
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
                    {new Date(ticket.updatedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* HR Interactions */}
          {false && (
            <div className="bg-card rounded-xl border shadow-card p-6">
              <h3 className="font-semibold mb-4">Interactions RH</h3>
              <div className="space-y-4">
                {([] as any).map((interaction: any) => (
                  <div
                    key={interaction.id}
                    className="p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {interaction.contactName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(interaction.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {interaction.contactRole}
                    </p>
                    <p className="text-sm">{interaction.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Need more info alert */}
          {ticket.status === 'info_needed' && (
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

      {/* Dialog exécution action du pôle */}
      <Dialog open={!!selectedAction} onOpenChange={(open) => !open && setSelectedAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedAction?.label}</DialogTitle>
            {selectedAction?.description && (
              <DialogDescription>{selectedAction.description}</DialogDescription>
            )}
          </DialogHeader>
          {selectedAction && (
            <div className="space-y-4 py-4">
              {[...selectedAction.required_fields, ...selectedAction.optional_fields].map((fieldKey) => (
                <div key={fieldKey}>
                  <Label className="text-sm capitalize">
                    {fieldKey === 'new_status' ? 'Nouveau statut' : fieldKey === 'assignee_id' ? 'Responsable' : fieldKey.replace(/_/g, ' ')}
                    {selectedAction.required_fields.includes(fieldKey) && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                  {selectedAction.id === 'change_status' && fieldKey === 'new_status' ? (
                    <Select
                      value={actionForm[fieldKey] ?? ''}
                      onValueChange={(value) => setActionForm((prev) => ({ ...prev, [fieldKey]: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choisir un statut" />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedTransitions.map((s) => (
                          <SelectItem key={s} value={s}>
                            {statusLabels[s] ?? s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : selectedAction.id === 'assign' && fieldKey === 'assignee_id' ? (
                    <Select
                      value={actionForm[fieldKey] ?? ''}
                      onValueChange={(value) => setActionForm((prev) => ({ ...prev, [fieldKey]: value }))}
                      disabled={poleMembersLoading}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={poleMembersLoading ? 'Chargement...' : 'Choisir un responsable'} />
                      </SelectTrigger>
                      <SelectContent>
                        {poleMembersForAssign.map((m) => (
                          <SelectItem key={m.id} value={String(m.user_id_read)}>
                            {m.user_first_name} {m.user_last_name}
                            {m.user_email ? ` (${m.user_email})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      className="mt-1"
                      value={actionForm[fieldKey] ?? ''}
                      onChange={(e) => setActionForm((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
                      placeholder={fieldKey.replace(/_/g, ' ')}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedAction(null)}
              disabled={isExecutingAction}
            >
              Annuler
            </Button>
            <Button onClick={handleExecutePoleAction} disabled={isExecutingAction}>
              {isExecutingAction ? 'Exécution...' : 'Exécuter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
