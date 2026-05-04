import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Mail, Phone, Loader2, AlertCircle, Users, Building2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { fetchPoles, type ApiPole } from '@/lib/api/poles';
import { fetchProfiles, type ApiUserProfile } from '@/lib/api/users';
import { shareDocument, type ShareDocumentPayload } from '@/lib/api/documents';
import { ApiError } from '@/lib/api';

interface DocumentShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName: string;
}

type Channel = 'email' | 'whatsapp';

export default function DocumentShareDialog({
  open,
  onOpenChange,
  documentId,
  documentName,
}: DocumentShareDialogProps) {
  const { toast } = useToast();
  const [channel, setChannel] = useState<Channel>('email');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [selectedPoleIds, setSelectedPoleIds] = useState<Set<string>>(new Set());
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { data: poles = [], isLoading: loadingPoles } = useQuery({
    queryKey: ['poles-share'],
    queryFn: () => fetchPoles({ active: 'true', page_size: '1000' }),
    enabled: open,
  });

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['profiles-share'],
    queryFn: () => fetchProfiles({ page_size: '1000' }),
    enabled: open,
  });

  const shareMutation = useMutation({
    mutationFn: (payload: ShareDocumentPayload) => shareDocument(documentId, payload),
    onSuccess: (data) => {
      toast({
        title: 'Document partagé',
        description: `Envoyé à ${data.sent} destinataire(s).`,
      });
      if (data.warnings?.length) {
        toast({
          title: 'Avertissements',
          description: data.warnings.join('\n'),
          variant: 'destructive',
        });
      }
      handleClose();
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.body.errors) {
        setValidationErrors(error.body.errors as string[]);
      } else {
        const message = error instanceof Error ? error.message : "Erreur lors du partage";
        toast({ title: 'Erreur', description: message, variant: 'destructive' });
      }
    },
  });

  const handleClose = () => {
    setSelectedUserIds(new Set());
    setSelectedPoleIds(new Set());
    setValidationErrors([]);
    setChannel('email');
    onOpenChange(false);
  };

  const toggleUser = (userId: number) => {
    setValidationErrors([]);
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const togglePole = (poleId: string) => {
    setValidationErrors([]);
    setSelectedPoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(poleId)) next.delete(poleId);
      else next.add(poleId);
      return next;
    });
  };

  const handleShare = () => {
    if (selectedUserIds.size === 0 && selectedPoleIds.size === 0) {
      setValidationErrors(['Veuillez sélectionner au moins un destinataire.']);
      return;
    }
    setValidationErrors([]);
    shareMutation.mutate({
      channel,
      user_ids: Array.from(selectedUserIds),
      pole_ids: Array.from(selectedPoleIds),
    });
  };

  const isLoading = loadingPoles || loadingProfiles;
  const hasSelection = selectedUserIds.size > 0 || selectedPoleIds.size > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Partager le document</DialogTitle>
          <DialogDescription className="truncate">
            {documentName}
          </DialogDescription>
        </DialogHeader>

        {/* Channel selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Canal d'envoi</Label>
          <div className="flex gap-3">
            <Button
              variant={channel === 'email' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setChannel('email'); setValidationErrors([]); }}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
            <Button
              variant={channel === 'whatsapp' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setChannel('whatsapp'); setValidationErrors([]); }}
            >
              <Phone className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Users selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Utilisateurs</Label>
              </div>
              <ScrollArea className="h-40 rounded-md border p-3">
                {profiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun profil trouvé
                  </p>
                ) : (
                  <div className="space-y-2">
                    {profiles.map((profile) => {
                      const displayName =
                        [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
                        profile.username;
                      const hasContact =
                        channel === 'email'
                          ? true // email is on User model, backend checks it
                          : !!profile.phone;
                      return (
                        <div
                          key={profile.id}
                          className="flex items-center gap-3 py-1"
                        >
                          <Checkbox
                            id={`user-${profile.user}`}
                            checked={selectedUserIds.has(profile.user)}
                            onCheckedChange={() => toggleUser(profile.user)}
                          />
                          <Label
                            htmlFor={`user-${profile.user}`}
                            className="flex-1 cursor-pointer text-sm"
                          >
                            {displayName}
                            <span className="text-muted-foreground ml-1">
                              @{profile.username}
                            </span>
                          </Label>
                          {!hasContact && (
                            <Badge variant="destructive" className="text-xs">
                              {channel === 'whatsapp' ? 'Tél. manquant' : 'Email manquant'}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Poles selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Pôles</Label>
              </div>
              <ScrollArea className="h-32 rounded-md border p-3">
                {poles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun pôle trouvé
                  </p>
                ) : (
                  <div className="space-y-2">
                    {poles.map((pole) => (
                      <div
                        key={pole.id}
                        className="flex items-center gap-3 py-1"
                      >
                        <Checkbox
                          id={`pole-${pole.id}`}
                          checked={selectedPoleIds.has(pole.id)}
                          onCheckedChange={() => togglePole(pole.id)}
                        />
                        <Label
                          htmlFor={`pole-${pole.id}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          {pole.name}
                          {pole.members?.length > 0 && (
                            <span className="text-muted-foreground ml-1">
                              ({pole.members.length} membre{pole.members.length > 1 ? 's' : ''})
                            </span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 space-y-1">
            <div className="flex items-center gap-2 text-destructive text-sm font-medium">
              <AlertCircle className="w-4 h-4" />
              Impossible d'envoyer
            </div>
            <ul className="text-sm text-destructive space-y-0.5 pl-6 list-disc">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button
            onClick={handleShare}
            disabled={!hasSelection || shareMutation.isPending}
          >
            {shareMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            {channel === 'email' ? 'Envoyer par email' : 'Envoyer par WhatsApp'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
