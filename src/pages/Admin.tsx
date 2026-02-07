import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Users, 
  Building2, 
  Layers, 
  UserCheck,
  Plus,
  Pencil,
  Trash2,
  Search,
  Shield,
  Mail,
  Phone,
  Loader2
} from 'lucide-react';
import { fetchUsers } from '@/lib/api/users';
import { fetchCompanies, createCompany, deleteCompany } from '@/lib/api/companies';
import { fetchPoles, createPole, deletePole } from '@/lib/api/poles';
import { fetchDelegates, createDelegate } from '@/lib/api/delegates';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export default function Admin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');

  // Data fetching
  const { data: usersList = [], isLoading: usersLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  const { data: companiesList = [], isLoading: companiesLoading } = useQuery({ queryKey: ['companies'], queryFn: fetchCompanies });
  const { data: polesList = [], isLoading: polesLoading } = useQuery({ queryKey: ['poles'], queryFn: fetchPoles });
  const { data: delegatesList = [], isLoading: delegatesLoading } = useQuery({ queryKey: ['delegates'], queryFn: fetchDelegates });

  const isLoading = usersLoading || companiesLoading || polesLoading || delegatesLoading;

  // Users state
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);

  // Companies state
  const [editingCompany, setEditingCompany] = useState<any | null>(null);
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);

  // Poles state
  const [editingPole, setEditingPole] = useState<any | null>(null);
  const [isPoleDialogOpen, setIsPoleDialogOpen] = useState(false);

  // Delegates state
  const [editingDelegate, setEditingDelegate] = useState<any | null>(null);
  const [isDelegateDialogOpen, setIsDelegateDialogOpen] = useState(false);

  const filteredUsers = usersList.filter(user => 
    (user.name || user.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCompanies = companiesList.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPoles = polesList.filter(pole =>
    pole.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDelegates = delegatesList.filter(delegate =>
    (delegate.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          Administration
        </h1>
        <p className="text-muted-foreground mt-1">
          Gérez les utilisateurs, compagnies, pôles et délégués de la plateforme
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Chargement des données...</span>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Utilisateurs</span>
          </TabsTrigger>
          <TabsTrigger value="companies" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Compagnies</span>
          </TabsTrigger>
          <TabsTrigger value="poles" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Pôles</span>
          </TabsTrigger>
          <TabsTrigger value="delegates" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Délégués</span>
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Utilisateurs</CardTitle>
                <CardDescription>
                  {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} enregistré{filteredUsers.length > 1 ? 's' : ''}
                </CardDescription>
              </div>
              <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingUser(null)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingUser ? 'Modifier' : 'Ajouter'} un utilisateur</DialogTitle>
                    <DialogDescription>
                      {editingUser ? 'Modifiez les informations de l\'utilisateur' : 'Créez un nouveau compte utilisateur'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="userName">Nom</Label>
                      <Input id="userName" defaultValue={editingUser?.name || editingUser?.username} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue={editingUser?.email} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={() => setIsUserDialogOpen(false)}>
                      {editingUser ? 'Enregistrer' : 'Créer'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.name || user.username}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingUser(user);
                              setIsUserDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer l'utilisateur ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible. L'utilisateur {user.name || user.username} sera définitivement supprimé.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => setIsUserDialogOpen(false)}
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Companies Tab */}
        <TabsContent value="companies">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Compagnies</CardTitle>
                <CardDescription>
                  {filteredCompanies.length} compagnie{filteredCompanies.length > 1 ? 's' : ''} enregistrée{filteredCompanies.length > 1 ? 's' : ''}
                </CardDescription>
              </div>
              <Dialog open={isCompanyDialogOpen} onOpenChange={setIsCompanyDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingCompany(null)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCompany ? 'Modifier' : 'Ajouter'} une compagnie</DialogTitle>
                    <DialogDescription>
                      {editingCompany ? 'Modifiez les informations de la compagnie' : 'Ajoutez une nouvelle compagnie'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Nom de la compagnie</Label>
                      <Input id="companyName" defaultValue={editingCompany?.name} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companySector">Secteur</Label>
                      <Input id="companySector" defaultValue={editingCompany?.sector} placeholder="Ex: Agroalimentaire, Transport..." />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCompanyDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={async () => {
                      if (!editingCompany) {
                        const name = (document.getElementById('companyName') as HTMLInputElement)?.value;
                        const sector = (document.getElementById('companySector') as HTMLInputElement)?.value;
                        if (name) {
                          try {
                            await createCompany({ name, sector: sector || undefined });
                            queryClient.invalidateQueries({ queryKey: ['companies'] });
                            toast({ title: 'Compagnie créée avec succès' });
                          } catch (e) {
                            toast({ title: 'Erreur lors de la création', variant: 'destructive' });
                          }
                        }
                      }
                      setIsCompanyDialogOpen(false);
                    }}>
                      {editingCompany ? 'Enregistrer' : 'Créer'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Secteur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map(company => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            {company.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{company.sector || '-'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={company.active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                          }>
                            {company.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingCompany(company);
                                setIsCompanyDialogOpen(true);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer la compagnie ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cette action est irréversible. La compagnie {company.name} sera définitivement supprimée.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction 
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={async () => {
                                      try {
                                        await deleteCompany(company.id);
                                        queryClient.invalidateQueries({ queryKey: ['companies'] });
                                        toast({ title: 'Compagnie supprimée' });
                                      } catch (e) {
                                        toast({ title: 'Erreur lors de la suppression', variant: 'destructive' });
                                      }
                                    }}
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Poles Tab */}
        <TabsContent value="poles">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pôles</CardTitle>
                <CardDescription>
                  {filteredPoles.length} pôle{filteredPoles.length > 1 ? 's' : ''} configuré{filteredPoles.length > 1 ? 's' : ''}
                </CardDescription>
              </div>
              <Dialog open={isPoleDialogOpen} onOpenChange={setIsPoleDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingPole(null)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingPole ? 'Modifier' : 'Ajouter'} un pôle</DialogTitle>
                    <DialogDescription>
                      {editingPole ? 'Modifiez les informations du pôle' : 'Créez un nouveau pôle de gestion'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="poleName">Nom du pôle</Label>
                      <Input id="poleName" defaultValue={editingPole?.name} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="poleDescription">Description</Label>
                      <Textarea 
                        id="poleDescription" 
                        defaultValue={editingPole?.description} 
                        placeholder="Décrivez les responsabilités de ce pôle..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsPoleDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={async () => {
                      if (!editingPole) {
                        const name = (document.getElementById('poleName') as HTMLInputElement)?.value;
                        const description = (document.getElementById('poleDescription') as HTMLTextAreaElement)?.value;
                        if (name) {
                          try {
                            await createPole({ name, description: description || undefined });
                            queryClient.invalidateQueries({ queryKey: ['poles'] });
                            toast({ title: 'Pôle créé avec succès' });
                          } catch (e) {
                            toast({ title: 'Erreur lors de la création', variant: 'destructive' });
                          }
                        }
                      }
                      setIsPoleDialogOpen(false);
                    }}>
                      {editingPole ? 'Enregistrer' : 'Créer'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPoles.map(pole => (
                    <TableRow key={pole.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-muted-foreground" />
                          {pole.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-md truncate">
                        {pole.description || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingPole(pole);
                              setIsPoleDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer le pôle ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible. Le pôle {pole.name} sera définitivement supprimé.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={async () => {
                                    try {
                                      await deletePole(pole.id);
                                      queryClient.invalidateQueries({ queryKey: ['poles'] });
                                      toast({ title: 'Pôle supprimé' });
                                    } catch (e) {
                                      toast({ title: 'Erreur lors de la suppression', variant: 'destructive' });
                                    }
                                  }}
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delegates Tab */}
        <TabsContent value="delegates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Délégués</CardTitle>
                <CardDescription>
                  {filteredDelegates.length} délégué{filteredDelegates.length > 1 ? 's' : ''} actif{filteredDelegates.length > 1 ? 's' : ''}
                </CardDescription>
              </div>
              <Dialog open={isDelegateDialogOpen} onOpenChange={setIsDelegateDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingDelegate(null)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingDelegate ? 'Modifier' : 'Ajouter'} un délégué</DialogTitle>
                    <DialogDescription>
                      {editingDelegate ? 'Modifiez les informations du délégué' : 'Désignez un nouveau délégué syndical'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="delegateUser">Utilisateur</Label>
                      <Select defaultValue={editingDelegate?.user?.toString()}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un utilisateur" />
                        </SelectTrigger>
                        <SelectContent>
                          {usersList.map(user => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.name || user.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="delegateCompany">Compagnie</Label>
                      <Select defaultValue={editingDelegate?.company}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une compagnie" />
                        </SelectTrigger>
                        <SelectContent>
                          {companiesList.map(company => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="delegateEmail">Email</Label>
                        <Input id="delegateEmail" type="email" defaultValue={editingDelegate?.email} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="delegatePhone">Téléphone</Label>
                        <Input id="delegatePhone" defaultValue={editingDelegate?.phone} />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="delegateActive" defaultChecked={editingDelegate?.active ?? true} />
                      <Label htmlFor="delegateActive">Délégué actif</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDelegateDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={() => {
                      setIsDelegateDialogOpen(false);
                    }}>
                      {editingDelegate ? 'Enregistrer' : 'Créer'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Compagnie</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDelegates.map(delegate => (
                    <TableRow key={delegate.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-muted-foreground" />
                          {delegate.username}
                        </div>
                      </TableCell>
                      <TableCell>{delegate.company_name}</TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {delegate.email}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {delegate.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={delegate.active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                        }>
                          {delegate.active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingDelegate(delegate);
                              setIsDelegateDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer le délégué ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible. Le délégué {delegate.username} sera définitivement supprimé.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => {
                                    // TODO: add deleteDelegate API call when available
                                    queryClient.invalidateQueries({ queryKey: ['delegates'] });
                                  }}
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
