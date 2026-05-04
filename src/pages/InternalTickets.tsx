import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Clock, Loader2, ClipboardList, Paperclip, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { fetchTicketsList, createTicket } from '@/lib/api/tickets';
import { uploadDocument } from '@/lib/api/documents';
import { useTicketMeta } from '@/hooks/useTicketMeta';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function InternalTickets() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Pôle et compagnie de l'utilisateur connecté (depuis ses rôles)
  const userPoleId = user?.roles?.find(r => r.pole_id)?.pole_id ?? undefined;
  const userCompanyId = user?.roles?.find(r => r.company_id)?.company_id ?? undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [formSubject, setFormSubject] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const { statusCode } = useTicketMeta();

  const queryParams: Record<string, string | undefined> = { model_ticket: 'interne' };
  if (searchQuery) queryParams.q = searchQuery;

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets', queryParams],
    queryFn: () => fetchTicketsList(queryParams),
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: createTicket,
    onSuccess: async (ticket) => {
      // Upload attachments after ticket creation
      for (const file of attachedFiles) {
        try {
          const form = new FormData();
          form.append('file', file);
          form.append('ticket', ticket.id);
          form.append('name', file.name.replace(/\.[^/.]+$/, ''));
          form.append('doc_type', 'other');
          await uploadDocument(form);
        } catch {
          // Non-blocking — ticket was created, just warn
          toast({ title: 'Avertissement', description: `Impossible d'envoyer "${file.name}".`, variant: 'destructive' });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setShowCreate(false);
      resetForm();
      navigate(`/internal-tickets/${ticket.id}`);
    },
    onError: () => {
      toast({ title: 'Erreur', description: 'Impossible de créer la requête interne.', variant: 'destructive' });
    },
  });


  function resetForm() {
    setFormSubject('');
    setFormDescription('');
    setAttachedFiles([]);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setAttachedFiles((prev) => [...prev, ...files]);
    e.target.value = '';
  }

  function removeFile(index: number) {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formSubject.trim()) return;
    createMutation.mutate({
      subject: formSubject.trim(),
      description: formDescription.trim(),
      model_ticket: 'interne',
      pole: userPoleId,
      company: userCompanyId,
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Requêtes internes</h1>
          <p className="text-muted-foreground mt-1">
            Gérez les dossiers et activités internes du syndicat.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle requête interne
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par référence ou objet..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Référence</TableHead>
              <TableHead className="font-semibold">Objet</TableHead>
              <TableHead className="font-semibold">Statut</TableHead>
              <TableHead className="font-semibold">Mis à jour</TableHead>
              <TableHead className="font-semibold text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <div className="inline-flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Chargement...
                  </div>
                </TableCell>
              </TableRow>
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucune requête interne</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Créez votre première requête en cliquant sur « Nouvelle requête interne »
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow key={ticket.id} className="group hover:bg-accent/50 transition-colors">
                  <TableCell>
                    <p className="font-mono text-sm font-medium">{ticket.reference}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm truncate max-w-[320px]">{ticket.subject}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={statusCode(ticket.status)} size="sm" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(ticket.updated_at).toLocaleDateString('fr-FR')}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/internal-tickets/${ticket.id}`}>Voir</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && tickets.length > 0 && (
        <p className="text-sm text-muted-foreground">{tickets.length} requête(s) trouvée(s)</p>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle requête interne</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Objet */}
            <div className="space-y-2">
              <Label htmlFor="subject">
                Objet <span className="text-destructive">*</span>
              </Label>
              <Input
                id="subject"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="Ex : Réunion mensuelle de coordination"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Détails du ticket..."
                rows={4}
              />
            </div>

            {/* Pièces jointes */}
            <div className="space-y-2">
              <Label>Pièces jointes <span className="text-xs text-muted-foreground">(optionnel)</span></Label>

              {attachedFiles.length > 0 && (
                <ul className="space-y-1.5">
                  {attachedFiles.map((file, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 text-sm bg-muted rounded-lg px-3 py-2">
                      <span className="flex items-center gap-2 min-w-0">
                        <Paperclip className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          ({(file.size / 1024).toFixed(0)} Ko)
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="w-4 h-4 mr-2" />
                Joindre un fichier
              </Button>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowCreate(false); resetForm(); }}
                disabled={createMutation.isPending}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={!formSubject.trim() || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
