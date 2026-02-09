import { useMemo, useState } from 'react';
import { Layers, Loader2, Mail, Plus, Trash2, Users } from 'lucide-react';
import { useQuery, useMutation, useQueryClient, type QueryFunction } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { addPoleMember, fetchPoles, removePoleMember, type ApiPole } from '@/lib/api/poles';
import { fetchUsers, type ApiUser } from '@/lib/api/users';

export default function Poles() {
  const queryClient = useQueryClient();

  const fetchPolesQuery: QueryFunction<ApiPole[]> = () => fetchPoles();
  const fetchUsersQuery: QueryFunction<ApiUser[]> = () => fetchUsers();

  const { data: polesList = [], isLoading: isLoadingPoles } = useQuery<ApiPole[]>({
    queryKey: ['poles'],
    queryFn: fetchPolesQuery,
  });

  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery<ApiUser[]>({
    queryKey: ['users'],
    queryFn: fetchUsersQuery,
  });

  const [selectedPoleId, setSelectedPoleId] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

  const selectedPole = useMemo(
    () => polesList.find((pole) => pole.id === selectedPoleId) ?? polesList[0],
    [polesList, selectedPoleId]
  );

  const members = selectedPole?.members ?? [];

  const availableUsers = allUsers.filter(
    (user) => !members.some((member) => member.user === user.id)
  );

  const addMemberMutation = useMutation({
    mutationFn: addPoleMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poles'] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: removePoleMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poles'] });
    },
  });

  const handleAddMember = () => {
    if (!selectedPole || !selectedUserId) {
      return;
    }

    addMemberMutation.mutate({
      pole: selectedPole.id,
      user: parseInt(selectedUserId),
      function: 'assistant',
    });

    setSelectedUserId('');
    setIsAddDialogOpen(false);
  };

  const handleRemoveMember = (memberId: string) => {
    if (!selectedPole) {
      return;
    }

    removeMemberMutation.mutate(memberId);
  };

  if (isLoadingPoles || isLoadingUsers) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pôles</h1>
        <p className="text-muted-foreground mt-1">
          Consultez la liste des pôles, leurs détails et gérez les membres associés.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Liste des pôles
            </CardTitle>
            <CardDescription>{polesList.length} pôle(s)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {polesList.map((pole) => (
              <button
                key={pole.id}
                type="button"
                onClick={() => setSelectedPoleId(pole.id)}
                className={cn(
                  'w-full rounded-lg border px-4 py-3 text-left transition-colors',
                  'hover:bg-accent/50',
                  selectedPole?.id === pole.id ? 'border-primary bg-primary/5' : 'border-border'
                )}
              >
                <div className="font-medium">{pole.name}</div>
                {pole.description && (
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {pole.description}
                  </div>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Détails du pôle</span>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un membre
              </Button>
            </CardTitle>
            <CardDescription>
              {selectedPole?.name ?? 'Sélectionnez un pôle'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedPole ? (
              <>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Description</div>
                  <div className="text-sm">
                    {selectedPole.description || 'Aucune description disponible.'}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Membres du pôle</span>
                  </div>
                  <Badge variant="secondary">{members.length} membre(s)</Badge>
                </div>

                <div className="space-y-3">
                  {members.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Aucun membre associé à ce pôle pour le moment.
                    </div>
                  ) : (
                    members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="min-w-0">
                          <div className="font-medium">
                            {member.username}
                          </div>
                          <div className="mt-2">
                            <Badge variant={member.function === 'head' ? 'default' : 'secondary'}>
                              {member.function === 'head' ? 'Chef de pôle' : 'Assistant'}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                Sélectionnez un pôle dans la liste pour afficher ses détails.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un membre</DialogTitle>
            <DialogDescription>
              Sélectionnez un utilisateur à associer au pôle.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un utilisateur" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Aucun utilisateur disponible
                  </SelectItem>
                ) : (
                  availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name || user.username} — {user.email}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddMember} disabled={!selectedUserId}>
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
