import { useMemo, useState } from 'react';
import { Building, Calendar, Loader2, Plus, Trash2, Users, User, Pencil, Check, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  fetchBureaux,
  createBureau,
  updateBureau,
  deleteBureau,
  addBureauMember,
  removeBureauMember,
  type ApiBureau,
  type CreateBureauPayload,
} from '@/lib/api/bureau';
import { fetchUsers, type ApiUserListItem } from '@/lib/api/users';
import { useToast } from '@/hooks/use-toast';

const EMPTY_FORM: CreateBureauPayload = {
  name: '',
  date_creation: '',
  secretaire_general: null,
  description: '',
  active: true,
};

export default function Bureau() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: bureaux = [], isLoading: loadingBureaux } = useQuery<ApiBureau[]>({
    queryKey: ['bureaux'],
    queryFn: () => fetchBureaux({ page_size: '100' }),
  });

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery<ApiUserListItem[]>({
    queryKey: ['users'],
    queryFn: () => fetchUsers({ page_size: '1000' }),
  });

  const [selectedId, setSelectedId] = useState('');
  const [isBureauDialogOpen, setIsBureauDialogOpen] = useState(false);
  const [editingBureau, setEditingBureau] = useState<ApiBureau | null>(null);
  const [form, setForm] = useState<CreateBureauPayload>(EMPTY_FORM);

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberFunction, setNewMemberFunction] = useState('');
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [bureauToDelete, setBureauToDelete] = useState<ApiBureau | null>(null);

  const selectedBureau = useMemo(
    () => bureaux.find((b) => b.id === selectedId) ?? bureaux[0],
    [bureaux, selectedId],
  );

  const existingMemberUserIds = useMemo(
    () => new Set(selectedBureau?.members.map((m) => m.user) ?? []),
    [selectedBureau],
  );

  const availableUsers = allUsers.filter(
    (u) => u.id > 0 && !existingMemberUserIds.has(u.id),
  );

  // ── Mutations ──────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createBureau,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bureaux'] });
      toast({ title: 'Bureau exécutif créé' });
      setIsBureauDialogOpen(false);
    },
    onError: () => toast({ title: 'Erreur lors de la création', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateBureauPayload> }) =>
      updateBureau(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bureaux'] });
      toast({ title: 'Bureau exécutif mis à jour' });
      setIsBureauDialogOpen(false);
    },
    onError: () => toast({ title: 'Erreur lors de la mise à jour', variant: 'destructive' }),
  });

  const addMemberMutation = useMutation({
    mutationFn: addBureauMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bureaux'] });
      setIsAddMemberOpen(false);
      setNewMemberUserId('');
      setNewMemberFunction('');
    },
    onError: () => toast({ title: 'Erreur lors de l\'ajout', variant: 'destructive' }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: removeBureauMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bureaux'] });
      setMemberToRemove(null);
    },
    onError: () => toast({ title: 'Erreur lors du retrait', variant: 'destructive' }),
  });

  const deleteBureauMutation = useMutation({
    mutationFn: deleteBureau,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bureaux'] });
      setSelectedId('');
      setBureauToDelete(null);
      toast({ title: 'Bureau supprimé' });
    },
    onError: () => toast({ title: 'Erreur lors de la suppression', variant: 'destructive' }),
  });

  // ── Handlers ───────────────────────────────────────────────
  const openCreate = () => {
    setEditingBureau(null);
    setForm(EMPTY_FORM);
    setIsBureauDialogOpen(true);
  };

  const openEdit = (b: ApiBureau) => {
    setEditingBureau(b);
    setForm({
      name: b.name,
      date_creation: b.date_creation,
      secretaire_general: b.secretaire_general,
      description: b.description,
      active: b.active,
    });
    setIsBureauDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.date_creation) return;
    if (editingBureau) {
      updateMutation.mutate({ id: editingBureau.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleAddMember = () => {
    if (!selectedBureau || !newMemberUserId) return;
    addMemberMutation.mutate({
      bureau: selectedBureau.id,
      user: parseInt(newMemberUserId),
      function: newMemberFunction.trim(),
    });
  };

  if (loadingBureaux || loadingUsers) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bureau Exécutif</h1>
          <p className="text-muted-foreground mt-1">
            Gérez les bureaux exécutifs et leurs membres.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau bureau
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des bureaux */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5 text-primary" />
              Bureaux
            </CardTitle>
            <CardDescription>{bureaux.length} bureau(x)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {bureaux.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun bureau créé.</p>
            ) : (
              bureaux.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedId(b.id)}
                  className={cn(
                    'w-full rounded-lg border px-4 py-3 text-left transition-colors',
                    'hover:bg-accent/50',
                    selectedBureau?.id === b.id ? 'border-primary bg-primary/5' : 'border-border',
                  )}
                >
                  <div className="font-medium flex items-center justify-between">
                    {b.name}
                    {b.active ? (
                      <Badge variant="default" className="text-xs">Actif</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Inactif</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(b.date_creation).toLocaleDateString('fr-FR')}
                  </div>
                  {b.sg_name && (
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      SG : {b.sg_name}
                    </div>
                  )}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Détail du bureau sélectionné */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedBureau?.name ?? 'Sélectionnez un bureau'}</span>
              {selectedBureau && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(selectedBureau)}>
                    <Pencil className="w-4 h-4 mr-1" />
                    Modifier
                  </Button>
                  <Button size="sm" onClick={() => setIsAddMemberOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter un membre
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setBureauToDelete(selectedBureau)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Supprimer
                  </Button>
                </div>
              )}
            </CardTitle>
            {selectedBureau && (
              <CardDescription>
                Créé le {new Date(selectedBureau.date_creation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                {selectedBureau.sg_name && ` · SG : ${selectedBureau.sg_name}`}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedBureau ? (
              <>
                {selectedBureau.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedBureau.description}</p>
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Membres</span>
                  </div>
                  <Badge variant="secondary">{selectedBureau.members.length} membre(s)</Badge>
                </div>

                <div className="space-y-3">
                  {selectedBureau.members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun membre associé.</p>
                  ) : (
                    selectedBureau.members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">{m.username}</p>
                          {m.function && (
                            <Badge variant="secondary" className="mt-1 text-xs">{m.function}</Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setMemberToRemove(m.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sélectionnez un bureau dans la liste pour afficher ses détails.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog création/édition bureau */}
      <Dialog open={isBureauDialogOpen} onOpenChange={setIsBureauDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBureau ? 'Modifier le bureau' : 'Nouveau bureau exécutif'}</DialogTitle>
            <DialogDescription>
              {editingBureau ? 'Mettez à jour les informations du bureau.' : 'Créez un nouveau bureau exécutif.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nom / Intitulé *</Label>
              <Input
                placeholder="Ex : Bureau Exécutif – Mandat 2024-2026"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Date de création / prise de fonction *</Label>
              <Input
                type="date"
                value={form.date_creation}
                onChange={(e) => setForm({ ...form, date_creation: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Secrétaire Général en poste</Label>
              <Select
                value={form.secretaire_general ? String(form.secretaire_general) : '__none__'}
                onValueChange={(v) => setForm({ ...form, secretaire_general: v === '__none__' ? null : parseInt(v) })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Sélectionner le SG" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Aucun —</SelectItem>
                  {allUsers.filter((u) => u.id > 0).map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name || u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Contexte, mission, périmètre…"
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1.5"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, active: !form.active })}
                className={cn(
                  'w-10 h-6 rounded-full transition-colors flex items-center px-0.5',
                  form.active ? 'bg-primary' : 'bg-muted',
                )}
              >
                <span className={cn('w-5 h-5 rounded-full bg-white shadow transition-transform', form.active ? 'translate-x-4' : 'translate-x-0')} />
              </button>
              <Label>Bureau actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBureauDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={handleSave}
              disabled={!form.name.trim() || !form.date_creation || createMutation.isPending || updateMutation.isPending}
            >
              {editingBureau ? <><Check className="w-4 h-4 mr-1" />Enregistrer</> : <><Plus className="w-4 h-4 mr-1" />Créer</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog ajout membre */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un membre</DialogTitle>
            <DialogDescription>Associez un utilisateur au bureau exécutif.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Utilisateur *</Label>
              <Select value={newMemberUserId} onValueChange={setNewMemberUserId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Choisir un utilisateur" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.length === 0 ? (
                    <SelectItem value="none" disabled>Aucun utilisateur disponible</SelectItem>
                  ) : (
                    availableUsers.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name || u.username} — {u.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fonction / Titre</Label>
              <Input
                placeholder="Ex : Trésorier, Vice-Secrétaire…"
                value={newMemberFunction}
                onChange={(e) => setNewMemberFunction(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>Annuler</Button>
            <Button onClick={handleAddMember} disabled={!newMemberUserId || addMemberMutation.isPending}>
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression bureau */}
      <AlertDialog open={!!bureauToDelete} onOpenChange={(o) => { if (!o) setBureauToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce bureau ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le bureau <strong>{bureauToDelete?.name}</strong> et tous ses membres seront définitivement supprimés.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bureauToDelete && deleteBureauMutation.mutate(bureauToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation retrait membre */}
      <AlertDialog open={!!memberToRemove} onOpenChange={(o) => { if (!o) setMemberToRemove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action retirera le membre du bureau exécutif.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToRemove && removeMemberMutation.mutate(memberToRemove)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
