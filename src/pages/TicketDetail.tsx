import { useEffect, useMemo, useState } from 'react';
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
import { apiRequest } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const statusSteps: TicketStatus[] = [
  'new',
  'info_needed',
  'processing',
  'hr_escalated',
  'hr_pending',
  'resolved',
  'closed',
];

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
  const [messages] = useState<Array<{ id: string }>>([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Classification state
  const [classification, setClassification] = useState({
    type: '' as TicketType | '',
    urgency: '' as TicketUrgency | '',
    poleId: '',
    delegateId: '',
  });
  const [isClassifying, setIsClassifying] = useState(false);

  const canClassify = useMemo(
    () =>
      profile?.role === 'member' ||
      profile?.role === 'delegate' ||
      profile?.role === 'pole_manager' ||
      profile?.role === 'admin',
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
          delegateId: '',
        });
        setErrorMessage(null);
      } catch {
        setErrorMessage("Impossible de charger la requête.");
      } finally {
        setIsLoading(false);
      }
    };

    loadTicket();
  }, [id]);

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

  const currentStatusIndex = statusSteps.indexOf(ticket.status);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Handle message sending
      setNewMessage('');
    }
  };

  const handleSaveClassification = async () => {
    setIsClassifying(true);
    try {
      await apiRequest(`/requetes/${ticket.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          type_probleme: classification.type,
          priorite: classification.urgency,
          pole_id: classification.poleId ? Number(classification.poleId) : undefined,
          delegue_syndical_id: classification.delegateId
            ? Number(classification.delegateId)
            : undefined,
        }),
      });
      toast({
        title: 'Classification enregistrée',
        description: "Le type et l'urgence ont été mis à jour avec succès.",
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
                  {statusSteps.map((status, index) => {
                    const isCompleted = index <= currentStatusIndex;
                    const isCurrent = index === currentStatusIndex;
                    return (
                      <div key={status} className="flex flex-col items-center flex-1">
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
                            index + 1
                          )}
                        </div>
                        <span
                          className={cn(
                            'text-xs mt-2 text-center',
                            isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'
                          )}
                        >
                          {statusLabels[status]}
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
                      width: `${(currentStatusIndex / (statusSteps.length - 1)) * 100}%`,
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
                        href={file.fichier}
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
                          <span className="text-sm font-medium">Utilisateur</span>
                        </div>
                        <div className="p-3 rounded-lg bg-muted">
                          <p className="text-sm">Message</p>
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
                  disabled={isClassifying || (!classification.type && !classification.urgency)}
                >
                  {isClassifying ? 'Enregistrement...' : 'Enregistrer la classification'}
                </Button>
              </div>
            </div>
          )}

          {/* Info card */}
          <div className="bg-card rounded-xl border shadow-card p-6 space-y-4">
            <h3 className="font-semibold">Informations</h3>
            
            <div className="space-y-3">
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
    </div>
  );
}
