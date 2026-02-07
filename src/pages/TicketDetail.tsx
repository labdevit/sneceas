import { useState } from 'react';
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
  Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { fetchTicket, updateTicket } from '@/lib/api/tickets';
import { fetchConversations, createConversation } from '@/lib/api/conversations';
import { fetchTicketHRInteractions } from '@/lib/api/hr';
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

const urgencyLevels = Object.entries(urgencyLabels) as [string, string][];

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
    queryKey: ['hr-interactions', id],
    queryFn: () => fetchTicketHRInteractions(id!),
    enabled: !!id,
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
    queryFn: () => fetchDelegates(),
    enabled: canClassify,
    staleTime: 5 * 60 * 1000,
  });

  const [newMessage, setNewMessage] = useState('');
  
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

  // Initialize classification when ticket loads
  if (ticket && !classification.type && !classification.urgency) {
    // This runs once when ticket data arrives
  }

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
  const currentStatusIndex = sortedStatuses.findIndex(s => s.id === ticket.status);

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
                  <Badge variant="outline">{ticket.ticket_type_label}</Badge>
                </div>
                <h1 className="text-xl font-bold">{ticket.subject}</h1>
              </div>
              <div className="flex items-center gap-3">
                <UrgencyBadge urgency={ticket.urgency} />
                <StatusBadge status={statusCode(ticket.status)} />
              </div>
            </div>

            <Separator className="my-6" />

            {/* Timeline */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-4">Progression du dossier</h3>
              <div className="relative">
                <div className="flex justify-between">
                  {sortedStatuses.map((statusObj, index) => {
                    const isCompleted = index <= currentStatusIndex;
                    const isCurrent = index === currentStatusIndex;
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
                            index + 1
                          )}
                        </div>
                        <span
                          className={cn(
                            'text-xs mt-2 text-center',
                            isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'
                          )}
                        >
                          {statusObj.label}
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
                      width: `${sortedStatuses.length > 1 ? (currentStatusIndex / (sortedStatuses.length - 1)) * 100 : 0}%`,
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

            {/* Attachments - placeholder for file API */}
          </div>

          {/* Activity Tracker - Only for delegates and pole managers */}
          {canClassify && (
            <ActivityTracker 
              ticketId={ticket.id} 
              ticketReference={ticket.reference}
              ticketSubject={ticket.subject}
              recipientEmail=""
              recipientName={ticket.worker_name || ''}
              canManage={canClassify} 
            />
          )}

          {/* Messages */}
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
                      {types.map((tt) => (
                        <SelectItem key={tt.id} value={tt.id}>
                          {tt.label}
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
                      {delegatesList.map((d) => (
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

          {/* Info card */}
          <div className="bg-card rounded-xl border shadow-card p-6 space-y-4">
            <h3 className="font-semibold">Informations</h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Compagnie</p>
                  <p className="font-medium">{ticket.company_name}</p>
                </div>
              </div>

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

          {/* HR Interactions */}
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
                        {new Date(interaction.interaction_date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {interaction.channel}
                    </p>
                    <p className="text-sm">{interaction.summary}</p>
                    {interaction.outcome && (
                      <p className="text-sm text-muted-foreground mt-1">Résultat: {interaction.outcome}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Need more info alert */}
          {statusCode(ticket.status) === 'info_needed' && (
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
