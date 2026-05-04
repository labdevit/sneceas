import { useEffect, useMemo, useState } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
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
  ShieldCheck,
  Mail,
  Phone,
  Loader2,
  X
} from 'lucide-react';
import {
  createProfile,
  createProfileForm,
  createUserFromAdmin,
  createUserRole,
  deleteUserRole,
  fetchProfiles,
  fetchRoles,
  fetchUserRoles,
  fetchUsers,
  setPassword,
  updateProfile,
  updateProfileForm,
  updateUser,
  type ApiRole,
  type ApiUserListItem,
  type ApiUserProfile,
  type ApiUserRole,
} from '@/lib/api/users';
import {
  createCompany,
  deleteCompany,
  fetchCompanies,
  updateCompany,
  type ApiCompany,
} from '@/lib/api/companies';
import {
  createPole,
  deletePole,
  fetchPoles,
  updatePole,
  type ApiPole,
} from '@/lib/api/poles';
import {
  createDelegate,
  deleteDelegate,
  fetchDelegates,
  updateDelegate,
  type ApiDelegate,
} from '@/lib/api/delegates';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Admin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');

  // Data fetching
  const {
    data: usersList = [],
    isLoading: usersLoading,
    isError: usersIsError,
    error: usersError,
  } = useQuery<ApiUserListItem[]>({
    queryKey: ['users'],
    queryFn: () => fetchUsers({ page_size: '1000' }),
  });

  const { data: profilesList = [], isLoading: profilesLoading } = useQuery<ApiUserProfile[]>({
    queryKey: ['profiles'],
    queryFn: () => fetchProfiles({ page_size: '1000' }),
    enabled: activeTab === 'users',
  });

  const { data: companiesList = [], isLoading: companiesLoading } = useQuery<ApiCompany[]>({
    queryKey: ['companies'],
    queryFn: () => fetchCompanies({ page_size: '1000' }),
  });
  const { data: polesList = [], isLoading: polesLoading } = useQuery<ApiPole[]>({
    queryKey: ['poles'],
    queryFn: () => fetchPoles({ page_size: '1000' }),
  });
  const { data: delegatesList = [], isLoading: delegatesLoading } = useQuery<ApiDelegate[]>({
    queryKey: ['delegates'],
    queryFn: () => fetchDelegates({ page_size: '1000' }),
  });

  const { data: rolesList = [] } = useQuery<ApiRole[]>({
    queryKey: ['roles'],
    queryFn: () => fetchRoles(),
    enabled: activeTab === 'roles',
  });

  const { data: userRolesList = [], isLoading: userRolesLoading } = useQuery<ApiUserRole[]>({
    queryKey: ['user-roles'],
    queryFn: () => fetchUserRoles({ page_size: '1000' }),
    enabled: activeTab === 'roles',
  });

  const isLoading = usersLoading || profilesLoading || companiesLoading || polesLoading || delegatesLoading;

  // Pagination (shared page size)
  const PAGE_SIZE = 10;
  const USERS_PAGE_SIZE = PAGE_SIZE;
  const [usersPage, setUsersPage] = useState(1);
  const [companiesPage, setCompaniesPage] = useState(1);
  const [polesPage, setPolesPage] = useState(1);
  const [rolesPage, setRolesPage] = useState(1);

  // Users state
  const [editingUser, setEditingUser] = useState<ApiUserListItem | null>(null);
  const [editingProfile, setEditingProfile] = useState<ApiUserProfile | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);

  const [userAccountForm, setUserAccountForm] = useState({
    name: '',
    email: '',
    is_active: true,
    password: '',
    confirmPassword: '',
    company: '',
  });

  const emptyProfileForm = useMemo(
    () =>
      ({
        phone: '',
        first_name: '',
        last_name: '',
        birth_date: null,
        birth_place: '',
        gender: '',
        nationality: '',
        id_number: '',
        residential_address: '',
        bio: '',
        job_title: '',
        department: '',
        contract_type: '',
        hire_date: null,
        employee_id: '',
        workplace: '',
        first_membership: false,
        previous_union: false,
        previous_union_name: '',
        membership_motivation: '',
        accepted_rules: false,
        consent_data: false,
        membership_date: null,
        preferred_language: 'fr',
      }) satisfies Partial<ApiUserProfile>,
    [],
  );

  const [profileForm, setProfileForm] = useState<Partial<ApiUserProfile>>(emptyProfileForm);
  const [profileFiles, setProfileFiles] = useState<Record<string, File | null>>({});

  const apiRoot = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/?api\/?$/, '');
  const fileUrl = (value?: string | null) => {
    if (!value) return null;
    if (value.startsWith('http')) return value;
    if (!apiRoot) return value;
    return value.startsWith('/') ? `${apiRoot}${value}` : `${apiRoot}/${value}`;
  };

  // Companies state
  const [editingCompany, setEditingCompany] = useState<ApiCompany | null>(null);
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    sector: '',
    active: true,
  });

  // Poles state
  const [editingPole, setEditingPole] = useState<ApiPole | null>(null);
  const [isPoleDialogOpen, setIsPoleDialogOpen] = useState(false);
  const [poleForm, setPoleForm] = useState({
    name: '',
    description: '',
    manager: '__none__' as string,
    active: true,
  });

  // Delegates state
  const [editingDelegate, setEditingDelegate] = useState<ApiDelegate | null>(null);
  const [isDelegateDialogOpen, setIsDelegateDialogOpen] = useState(false);
  const [delegateForm, setDelegateForm] = useState({
    user: '' as string,
    company: '' as string,
    email: '',
    phone: '',
    active: true,
  });

  // Roles state
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [roleFormUser, setRoleFormUser] = useState('');
  const [roleFormRole, setRoleFormRole] = useState('');
  const [roleFormScope, setRoleFormScope] = useState<'global' | 'pole' | 'company'>('global');
  const [roleFormPole, setRoleFormPole] = useState('');
  const [roleFormCompany, setRoleFormCompany] = useState('');

  const addUserRoleMutation = useMutation({
    mutationFn: async () => {
      if (!roleFormUser || !roleFormRole) throw new Error('Utilisateur et rôle requis');
      return createUserRole({
        user: Number(roleFormUser),
        role: roleFormRole,
        scope: roleFormScope,
        ...(roleFormScope === 'pole' && roleFormPole ? { pole: roleFormPole } : {}),
        ...(roleFormScope === 'company' && roleFormCompany ? { company: roleFormCompany } : {}),
      });
    },
    onSuccess: (newRole) => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      // Sync vue pôles si c'est un rôle de pôle
      if (roleFormScope === 'pole') {
        queryClient.invalidateQueries({ queryKey: ['poles'] });
      }
      toast({ title: 'Rôle attribué avec succès' });
      setIsRoleDialogOpen(false);
      setRoleFormUser('');
      setRoleFormRole('');
      setRoleFormScope('global');
      setRoleFormPole('');
      setRoleFormCompany('');
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error?.message ?? "Impossible d'attribuer le rôle.",
        variant: 'destructive',
      });
    },
  });

  const removeUserRoleMutation = useMutation({
    mutationFn: (id: string) => deleteUserRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['poles'] });
      toast({ title: 'Rôle retiré' });
    },
    onError: () => toast({ title: 'Erreur lors de la suppression', variant: 'destructive' }),
  });

  // Group user roles by user for display
  const userRolesGrouped = useMemo(() => {
    const map = new Map<string, ApiUserRole[]>();
    for (const ur of userRolesList) {
      const key = ur.username;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ur);
    }
    return map;
  }, [userRolesList]);

  useEffect(() => {
    if (!isUserDialogOpen) return;
    if (!editingUser) {
      // Mode création
      setUserAccountForm({ name: '', email: '', is_active: true, password: '', confirmPassword: '', company: '' });
      setEditingProfile(null);
      setProfileForm(emptyProfileForm);
      setProfileFiles({});
      return;
    }

    setUserAccountForm({
      name: editingUser.name ?? '',
      email: editingUser.email ?? '',
      is_active: editingUser.is_active ?? true,
      password: '',
      confirmPassword: '',
      company: '',
    });

    const profile = profilesList.find((p) => p.user === editingUser.id) ?? null;
    setEditingProfile(profile);
    setProfileForm(profile ? { ...emptyProfileForm, ...profile } : emptyProfileForm);
    setProfileFiles({});
  }, [editingUser, emptyProfileForm, isUserDialogOpen, profilesList]);

  useEffect(() => {
    if (!isCompanyDialogOpen) return;
    setCompanyForm({
      name: editingCompany?.name ?? '',
      sector: editingCompany?.sector ?? '',
      active: editingCompany?.active ?? true,
    });
  }, [editingCompany, isCompanyDialogOpen]);

  useEffect(() => {
    if (!isPoleDialogOpen) return;
    setPoleForm({
      name: editingPole?.name ?? '',
      description: editingPole?.description ?? '',
      manager: editingPole?.manager ? String(editingPole.manager) : '__none__',
      active: editingPole?.active ?? true,
    });
  }, [editingPole, isPoleDialogOpen]);

  useEffect(() => {
    if (!isDelegateDialogOpen) return;
    setDelegateForm({
      user: editingDelegate?.user ? String(editingDelegate.user) : '',
      company: editingDelegate?.company ?? '',
      email: editingDelegate?.email ?? '',
      phone: editingDelegate?.phone ?? '',
      active: editingDelegate?.active ?? true,
    });
  }, [editingDelegate, isDelegateDialogOpen]);

  const saveUserMutation = useMutation({
    mutationFn: async () => {
      if (editingUser) {
        // ── Mode édition ──
        await updateUser(editingUser.username, {
          name: userAccountForm.name,
          email: userAccountForm.email,
          is_active: userAccountForm.is_active,
        });

        const hasFiles = Object.values(profileFiles).some(Boolean);
        const profilePayload: Partial<ApiUserProfile> = {
          phone: profileForm.phone ?? '',
          first_name: profileForm.first_name ?? '',
          last_name: profileForm.last_name ?? '',
          birth_date: (profileForm.birth_date as any) ?? null,
          birth_place: profileForm.birth_place ?? '',
          gender: profileForm.gender ?? '',
          nationality: profileForm.nationality ?? '',
          id_number: profileForm.id_number ?? '',
          residential_address: profileForm.residential_address ?? '',
          bio: profileForm.bio ?? '',
          job_title: profileForm.job_title ?? '',
          department: profileForm.department ?? '',
          contract_type: profileForm.contract_type ?? '',
          hire_date: (profileForm.hire_date as any) ?? null,
          employee_id: profileForm.employee_id ?? '',
          workplace: profileForm.workplace ?? '',
          first_membership: Boolean(profileForm.first_membership),
          previous_union: Boolean(profileForm.previous_union),
          previous_union_name: profileForm.previous_union_name ?? '',
          membership_motivation: profileForm.membership_motivation ?? '',
          accepted_rules: Boolean(profileForm.accepted_rules),
          consent_data: Boolean(profileForm.consent_data),
          membership_date: (profileForm.membership_date as any) ?? null,
          preferred_language: profileForm.preferred_language ?? 'fr',
        };

        if (editingProfile?.id) {
          if (hasFiles) {
            const fd = new FormData();
            Object.entries(profilePayload).forEach(([k, v]) => {
              if (v === undefined || v === null) return;
              if (typeof v === 'boolean') fd.append(k, v ? 'true' : 'false');
              else fd.append(k, String(v));
            });
            Object.entries(profileFiles).forEach(([k, f]) => {
              if (f) fd.append(k, f);
            });
            await updateProfileForm(editingProfile.id, fd);
          } else {
            await updateProfile(editingProfile.id, profilePayload);
          }
        } else {
          if (hasFiles) {
            const fd = new FormData();
            fd.append('user', String(editingUser.id));
            Object.entries(profilePayload).forEach(([k, v]) => {
              if (v === undefined || v === null) return;
              if (typeof v === 'boolean') fd.append(k, v ? 'true' : 'false');
              else fd.append(k, String(v));
            });
            Object.entries(profileFiles).forEach(([k, f]) => {
              if (f) fd.append(k, f);
            });
            await createProfileForm(fd);
          } else {
            await createProfile({ user: editingUser.id, ...profilePayload });
          }
        }

        // Set password if provided (edit mode)
        if (userAccountForm.password.trim()) {
          if (userAccountForm.password.trim() !== userAccountForm.confirmPassword.trim()) {
            throw new Error('Les mots de passe ne correspondent pas');
          }
          const profile = profilesList.find((p) => p.user === editingUser.id);
          if (profile?.id) {
            await setPassword(profile.id, userAccountForm.password.trim());
          }
        }
      } else {
        // ── Mode création ──
        if (!userAccountForm.email.trim()) throw new Error('Email requis');
        if (!userAccountForm.password.trim() || userAccountForm.password.trim().length < 8) {
          throw new Error('Le mot de passe doit contenir au moins 8 caractères');
        }
        if (userAccountForm.password.trim() !== userAccountForm.confirmPassword.trim()) {
          throw new Error('Les mots de passe ne correspondent pas');
        }

        await createUserFromAdmin({
          name: userAccountForm.name.trim(),
          email: userAccountForm.email.trim(),
          password: userAccountForm.password.trim(),
          first_name: (profileForm.first_name ?? '').trim() || undefined,
          last_name: (profileForm.last_name ?? '').trim() || undefined,
          phone: (profileForm.phone ?? '').trim() || undefined,
          is_active: userAccountForm.is_active,
          company: userAccountForm.company || undefined,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast({ title: editingUser ? 'Utilisateur mis à jour' : 'Utilisateur créé' });
      setIsUserDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error?.message ?? 'Impossible de sauvegarder.',
        variant: 'destructive',
      });
    },
  });

  const saveCompanyMutation = useMutation({
    mutationFn: async () => {
      if (!companyForm.name.trim()) throw new Error('Nom requis');
      if (editingCompany) {
        return updateCompany(editingCompany.id, {
          name: companyForm.name.trim(),
          sector: companyForm.sector.trim() || undefined,
          active: companyForm.active,
        });
      }
      return createCompany({
        name: companyForm.name.trim(),
        sector: companyForm.sector.trim() || undefined,
        active: companyForm.active,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast({ title: editingCompany ? 'Compagnie mise à jour' : 'Compagnie créée' });
      setIsCompanyDialogOpen(false);
    },
    onError: () => toast({ title: 'Erreur lors de la sauvegarde', variant: 'destructive' }),
  });

  const savePoleMutation = useMutation({
    mutationFn: async () => {
      if (!poleForm.name.trim()) throw new Error('Nom requis');
      const payload = {
        name: poleForm.name.trim(),
        description: poleForm.description.trim() || undefined,
        manager: poleForm.manager && poleForm.manager !== '__none__' ? Number(poleForm.manager) : undefined,
        active: poleForm.active,
      };
      if (editingPole) {
        return updatePole(editingPole.id, payload);
      }
      return createPole(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poles'] });
      toast({ title: editingPole ? 'Pôle mis à jour' : 'Pôle créé' });
      setIsPoleDialogOpen(false);
    },
    onError: () => toast({ title: 'Erreur lors de la sauvegarde', variant: 'destructive' }),
  });

  const saveDelegateMutation = useMutation({
    mutationFn: async () => {
      if (!delegateForm.user || !delegateForm.company) throw new Error('Utilisateur et compagnie requis');
      const payload = {
        user: Number(delegateForm.user),
        company: delegateForm.company,
        email: delegateForm.email.trim() || undefined,
        phone: delegateForm.phone.trim() || undefined,
        active: delegateForm.active,
      };
      if (editingDelegate) {
        return updateDelegate(editingDelegate.id, payload);
      }
      return createDelegate(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegates'] });
      toast({ title: editingDelegate ? 'Délégué mis à jour' : 'Délégué créé' });
      setIsDelegateDialogOpen(false);
    },
    onError: () => toast({ title: 'Erreur lors de la sauvegarde', variant: 'destructive' }),
  });

  const filteredUsers = usersList.filter(user =>
    (user.name || user.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const usersTotalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PAGE_SIZE));
  const safeUsersPage = Math.min(usersPage, usersTotalPages);
  const pagedUsers = filteredUsers.slice((safeUsersPage - 1) * USERS_PAGE_SIZE, safeUsersPage * USERS_PAGE_SIZE);

  const filteredCompanies = companiesList.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const companiesTotalPages = Math.max(1, Math.ceil(filteredCompanies.length / PAGE_SIZE));
  const safeCompaniesPage = Math.min(companiesPage, companiesTotalPages);
  const pagedCompanies = filteredCompanies.slice((safeCompaniesPage - 1) * PAGE_SIZE, safeCompaniesPage * PAGE_SIZE);

  const filteredPoles = polesList.filter(pole =>
    pole.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const polesTotalPages = Math.max(1, Math.ceil(filteredPoles.length / PAGE_SIZE));
  const safePolesPage = Math.min(polesPage, polesTotalPages);
  const pagedPoles = filteredPoles.slice((safePolesPage - 1) * PAGE_SIZE, safePolesPage * PAGE_SIZE);

  const filteredDelegates = delegatesList.filter(delegate =>
    (delegate.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (delegate.company_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (delegate.email || '').toLowerCase().includes(searchQuery.toLowerCase())
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
          onChange={(e) => { setSearchQuery(e.target.value); setUsersPage(1); setCompaniesPage(1); setPolesPage(1); setRolesPage(1); }}
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

      {usersIsError && (
        <Alert variant="destructive">
          <AlertTitle>Impossible de charger la liste des utilisateurs</AlertTitle>
          <AlertDescription>
            {usersError instanceof Error ? usersError.message : 'Erreur inconnue.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 max-w-3xl">
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
          {/* <TabsTrigger value="delegates" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Délégués</span>
          </TabsTrigger> */}
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Rôles</span>
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
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>{editingUser ? 'Modifier' : 'Ajouter'} un utilisateur</DialogTitle>
                    <DialogDescription>
                      {editingUser ? 'Modifiez les informations de l\'utilisateur' : 'Créez un nouveau compte utilisateur'}
                    </DialogDescription>
                  </DialogHeader>
                  {(editingUser || !editingUser) && (
                    <ScrollArea className="max-h-[70vh] pr-2">
                      <div className="grid gap-4 py-4">
                        {editingUser && (
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Username</Label>
                              <Input value={editingUser.username} disabled className="bg-muted" />
                            </div>
                            <div className="flex items-center gap-3 pt-7">
                              <Switch
                                checked={userAccountForm.is_active}
                                onCheckedChange={(value) =>
                                  setUserAccountForm((prev) => ({ ...prev, is_active: value }))
                                }
                              />
                              <Label>Utilisateur actif</Label>
                            </div>
                          </div>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Nom affiché</Label>
                            <Input
                              value={userAccountForm.name}
                              onChange={(e) =>
                                setUserAccountForm((prev) => ({ ...prev, name: e.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Email {!editingUser && '*'}</Label>
                            <Input
                              type="email"
                              value={userAccountForm.email}
                              onChange={(e) =>
                                setUserAccountForm((prev) => ({ ...prev, email: e.target.value }))
                              }
                            />
                          </div>
                        </div>

                        {!editingUser && (
                          <div className="space-y-2">
                            <Label>Compagnie</Label>
                            <Select
                              value={userAccountForm.company}
                              onValueChange={(value) =>
                                setUserAccountForm((prev) => ({ ...prev, company: value === '__none__' ? '' : value }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionnez une compagnie (optionnel)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">— Aucune —</SelectItem>
                                {companiesList.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>
                              {editingUser ? 'Nouveau mot de passe' : 'Mot de passe *'}
                            </Label>
                            <Input
                              type="password"
                              placeholder={editingUser ? 'Laisser vide pour ne pas changer' : 'Minimum 8 caractères'}
                              value={userAccountForm.password}
                              onChange={(e) =>
                                setUserAccountForm((prev) => ({ ...prev, password: e.target.value }))
                              }
                            />
                            {editingUser && (
                              <p className="text-xs text-muted-foreground">
                                Laisser vide pour conserver le mot de passe actuel
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>
                              {editingUser ? 'Confirmer nouveau mot de passe' : 'Confirmer mot de passe *'}
                            </Label>
                            <Input
                              type="password"
                              placeholder="Répétez le mot de passe"
                              value={userAccountForm.confirmPassword}
                              onChange={(e) =>
                                setUserAccountForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                              }
                            />
                            {userAccountForm.password && userAccountForm.confirmPassword &&
                              userAccountForm.password !== userAccountForm.confirmPassword && (
                              <p className="text-xs text-destructive">Les mots de passe ne correspondent pas</p>
                            )}
                          </div>
                        </div>

                        {!editingUser && (
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={userAccountForm.is_active}
                              onCheckedChange={(value) =>
                                setUserAccountForm((prev) => ({ ...prev, is_active: value }))
                              }
                            />
                            <Label>Utilisateur actif</Label>
                          </div>
                        )}

                        <div className="border-t pt-4 grid gap-4">
                          <div className="text-sm font-medium">Profil (champs étendus)</div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Téléphone</Label>
                              <Input
                                value={profileForm.phone ?? ''}
                                onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Langue préférée</Label>
                              <Select
                                value={profileForm.preferred_language ?? 'fr'}
                                onValueChange={(value) =>
                                  setProfileForm((p) => ({ ...p, preferred_language: value }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Choisir" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fr">Français</SelectItem>
                                  <SelectItem value="en">English</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Prénom</Label>
                              <Input
                                value={profileForm.first_name ?? ''}
                                onChange={(e) =>
                                  setProfileForm((p) => ({ ...p, first_name: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Nom</Label>
                              <Input
                                value={profileForm.last_name ?? ''}
                                onChange={(e) =>
                                  setProfileForm((p) => ({ ...p, last_name: e.target.value }))
                                }
                              />
                            </div>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Date de naissance</Label>
                              <Input
                                type="date"
                                value={(profileForm.birth_date as any) ?? ''}
                                onChange={(e) =>
                                  setProfileForm((p) => ({
                                    ...p,
                                    birth_date: e.target.value || null,
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Lieu de naissance</Label>
                              <Input
                                value={profileForm.birth_place ?? ''}
                                onChange={(e) =>
                                  setProfileForm((p) => ({ ...p, birth_place: e.target.value }))
                                }
                              />
                            </div>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Sexe</Label>
                              <Select
                                value={profileForm.gender ?? ''}
                                onValueChange={(value) =>
                                  setProfileForm((p) => ({ ...p, gender: value }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="masculin">Masculin</SelectItem>
                                  <SelectItem value="feminin">Féminin</SelectItem>
                                  <SelectItem value="autre">Autre</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Nationalité</Label>
                              <Input
                                value={profileForm.nationality ?? ''}
                                onChange={(e) =>
                                  setProfileForm((p) => ({ ...p, nationality: e.target.value }))
                                }
                              />
                            </div>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label>N° pièce d'identité</Label>
                              <Input
                                value={profileForm.id_number ?? ''}
                                onChange={(e) =>
                                  setProfileForm((p) => ({ ...p, id_number: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Adresse</Label>
                              <Input
                                value={profileForm.residential_address ?? ''}
                                onChange={(e) =>
                                  setProfileForm((p) => ({
                                    ...p,
                                    residential_address: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Bio</Label>
                            <Textarea
                              value={profileForm.bio ?? ''}
                              onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                            />
                          </div>

                          <div className="border-t pt-4 grid gap-4">
                            <div className="text-sm font-medium">Informations professionnelles</div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label>Poste</Label>
                                <Input
                                  value={profileForm.job_title ?? ''}
                                  onChange={(e) =>
                                    setProfileForm((p) => ({ ...p, job_title: e.target.value }))
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Département</Label>
                                <Input
                                  value={profileForm.department ?? ''}
                                  onChange={(e) =>
                                    setProfileForm((p) => ({ ...p, department: e.target.value }))
                                  }
                                />
                              </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label>Type de contrat</Label>
                                <Input
                                  value={profileForm.contract_type ?? ''}
                                  onChange={(e) =>
                                    setProfileForm((p) => ({ ...p, contract_type: e.target.value }))
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Date d'embauche</Label>
                                <Input
                                  type="date"
                                  value={(profileForm.hire_date as any) ?? ''}
                                  onChange={(e) =>
                                    setProfileForm((p) => ({ ...p, hire_date: e.target.value || null }))
                                  }
                                />
                              </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label>Matricule interne</Label>
                                <Input
                                  value={profileForm.employee_id ?? ''}
                                  onChange={(e) =>
                                    setProfileForm((p) => ({ ...p, employee_id: e.target.value }))
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Lieu de travail</Label>
                                <Input
                                  value={profileForm.workplace ?? ''}
                                  onChange={(e) =>
                                    setProfileForm((p) => ({ ...p, workplace: e.target.value }))
                                  }
                                />
                              </div>
                            </div>
                          </div>

                          <div className="border-t pt-4 grid gap-4">
                            <div className="text-sm font-medium">Situation syndicale</div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="flex items-center gap-3 pt-2">
                                <Switch
                                  checked={Boolean(profileForm.first_membership)}
                                  onCheckedChange={(value) =>
                                    setProfileForm((p) => ({ ...p, first_membership: value }))
                                  }
                                />
                                <Label>Première adhésion</Label>
                              </div>
                              <div className="flex items-center gap-3 pt-2">
                                <Switch
                                  checked={Boolean(profileForm.previous_union)}
                                  onCheckedChange={(value) =>
                                    setProfileForm((p) => ({ ...p, previous_union: value }))
                                  }
                                />
                                <Label>Ancien syndicat</Label>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Nom ancien syndicat</Label>
                              <Input
                                value={profileForm.previous_union_name ?? ''}
                                onChange={(e) =>
                                  setProfileForm((p) => ({ ...p, previous_union_name: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Motivation</Label>
                              <Textarea
                                value={profileForm.membership_motivation ?? ''}
                                onChange={(e) =>
                                  setProfileForm((p) => ({
                                    ...p,
                                    membership_motivation: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>

                          <div className="border-t pt-4 grid gap-4">
                            <div className="text-sm font-medium">Engagement</div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="flex items-center gap-3 pt-2">
                                <Switch
                                  checked={Boolean(profileForm.accepted_rules)}
                                  onCheckedChange={(value) =>
                                    setProfileForm((p) => ({ ...p, accepted_rules: value }))
                                  }
                                />
                                <Label>Statuts et règlement</Label>
                              </div>
                              <div className="flex items-center gap-3 pt-2">
                                <Switch
                                  checked={Boolean(profileForm.consent_data)}
                                  onCheckedChange={(value) =>
                                    setProfileForm((p) => ({ ...p, consent_data: value }))
                                  }
                                />
                                <Label>Consentement données</Label>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Date d'adhésion</Label>
                              <Input
                                type="date"
                                value={(profileForm.membership_date as any) ?? ''}
                                onChange={(e) =>
                                  setProfileForm((p) => ({ ...p, membership_date: e.target.value || null }))
                                }
                              />
                            </div>
                          </div>

                          <div className="border-t pt-4 grid gap-4">
                            <div className="text-sm font-medium">Pièces jointes</div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label>Avatar</Label>
                                <Input
                                  type="file"
                                  onChange={(e) =>
                                    setProfileFiles((prev) => ({
                                      ...prev,
                                      avatar: e.target.files?.[0] ?? null,
                                    }))
                                  }
                                />
                                {fileUrl(editingProfile?.avatar) && (
                                  <a
                                    href={fileUrl(editingProfile?.avatar) ?? ''}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm text-primary hover:underline"
                                  >
                                    Voir l'avatar
                                  </a>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Signature</Label>
                                <Input
                                  type="file"
                                  onChange={(e) =>
                                    setProfileFiles((prev) => ({
                                      ...prev,
                                      signature: e.target.files?.[0] ?? null,
                                    }))
                                  }
                                />
                                {fileUrl(editingProfile?.signature) && (
                                  <a
                                    href={fileUrl(editingProfile?.signature) ?? ''}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm text-primary hover:underline"
                                  >
                                    Voir la signature
                                  </a>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Pièce d'identité</Label>
                                <Input
                                  type="file"
                                  onChange={(e) =>
                                    setProfileFiles((prev) => ({
                                      ...prev,
                                      id_document: e.target.files?.[0] ?? null,
                                    }))
                                  }
                                />
                                {fileUrl(editingProfile?.id_document) && (
                                  <a
                                    href={fileUrl(editingProfile?.id_document) ?? ''}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm text-primary hover:underline"
                                  >
                                    Voir le document
                                  </a>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Contrat de travail</Label>
                                <Input
                                  type="file"
                                  onChange={(e) =>
                                    setProfileFiles((prev) => ({
                                      ...prev,
                                      work_contract: e.target.files?.[0] ?? null,
                                    }))
                                  }
                                />
                                {fileUrl(editingProfile?.work_contract) && (
                                  <a
                                    href={fileUrl(editingProfile?.work_contract) ?? ''}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm text-primary hover:underline"
                                  >
                                    Voir le contrat
                                  </a>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Photo d'identité</Label>
                                <Input
                                  type="file"
                                  onChange={(e) =>
                                    setProfileFiles((prev) => ({
                                      ...prev,
                                      id_photo: e.target.files?.[0] ?? null,
                                    }))
                                  }
                                />
                                {fileUrl(editingProfile?.id_photo) && (
                                  <a
                                    href={fileUrl(editingProfile?.id_photo) ?? ''}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm text-primary hover:underline"
                                  >
                                    Voir la photo
                                  </a>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Dernier bulletin de salaire</Label>
                                <Input
                                  type="file"
                                  onChange={(e) =>
                                    setProfileFiles((prev) => ({
                                      ...prev,
                                      last_payslip: e.target.files?.[0] ?? null,
                                    }))
                                  }
                                />
                                {fileUrl(editingProfile?.last_payslip) && (
                                  <a
                                    href={fileUrl(editingProfile?.last_payslip) ?? ''}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm text-primary hover:underline"
                                  >
                                    Voir le bulletin
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button
                      onClick={() => saveUserMutation.mutate()}
                      disabled={saveUserMutation.isPending}
                    >
                      {saveUserMutation.isPending ? 'Enregistrement...' : (editingUser ? 'Enregistrer' : 'Créer')}
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
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.name || user.username}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {user.email || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={user.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                        }>
                          {user.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {usersTotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {safeUsersPage} / {usersTotalPages} — {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                      disabled={safeUsersPage === 1}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUsersPage((p) => Math.min(usersTotalPages, p + 1))}
                      disabled={safeUsersPage === usersTotalPages}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
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
                      <Input
                        id="companyName"
                        value={companyForm.name}
                        onChange={(e) => setCompanyForm((p) => ({ ...p, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companySector">Secteur</Label>
                      <Input
                        id="companySector"
                        value={companyForm.sector}
                        onChange={(e) => setCompanyForm((p) => ({ ...p, sector: e.target.value }))}
                        placeholder="Ex: Agroalimentaire, Transport..."
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={companyForm.active}
                        onCheckedChange={(value) => setCompanyForm((p) => ({ ...p, active: value }))}
                      />
                      <Label>Compagnie active</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCompanyDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button
                      onClick={() => saveCompanyMutation.mutate()}
                      disabled={saveCompanyMutation.isPending}
                    >
                      {saveCompanyMutation.isPending
                        ? 'Enregistrement...'
                        : editingCompany
                          ? 'Enregistrer'
                          : 'Créer'}
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
                  {pagedCompanies.map(company => (
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
              {companiesTotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {safeCompaniesPage} / {companiesTotalPages} — {filteredCompanies.length} compagnie{filteredCompanies.length > 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCompaniesPage(p => Math.max(1, p - 1))} disabled={safeCompaniesPage === 1}>Précédent</Button>
                    <Button variant="outline" size="sm" onClick={() => setCompaniesPage(p => Math.min(companiesTotalPages, p + 1))} disabled={safeCompaniesPage === companiesTotalPages}>Suivant</Button>
                  </div>
                </div>
              )}
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
                      <Input
                        id="poleName"
                        value={poleForm.name}
                        onChange={(e) => setPoleForm((p) => ({ ...p, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="poleDescription">Description</Label>
                      <Textarea
                        id="poleDescription"
                        value={poleForm.description}
                        onChange={(e) => setPoleForm((p) => ({ ...p, description: e.target.value }))}
                        placeholder="Décrivez les responsabilités de ce pôle..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Responsable (optionnel)</Label>
                      <Select
                        value={poleForm.manager}
                        onValueChange={(value) => setPoleForm((p) => ({ ...p, manager: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un utilisateur" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Aucun</SelectItem>
                          {usersList
                            .filter((u) => u.id > 0)
                            .map((u) => (
                              <SelectItem key={u.id} value={String(u.id)}>
                                {u.name || u.username}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={poleForm.active}
                        onCheckedChange={(value) => setPoleForm((p) => ({ ...p, active: value }))}
                      />
                      <Label>Pôle actif</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsPoleDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button
                      onClick={() => savePoleMutation.mutate()}
                      disabled={savePoleMutation.isPending}
                    >
                      {savePoleMutation.isPending
                        ? 'Enregistrement...'
                        : editingPole
                          ? 'Enregistrer'
                          : 'Créer'}
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
                  {pagedPoles.map(pole => (
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
              {polesTotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {safePolesPage} / {polesTotalPages} — {filteredPoles.length} pôle{filteredPoles.length > 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPolesPage(p => Math.max(1, p - 1))} disabled={safePolesPage === 1}>Précédent</Button>
                    <Button variant="outline" size="sm" onClick={() => setPolesPage(p => Math.min(polesTotalPages, p + 1))} disabled={safePolesPage === polesTotalPages}>Suivant</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delegates Tab */}
        {/* <TabsContent value="delegates">
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
                      <Select
                        value={delegateForm.user}
                        onValueChange={(value) => setDelegateForm((p) => ({ ...p, user: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un utilisateur" />
                        </SelectTrigger>
                        <SelectContent>
                          {usersList.map(user => (
                            <SelectItem
                              key={user.id}
                              value={user.id.toString()}
                              disabled={user.id < 0}
                            >
                              {user.name || user.username}{user.id < 0 ? ' (ID indisponible)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="delegateCompany">Compagnie</Label>
                      <Select
                        value={delegateForm.company}
                        onValueChange={(value) => setDelegateForm((p) => ({ ...p, company: value }))}
                      >
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
                        <Input
                          id="delegateEmail"
                          type="email"
                          value={delegateForm.email}
                          onChange={(e) => setDelegateForm((p) => ({ ...p, email: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="delegatePhone">Téléphone</Label>
                        <Input
                          id="delegatePhone"
                          value={delegateForm.phone}
                          onChange={(e) => setDelegateForm((p) => ({ ...p, phone: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="delegateActive"
                        checked={delegateForm.active}
                        onCheckedChange={(value) => setDelegateForm((p) => ({ ...p, active: value }))}
                      />
                      <Label htmlFor="delegateActive">Délégué actif</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDelegateDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button
                      onClick={() => saveDelegateMutation.mutate()}
                      disabled={saveDelegateMutation.isPending}
                    >
                      {saveDelegateMutation.isPending
                        ? 'Enregistrement...'
                        : editingDelegate
                          ? 'Enregistrer'
                          : 'Créer'}
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
                          {delegate.username || `Utilisateur #${delegate.user}`}
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
                                  onClick={async () => {
                                    try {
                                      await deleteDelegate(delegate.id);
                                      queryClient.invalidateQueries({ queryKey: ['delegates'] });
                                      toast({ title: 'Délégué supprimé' });
                                    } catch {
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
        </TabsContent> */}

        {/* Roles Tab */}
        <TabsContent value="roles">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gestion des rôles</CardTitle>
                <CardDescription>
                  Attribuez plusieurs rôles par utilisateur — les permissions sont cumulatives (inclusives).
                </CardDescription>
              </div>
              <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setRoleFormUser('');
                    setRoleFormRole('');
                    setRoleFormScope('global');
                    setRoleFormPole('');
                    setRoleFormCompany('');
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Attribuer un rôle
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Attribuer un rôle</DialogTitle>
                    <DialogDescription>
                      Sélectionnez un utilisateur et le rôle à lui attribuer.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Utilisateur</Label>
                      <Select value={roleFormUser} onValueChange={setRoleFormUser}>
                        <SelectTrigger><SelectValue placeholder="Choisir un utilisateur" /></SelectTrigger>
                        <SelectContent>
                          {usersList.map(u => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {u.name || u.username} ({u.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Rôle</Label>
                      <Select value={roleFormRole} onValueChange={setRoleFormRole}>
                        <SelectTrigger><SelectValue placeholder="Choisir un rôle" /></SelectTrigger>
                        <SelectContent>
                          {rolesList.map(r => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Portée</Label>
                      <Select value={roleFormScope} onValueChange={(v) => setRoleFormScope(v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="global">Global</SelectItem>
                          <SelectItem value="pole">Pôle</SelectItem>
                          <SelectItem value="company">Compagnie</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {roleFormScope === 'pole' && (
                      <div className="space-y-2">
                        <Label>Pôle</Label>
                        <Select value={roleFormPole} onValueChange={setRoleFormPole}>
                          <SelectTrigger><SelectValue placeholder="Choisir un pôle" /></SelectTrigger>
                          <SelectContent>
                            {polesList.map(p => (
                              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {roleFormScope === 'company' && (
                      <div className="space-y-2">
                        <Label>Compagnie</Label>
                        <Select value={roleFormCompany} onValueChange={setRoleFormCompany}>
                          <SelectTrigger><SelectValue placeholder="Choisir une compagnie" /></SelectTrigger>
                          <SelectContent>
                            {companiesList.map(c => (
                              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>Annuler</Button>
                    <Button
                      onClick={() => addUserRoleMutation.mutate()}
                      disabled={addUserRoleMutation.isPending || !roleFormUser || !roleFormRole}
                    >
                      {addUserRoleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Attribuer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {userRolesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : userRolesList.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucune attribution de rôle trouvée.
                </p>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    const filteredRoles = Array.from(userRolesGrouped.entries())
                      .filter(([username]) => username.toLowerCase().includes(searchQuery.toLowerCase()));
                    const rolesTotalPages = Math.max(1, Math.ceil(filteredRoles.length / PAGE_SIZE));
                    const safeRolesPage = Math.min(rolesPage, rolesTotalPages);
                    const pagedRoles = filteredRoles.slice((safeRolesPage - 1) * PAGE_SIZE, safeRolesPage * PAGE_SIZE);
                    return (<>
                  {pagedRoles.map(([username, roles]) => (
                      <div key={username} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">{username}</span>
                          <span className="text-xs text-muted-foreground">
                            — {roles.length} rôle{roles.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {roles.map((ur) => (
                            <Badge key={ur.id} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                              <ShieldCheck className="w-3 h-3" />
                              {ur.role_name}
                              {ur.scope !== 'global' && (
                                <span className="text-xs opacity-70 ml-1">
                                  ({ur.scope}{ur.scope === 'pole' && ur.pole ? ` — ${polesList.find(p => String(p.id) === ur.pole)?.name ?? ur.pole}` : ''}{ur.scope === 'company' && ur.company ? ` — ${companiesList.find(c => String(c.id) === ur.company)?.name ?? ur.company}` : ''})
                                </span>
                              )}
                              <button
                                type="button"
                                className="ml-1 hover:text-destructive transition-colors"
                                onClick={() => removeUserRoleMutation.mutate(ur.id)}
                                title="Retirer ce rôle"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  {rolesTotalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <p className="text-sm text-muted-foreground">
                        Page {safeRolesPage} / {rolesTotalPages} — {filteredRoles.length} utilisateur{filteredRoles.length > 1 ? 's' : ''}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setRolesPage(p => Math.max(1, p - 1))} disabled={safeRolesPage === 1}>Précédent</Button>
                        <Button variant="outline" size="sm" onClick={() => setRolesPage(p => Math.min(rolesTotalPages, p + 1))} disabled={safeRolesPage === rolesTotalPages}>Suivant</Button>
                      </div>
                    </div>
                  )}
                  </>);
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
