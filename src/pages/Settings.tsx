import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryFunction } from '@tanstack/react-query';
import { Settings as SettingsIcon, Loader2, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { createSetting, fetchSettings, type ApiSetting } from '@/lib/api/settings';

export default function Settings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formKey, setFormKey] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formScope, setFormScope] = useState('global');
  const [formPole, setFormPole] = useState('');
  const [formCompany, setFormCompany] = useState('');

  const fetchSettingsQuery: QueryFunction<ApiSetting[]> = () => fetchSettings();

  const { data: settings = [], isLoading } = useQuery<ApiSetting[]>({
    queryKey: ['settings'],
    queryFn: fetchSettingsQuery,
  });

  const createSettingMutation = useMutation({
    mutationFn: createSetting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: 'Paramètre créé avec succès' });
      setFormKey('');
      setFormValue('');
      setFormScope('global');
      setFormPole('');
      setFormCompany('');
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Erreur lors de la création', variant: 'destructive' });
    },
  });

  const filteredSettings = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return settings;
    return settings.filter((setting) =>
      [setting.key, setting.value, setting.scope]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle))
    );
  }, [settings, searchQuery]);

  const handleCreateSetting = () => {
    if (!formKey.trim() || !formValue.trim()) {
      toast({ title: 'Clé et valeur requises', variant: 'destructive' });
      return;
    }

    createSettingMutation.mutate({
      key: formKey.trim(),
      value: formValue.trim(),
      scope: formScope || undefined,
      pole: formPole.trim() || undefined,
      company: formCompany.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-primary" />
          Paramètres
        </h1>
        <p className="text-muted-foreground mt-1">
          Consultez et gérez les paramètres globaux de la plateforme.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un paramètre..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9"
          />
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un paramètre
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau paramètre</DialogTitle>
              <DialogDescription>
                Renseignez une clé et une valeur pour créer un nouveau paramètre.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="settingKey">Clé</Label>
                <Input
                  id="settingKey"
                  value={formKey}
                  onChange={(event) => setFormKey(event.target.value)}
                  placeholder="ex: ui.theme"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settingValue">Valeur</Label>
                <Input
                  id="settingValue"
                  value={formValue}
                  onChange={(event) => setFormValue(event.target.value)}
                  placeholder="ex: dark"
                />
              </div>
              <div className="space-y-2">
                <Label>Portée</Label>
                <Select value={formScope} onValueChange={setFormScope}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une portée" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Globale</SelectItem>
                    <SelectItem value="pole">Pôle</SelectItem>
                    <SelectItem value="company">Compagnie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settingPole">Pôle (optionnel)</Label>
                  <Input
                    id="settingPole"
                    value={formPole}
                    onChange={(event) => setFormPole(event.target.value)}
                    placeholder="ID du pôle"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settingCompany">Compagnie (optionnel)</Label>
                  <Input
                    id="settingCompany"
                    value={formCompany}
                    onChange={(event) => setFormCompany(event.target.value)}
                    placeholder="ID de la compagnie"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateSetting} disabled={createSettingMutation.isPending}>
                {createSettingMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Création...
                  </span>
                ) : (
                  'Créer'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paramètres disponibles</CardTitle>
          <CardDescription>
            {filteredSettings.length} paramètre{filteredSettings.length > 1 ? 's' : ''} trouvé{filteredSettings.length > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Chargement des paramètres...
            </div>
          ) : filteredSettings.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Aucun paramètre ne correspond à la recherche.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clé</TableHead>
                  <TableHead>Valeur</TableHead>
                  <TableHead>Portée</TableHead>
                  <TableHead>Pôle</TableHead>
                  <TableHead>Compagnie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSettings.map((setting) => (
                  <TableRow key={setting.id}>
                    <TableCell className="font-medium">{setting.key}</TableCell>
                    <TableCell>{setting.value}</TableCell>
                    <TableCell className="capitalize">{setting.scope}</TableCell>
                    <TableCell>{setting.pole || '-'}</TableCell>
                    <TableCell>{setting.company || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
