import { useEffect, useState } from 'react';
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
  Mail,
  Phone
} from 'lucide-react';
import { companies, poles, delegates, users as mockUsers } from '@/lib/mock-data';
import type { User, Company, Pole, Delegate, UserRole } from '@/types';
import { apiRequest } from '@/lib/api';

type ApiCompany = {
  id: number;
  nom: string;
  code: string;
};

type ApiProfile = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  user_email?: string;
  nom?: string;
  prenom?: string;
  date_naissance?: string;
  lieu_naissance?: string;
  sexe?: string;
  nationalite?: string;
  numero_piece_identite?: string;
  adresse_residence?: string;
  email?: string;
  telephone?: string;
  poste?: string;
  departement?: string;
  type_contrat?: string;
  date_embauche?: string;
  matricule_interne?: string;
  lieu_travail?: string;
  premiere_adhesion?: boolean;
  ancien_syndicat?: boolean;
  nom_ancien_syndicat?: string;
  motivation_adhesion?: string;
  engagement_statuts?: boolean;
  consentement_donnees?: boolean;
  date_adhesion?: string;
  photo?: string;
  signature?: string;
  piece_identite?: string;
  contrat_travail?: string;
  photo_identite?: string;
  dernier_bulletin_salaire?: string;
  role?: UserRole;
  is_active?: boolean;
  entreprise?: {
    id: number;
    nom: string;
    code: string;
  } | null;
  created_at?: string;
};

type ApiPole = {
  id: number;
  nom: string;
  description?: string;
};

type ApiDelegate = {
  id: number;
  user_id: number;
  user?: string;
  user_first_name?: string;
  user_last_name?: string;
  user_email?: string;
  entreprise?: {
    id: number;
    nom: string;
    code: string;
  } | null;
  entreprise_id?: number;
  telephone?: string;
  email?: string;
  is_active?: boolean;
};

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrateur',
  pole_manager: 'Responsable Pôle',
  head: 'Chef de pôle (membre)',
  assistant: 'Assistant de pôle',
  delegate: 'Délégué',
  member: 'Membre',
};

const roleBadgeVariants: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  pole_manager: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  head: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  assistant: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  delegate: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  member: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

export default function Admin() {
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');

  // Users state
  const [usersList, setUsersList] = useState<User[]>(mockUsers);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyId: '',
    role: 'member' as UserRole,
    password: '',
    isActive: true,
    date_naissance: '',
    lieu_naissance: '',
    sexe: '',
    nationalite: '',
    numero_piece_identite: '',
    adresse_residence: '',
    poste: '',
    departement: '',
    type_contrat: '',
    date_embauche: '',
    matricule_interne: '',
    lieu_travail: '',
    premiere_adhesion: true,
    ancien_syndicat: false,
    nom_ancien_syndicat: '',
    motivation_adhesion: '',
    engagement_statuts: false,
    consentement_donnees: false,
    date_adhesion: '',
  });
  const [userFiles, setUserFiles] = useState<Record<string, File | null>>({});

  // Companies state
  const [companiesList, setCompaniesList] = useState<Company[]>(companies);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    code: '',
  });

  // Poles state
  const [polesList, setPolesList] = useState<Pole[]>(poles);
  const [editingPole, setEditingPole] = useState<Pole | null>(null);
  const [isPoleDialogOpen, setIsPoleDialogOpen] = useState(false);
  const [poleForm, setPoleForm] = useState({
    name: '',
    description: '',
  });

  // Delegates state
  const [delegatesList, setDelegatesList] = useState<Delegate[]>(delegates);
  const [editingDelegate, setEditingDelegate] = useState<Delegate | null>(null);
  const [isDelegateDialogOpen, setIsDelegateDialogOpen] = useState(false);
  const [delegateForm, setDelegateForm] = useState({
    userId: '',
    companyId: '',
    email: '',
    phone: '',
    isActive: true,
  });

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const data = await apiRequest<{ results: ApiCompany[] }>('/entreprises/');
        setCompaniesList(
          data.results.map((company) => ({
            id: company.id.toString(),
            name: company.nom,
            code: company.code,
          }))
        );
      } catch {
        setCompaniesList(companies);
      }
    };

    const loadUsers = async () => {
      try {
        const data = await apiRequest<{ results: ApiProfile[] }>('/profils/');
        const mapped = data.results.map((profile) => ({
          id: profile.id.toString(),
          firstName: profile.prenom ?? '',
          lastName: profile.nom ?? '',
          email: profile.email ?? profile.user_email ?? '',
          phone: profile.telephone ?? '',
          companyId: profile.entreprise?.id?.toString() ?? '',
          role: profile.role ?? 'member',
          isActive: profile.is_active ?? true,
          createdAt: profile.created_at ? new Date(profile.created_at) : new Date(),
        }));
        setUsersList(mapped);
        return mapped;
      } catch {
        setUsersList(mockUsers);
        return mockUsers;
      }
    };

    const loadPoles = async () => {
      try {
        const data = await apiRequest<{ results: ApiPole[] }>('/poles/');
        setPolesList(
          data.results.map((pole) => ({
            id: pole.id.toString(),
            name: pole.nom,
            description: pole.description ?? '',
          }))
        );
      } catch {
        setPolesList(poles);
      }
    };

    const loadDelegates = async (usersSource: User[]) => {
      try {
        const data = await apiRequest<{ results: ApiDelegate[] }>('/delegues/');
        const fromDelegues = data.results.map((delegate) => {
          const user = usersSource.find((u) => u.id === delegate.user_id?.toString());
          const company = delegate.entreprise
            ? {
                id: delegate.entreprise.id.toString(),
                name: delegate.entreprise.nom,
                code: delegate.entreprise.code,
              }
            : { id: '', name: 'N/A', code: '' };
          return {
            id: delegate.id.toString(),
            userId: delegate.user_id?.toString() ?? '',
            user: user ?? {
              id: delegate.user_id?.toString() ?? '',
              firstName: delegate.user_first_name ?? '',
              lastName: delegate.user_last_name ?? '',
              email: delegate.user_email ?? delegate.email ?? '',
              companyId: company.id,
              role: 'delegate',
              createdAt: new Date(),
            },
            companyId: company.id,
            company,
            phone: delegate.telephone ?? '',
            email: delegate.email ?? delegate.user_email ?? '',
            isActive: delegate.is_active ?? true,
          };
        });

        const fromProfiles = usersSource
          .filter((user) => user.role === 'delegate')
          .map((user) => ({
            id: `profile-${user.id}`,
            userId: user.id,
            user,
            companyId: user.companyId,
            company: companiesList.find((c) => c.id === user.companyId) ?? {
              id: user.companyId,
              name: 'N/A',
              code: '',
            },
            phone: user.phone ?? '',
            email: user.email ?? '',
            isActive: (user as any).isActive ?? true,
          }));

        const merged = [...fromDelegues];
        const existingUserIds = new Set(fromDelegues.map((d) => d.userId));
        fromProfiles.forEach((profile) => {
          if (!existingUserIds.has(profile.userId)) {
            merged.push(profile);
          }
        });
        setDelegatesList(merged);
      } catch {
        setDelegatesList(delegates);
      }
    };

    const loadAll = async () => {
      await loadCompanies();
      const usersSource = await loadUsers();
      await loadPoles();
      await loadDelegates(usersSource);
    };

    loadAll();
  }, []);

  useEffect(() => {
    if (editingUser) {
      setUserForm({
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        email: editingUser.email,
        phone: editingUser.phone ?? '',
        companyId: editingUser.companyId ?? '',
        role: editingUser.role ?? 'member',
        password: '',
        isActive: (editingUser as any).isActive ?? true,
        date_naissance: '',
        lieu_naissance: '',
        sexe: '',
        nationalite: '',
        numero_piece_identite: '',
        adresse_residence: '',
        poste: '',
        departement: '',
        type_contrat: '',
        date_embauche: '',
        matricule_interne: '',
        lieu_travail: '',
        premiere_adhesion: true,
        ancien_syndicat: false,
        nom_ancien_syndicat: '',
        motivation_adhesion: '',
        engagement_statuts: false,
        consentement_donnees: false,
        date_adhesion: '',
      });
    } else {
      setUserForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        companyId: '',
        role: 'member',
        password: '',
        isActive: true,
        date_naissance: '',
        lieu_naissance: '',
        sexe: '',
        nationalite: '',
        numero_piece_identite: '',
        adresse_residence: '',
        poste: '',
        departement: '',
        type_contrat: '',
        date_embauche: '',
        matricule_interne: '',
        lieu_travail: '',
        premiere_adhesion: true,
        ancien_syndicat: false,
        nom_ancien_syndicat: '',
        motivation_adhesion: '',
        engagement_statuts: false,
        consentement_donnees: false,
        date_adhesion: '',
      });
    }
    setUserFiles({});
  }, [editingUser, isUserDialogOpen]);

  useEffect(() => {
    if (editingCompany) {
      setCompanyForm({
        name: editingCompany.name,
        code: editingCompany.code,
      });
    } else {
      setCompanyForm({ name: '', code: '' });
    }
  }, [editingCompany, isCompanyDialogOpen]);

  useEffect(() => {
    if (editingPole) {
      setPoleForm({
        name: editingPole.name,
        description: editingPole.description ?? '',
      });
    } else {
      setPoleForm({ name: '', description: '' });
    }
  }, [editingPole, isPoleDialogOpen]);

  useEffect(() => {
    if (editingDelegate) {
      setDelegateForm({
        userId: editingDelegate.userId,
        companyId: editingDelegate.companyId,
        email: editingDelegate.email,
        phone: editingDelegate.phone,
        isActive: editingDelegate.isActive,
      });
    } else {
      setDelegateForm({
        userId: '',
        companyId: '',
        email: '',
        phone: '',
        isActive: true,
      });
    }
  }, [editingDelegate, isDelegateDialogOpen]);

  const getCompanyName = (companyId: string) => {
    return companiesList.find(c => c.id === companyId)?.name || 'N/A';
  };

  const handleSaveUser = async () => {
    if (!userForm.firstName || !userForm.lastName || !userForm.email) {
      return;
    }
    if (editingUser) {
      const payload = new FormData();
      payload.append('prenom', userForm.firstName);
      payload.append('nom', userForm.lastName);
      payload.append('email', userForm.email);
      payload.append('telephone', userForm.phone);
      payload.append('role', userForm.role);
      payload.append('is_active', userForm.isActive ? 'true' : 'false');
      if (userForm.companyId) {
        payload.append('entreprise_id', userForm.companyId);
      }
      if (userForm.date_naissance) payload.append('date_naissance', userForm.date_naissance);
      if (userForm.lieu_naissance) payload.append('lieu_naissance', userForm.lieu_naissance);
      if (userForm.sexe) payload.append('sexe', userForm.sexe);
      if (userForm.nationalite) payload.append('nationalite', userForm.nationalite);
      if (userForm.numero_piece_identite) payload.append('numero_piece_identite', userForm.numero_piece_identite);
      if (userForm.adresse_residence) payload.append('adresse_residence', userForm.adresse_residence);
      if (userForm.poste) payload.append('poste', userForm.poste);
      if (userForm.departement) payload.append('departement', userForm.departement);
      if (userForm.type_contrat) payload.append('type_contrat', userForm.type_contrat);
      if (userForm.date_embauche) payload.append('date_embauche', userForm.date_embauche);
      if (userForm.matricule_interne) payload.append('matricule_interne', userForm.matricule_interne);
      if (userForm.lieu_travail) payload.append('lieu_travail', userForm.lieu_travail);
      payload.append('premiere_adhesion', userForm.premiere_adhesion ? 'true' : 'false');
      payload.append('ancien_syndicat', userForm.ancien_syndicat ? 'true' : 'false');
      if (userForm.nom_ancien_syndicat) payload.append('nom_ancien_syndicat', userForm.nom_ancien_syndicat);
      if (userForm.motivation_adhesion) payload.append('motivation_adhesion', userForm.motivation_adhesion);
      payload.append('engagement_statuts', userForm.engagement_statuts ? 'true' : 'false');
      payload.append('consentement_donnees', userForm.consentement_donnees ? 'true' : 'false');
      if (userForm.date_adhesion) payload.append('date_adhesion', userForm.date_adhesion);
      Object.entries(userFiles).forEach(([key, file]) => {
        if (file) {
          payload.append(key, file);
        }
      });
      const updated = await apiRequest<ApiProfile>(`/profils/${editingUser.id}/`, {
        method: 'PATCH',
        body: payload,
      });
      if (userForm.role === 'delegate' && userForm.companyId) {
        try {
          await apiRequest('/delegues/', {
            method: 'POST',
            body: JSON.stringify({
              user_id: Number(editingUser.id),
              entreprise_id: Number(userForm.companyId),
              email: userForm.email,
              telephone: userForm.phone,
              is_active: true,
            }),
          });
        } catch {
          // ignore if already exists
        }
      }
      setUsersList((prev) =>
        prev.map((user) =>
          user.id === editingUser.id
            ? {
                ...user,
                firstName: updated.prenom ?? userForm.firstName,
                lastName: updated.nom ?? userForm.lastName,
                email: updated.email ?? userForm.email,
                phone: updated.telephone ?? userForm.phone,
                role: updated.role ?? userForm.role,
                companyId: updated.entreprise?.id?.toString() ?? userForm.companyId,
              }
            : user
        )
      );
    } else {
      if (!userForm.password) {
        return;
      }
      const created = await apiRequest<ApiProfile>('/profils/create-user/', {
        method: 'POST',
        body: JSON.stringify({
          first_name: userForm.firstName,
          last_name: userForm.lastName,
          email: userForm.email,
          telephone: userForm.phone,
          entreprise_id: userForm.companyId ? Number(userForm.companyId) : null,
          role: userForm.role,
          password: userForm.password,
          is_active: userForm.isActive,
        }),
      });
      if (userForm.role === 'delegate' && userForm.companyId) {
        try {
          await apiRequest('/delegues/', {
            method: 'POST',
            body: JSON.stringify({
              user_id: created.id,
              entreprise_id: Number(userForm.companyId),
              email: userForm.email,
              telephone: userForm.phone,
              is_active: true,
            }),
          });
        } catch {
          // ignore if already exists
        }
      }
      setUsersList((prev) => [
        ...prev,
        {
          id: created.id.toString(),
          firstName: created.prenom ?? userForm.firstName,
          lastName: created.nom ?? userForm.lastName,
          email: created.email ?? userForm.email,
          phone: created.telephone ?? userForm.phone,
          role: created.role ?? userForm.role,
          companyId: created.entreprise?.id?.toString() ?? userForm.companyId,
          createdAt: created.created_at ? new Date(created.created_at) : new Date(),
        },
      ]);
    }
    setIsUserDialogOpen(false);
  };

  const handleEditUser = async (user: User) => {
    setEditingUser(user);
    setIsUserDialogOpen(true);
    try {
      const profile = await apiRequest<ApiProfile>(`/profils/${user.id}/`);
      setEditingUserProfile(profile);
      setUserForm((prev) => ({
        ...prev,
        firstName: profile.prenom ?? user.firstName,
        lastName: profile.nom ?? user.lastName,
        email: profile.email ?? user.email,
        phone: profile.telephone ?? user.phone ?? '',
        companyId: profile.entreprise?.id?.toString() ?? user.companyId ?? '',
        role: profile.role ?? user.role,
        isActive: profile.is_active ?? true,
        date_naissance: profile.date_naissance ?? '',
        lieu_naissance: profile.lieu_naissance ?? '',
        sexe: profile.sexe ?? '',
        nationalite: profile.nationalite ?? '',
        numero_piece_identite: profile.numero_piece_identite ?? '',
        adresse_residence: profile.adresse_residence ?? '',
        poste: profile.poste ?? '',
        departement: profile.departement ?? '',
        type_contrat: profile.type_contrat ?? '',
        date_embauche: profile.date_embauche ?? '',
        matricule_interne: profile.matricule_interne ?? '',
        lieu_travail: profile.lieu_travail ?? '',
        premiere_adhesion: profile.premiere_adhesion ?? true,
        ancien_syndicat: profile.ancien_syndicat ?? false,
        nom_ancien_syndicat: profile.nom_ancien_syndicat ?? '',
        motivation_adhesion: profile.motivation_adhesion ?? '',
        engagement_statuts: profile.engagement_statuts ?? false,
        consentement_donnees: profile.consentement_donnees ?? false,
        date_adhesion: profile.date_adhesion ?? '',
      }));
    } catch {
      setEditingUserProfile(null);
      // fallback to basic user data
    }
  };

  const handleDeleteUser = async (userId: string) => {
    await apiRequest(`/profils/${userId}/`, { method: 'DELETE' });
    setUsersList((prev) => prev.filter((user) => user.id !== userId));
  };

  const [selectedUserProfile, setSelectedUserProfile] = useState<ApiProfile | null>(null);
  const [isUserDetailsOpen, setIsUserDetailsOpen] = useState(false);
  const [editingUserProfile, setEditingUserProfile] = useState<ApiProfile | null>(null);

  const fileUrl = (value?: string) => {
    if (!value) {
      return null;
    }
    if (value.startsWith('http')) {
      return value;
    }
    return `http://127.0.0.1:8000${value}`;
  };

  const handleViewUser = async (userId: string) => {
    const data = await apiRequest<ApiProfile>(`/profils/${userId}/`);
    setSelectedUserProfile(data);
    setIsUserDetailsOpen(true);
  };

  const handleSaveCompany = async () => {
    if (!companyForm.name || !companyForm.code) {
      return;
    }
    if (editingCompany) {
      const updated = await apiRequest<ApiCompany>(`/entreprises/${editingCompany.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          nom: companyForm.name,
          code: companyForm.code,
        }),
      });
      setCompaniesList((prev) =>
        prev.map((company) =>
          company.id === editingCompany.id
            ? { ...company, name: updated.nom ?? companyForm.name, code: updated.code ?? companyForm.code }
            : company
        )
      );
    } else {
      const created = await apiRequest<ApiCompany>('/entreprises/', {
        method: 'POST',
        body: JSON.stringify({
          nom: companyForm.name,
          code: companyForm.code,
          adresse: 'N/A',
          secteur_activite: 'Assurance',
        }),
      });
      setCompaniesList((prev) => [
        ...prev,
        { id: created.id.toString(), name: created.nom, code: created.code },
      ]);
    }
    setIsCompanyDialogOpen(false);
  };

  const handleDeleteCompany = async (companyId: string) => {
    await apiRequest(`/entreprises/${companyId}/`, { method: 'DELETE' });
    setCompaniesList((prev) => prev.filter((company) => company.id !== companyId));
  };

  const handleSavePole = async () => {
    if (!poleForm.name) {
      return;
    }
    if (editingPole) {
      try {
        const updated = await apiRequest<{ id: number; nom: string; description?: string }>(
          `/poles/${editingPole.id}/`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              nom: poleForm.name,
              description: poleForm.description,
              types_problemes: [],
            }),
          }
        );
        setPolesList((prev) =>
          prev.map((pole) =>
            pole.id === editingPole.id
              ? { ...pole, name: updated.nom, description: updated.description ?? poleForm.description }
              : pole
          )
        );
        setIsPoleDialogOpen(false);
      } catch {
        return;
      }
    } else {
      try {
        const created = await apiRequest<{ id: number; nom: string; description?: string }>(
          '/poles/',
          {
            method: 'POST',
            body: JSON.stringify({
              nom: poleForm.name,
              description: poleForm.description,
              types_problemes: [],
            }),
          }
        );
        setPolesList((prev) => [
          ...prev,
          { id: created.id.toString(), name: created.nom, description: created.description },
        ]);
        setIsPoleDialogOpen(false);
      } catch {
        return;
      }
    }
  };

  const handleDeletePole = async (poleId: string) => {
    try {
      await apiRequest(`/poles/${poleId}/`, { method: 'DELETE' });
      setPolesList((prev) => prev.filter((pole) => pole.id !== poleId));
    } catch {
      return;
    }
  };

  const handleSaveDelegate = async () => {
    if (!delegateForm.userId || !delegateForm.companyId) {
      return;
    }
    const payload = {
      user_id: Number(delegateForm.userId),
      entreprise_id: Number(delegateForm.companyId),
      email: delegateForm.email,
      telephone: delegateForm.phone,
      is_active: delegateForm.isActive,
    };
    if (editingDelegate) {
      const updated = await apiRequest<ApiDelegate>(`/delegues/${editingDelegate.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setDelegatesList((prev) =>
        prev.map((delegate) =>
          delegate.id === editingDelegate.id
            ? {
                ...delegate,
                userId: updated.user_id?.toString() ?? delegateForm.userId,
                companyId: updated.entreprise?.id?.toString() ?? delegateForm.companyId,
                company: updated.entreprise
                  ? { id: updated.entreprise.id.toString(), name: updated.entreprise.nom, code: updated.entreprise.code }
                  : delegate.company,
                email: updated.email ?? delegateForm.email,
                phone: updated.telephone ?? delegateForm.phone,
                isActive: updated.is_active ?? delegateForm.isActive,
              }
            : delegate
        )
      );
      if (updated.user_id) {
        setUsersList((prev) =>
          prev.map((user) =>
            user.id === updated.user_id?.toString()
              ? { ...user, role: 'delegate' }
              : user
          )
        );
      }
    } else {
      const created = await apiRequest<ApiDelegate>('/delegues/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const user = usersList.find((u) => u.id === created.user_id?.toString());
      const company = created.entreprise
        ? { id: created.entreprise.id.toString(), name: created.entreprise.nom, code: created.entreprise.code }
        : { id: delegateForm.companyId, name: 'N/A', code: '' };
      setDelegatesList((prev) => [
        ...prev,
        {
          id: created.id.toString(),
          userId: created.user_id?.toString() ?? delegateForm.userId,
          user: user ?? {
            id: delegateForm.userId,
            firstName: '',
            lastName: '',
            email: delegateForm.email,
            companyId: delegateForm.companyId,
            role: 'member',
            createdAt: new Date(),
          },
          companyId: company.id,
          company,
          phone: created.telephone ?? delegateForm.phone,
          email: created.email ?? delegateForm.email,
          isActive: created.is_active ?? delegateForm.isActive,
        },
      ]);
      if (created.user_id) {
        setUsersList((prev) =>
          prev.map((user) =>
            user.id === created.user_id?.toString()
              ? { ...user, role: 'delegate' }
              : user
          )
        );
      }
    }
    setIsDelegateDialogOpen(false);
  };

  const handleDeleteDelegate = async (delegateId: string) => {
    await apiRequest(`/delegues/${delegateId}/`, { method: 'DELETE' });
    setDelegatesList((prev) => prev.filter((delegate) => delegate.id !== delegateId));
  };

  const filteredUsers = usersList.filter(user => 
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCompanies = companiesList.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPoles = polesList.filter(pole =>
    pole.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDelegates = delegatesList.filter(delegate =>
    `${delegate.user.firstName} ${delegate.user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
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
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>{editingUser ? 'Modifier' : 'Ajouter'} un utilisateur</DialogTitle>
                    <DialogDescription>
                      {editingUser ? 'Modifiez les informations de l\'utilisateur' : 'Créez un nouveau compte utilisateur'}
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-[70vh] pr-2">
                    <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Prénom</Label>
                        <Input
                          id="firstName"
                          value={userForm.firstName}
                          onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Nom</Label>
                        <Input
                          id="lastName"
                          value={userForm.lastName}
                          onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={userForm.email}
                        onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input
                        id="phone"
                        value={userForm.phone}
                        onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company">Compagnie</Label>
                        <Select
                          value={userForm.companyId}
                          onValueChange={(value) => setUserForm({ ...userForm, companyId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            {companiesList.map(company => (
                              <SelectItem key={company.id} value={company.id.toString()}>
                                {company.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Rôle</Label>
                        <Select
                          value={userForm.role}
                          onValueChange={(value) => setUserForm({ ...userForm, role: value as UserRole })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrateur</SelectItem>
                            <SelectItem value="pole_manager">Responsable Pôle</SelectItem>
                            <SelectItem value="head">Chef de pôle (membre)</SelectItem>
                            <SelectItem value="assistant">Assistant de pôle</SelectItem>
                            <SelectItem value="delegate">Délégué</SelectItem>
                            <SelectItem value="member">Membre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {!editingUser && (
                      <div className="space-y-2">
                        <Label htmlFor="password">Mot de passe</Label>
                        <Input
                          id="password"
                          type="password"
                          value={userForm.password}
                          onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        />
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="userActive"
                        checked={userForm.isActive}
                        onCheckedChange={(value) => setUserForm({ ...userForm, isActive: value })}
                      />
                      <Label htmlFor="userActive">Utilisateur actif</Label>
                    </div>
                    <div className="border-t pt-4 space-y-4">
                      <div className="text-sm font-medium">Informations personnelles</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="dateNaissance">Date de naissance</Label>
                          <Input
                            id="dateNaissance"
                            type="date"
                            value={userForm.date_naissance}
                            onChange={(e) => setUserForm({ ...userForm, date_naissance: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lieuNaissance">Lieu de naissance</Label>
                          <Input
                            id="lieuNaissance"
                            value={userForm.lieu_naissance}
                            onChange={(e) => setUserForm({ ...userForm, lieu_naissance: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sexe">Sexe</Label>
                          <Select
                            value={userForm.sexe}
                            onValueChange={(value) => setUserForm({ ...userForm, sexe: value })}
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
                          <Label htmlFor="nationalite">Nationalité</Label>
                          <Input
                            id="nationalite"
                            value={userForm.nationalite}
                            onChange={(e) => setUserForm({ ...userForm, nationalite: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pieceIdentite">N° pièce d'identité</Label>
                          <Input
                            id="pieceIdentite"
                            value={userForm.numero_piece_identite}
                            onChange={(e) => setUserForm({ ...userForm, numero_piece_identite: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="adresseResidence">Adresse</Label>
                          <Input
                            id="adresseResidence"
                            value={userForm.adresse_residence}
                            onChange={(e) => setUserForm({ ...userForm, adresse_residence: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="border-t pt-4 space-y-4">
                      <div className="text-sm font-medium">Informations professionnelles</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="poste">Poste</Label>
                          <Input
                            id="poste"
                            value={userForm.poste}
                            onChange={(e) => setUserForm({ ...userForm, poste: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="departement">Département</Label>
                          <Input
                            id="departement"
                            value={userForm.departement}
                            onChange={(e) => setUserForm({ ...userForm, departement: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="typeContrat">Type de contrat</Label>
                          <Select
                            value={userForm.type_contrat}
                            onValueChange={(value) => setUserForm({ ...userForm, type_contrat: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cdi">CDI</SelectItem>
                              <SelectItem value="cdd">CDD</SelectItem>
                              <SelectItem value="stage">Stage</SelectItem>
                              <SelectItem value="journalier">Journalier</SelectItem>
                              <SelectItem value="interim">Intérim</SelectItem>
                              <SelectItem value="autre">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dateEmbauche">Date d'embauche</Label>
                          <Input
                            id="dateEmbauche"
                            type="date"
                            value={userForm.date_embauche}
                            onChange={(e) => setUserForm({ ...userForm, date_embauche: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="matriculeInterne">Matricule interne</Label>
                          <Input
                            id="matriculeInterne"
                            value={userForm.matricule_interne}
                            onChange={(e) => setUserForm({ ...userForm, matricule_interne: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lieuTravail">Lieu de travail</Label>
                          <Input
                            id="lieuTravail"
                            value={userForm.lieu_travail}
                            onChange={(e) => setUserForm({ ...userForm, lieu_travail: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="border-t pt-4 space-y-4">
                      <div className="text-sm font-medium">Situation syndicale</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="premiereAdhesion"
                            checked={userForm.premiere_adhesion}
                            onCheckedChange={(value) => setUserForm({ ...userForm, premiere_adhesion: value })}
                          />
                          <Label htmlFor="premiereAdhesion">Première adhésion</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="ancienSyndicat"
                            checked={userForm.ancien_syndicat}
                            onCheckedChange={(value) => setUserForm({ ...userForm, ancien_syndicat: value })}
                          />
                          <Label htmlFor="ancienSyndicat">Ancien syndicat</Label>
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label htmlFor="nomAncienSyndicat">Nom ancien syndicat</Label>
                          <Input
                            id="nomAncienSyndicat"
                            value={userForm.nom_ancien_syndicat}
                            onChange={(e) => setUserForm({ ...userForm, nom_ancien_syndicat: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label htmlFor="motivation">Motivation</Label>
                          <Textarea
                            id="motivation"
                            value={userForm.motivation_adhesion}
                            onChange={(e) => setUserForm({ ...userForm, motivation_adhesion: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="border-t pt-4 space-y-4">
                      <div className="text-sm font-medium">Engagement</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="engagementStatuts"
                            checked={userForm.engagement_statuts}
                            onCheckedChange={(value) => setUserForm({ ...userForm, engagement_statuts: value })}
                          />
                          <Label htmlFor="engagementStatuts">Statuts et règlement</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="consentementDonnees"
                            checked={userForm.consentement_donnees}
                            onCheckedChange={(value) => setUserForm({ ...userForm, consentement_donnees: value })}
                          />
                          <Label htmlFor="consentementDonnees">Consentement données</Label>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dateAdhesion">Date d'adhésion</Label>
                          <Input
                            id="dateAdhesion"
                            type="date"
                            value={userForm.date_adhesion}
                            onChange={(e) => setUserForm({ ...userForm, date_adhesion: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="border-t pt-4 space-y-4">
                      <div className="text-sm font-medium">Pièces jointes</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="photoProfil">Photo de profil</Label>
                          <Input
                            id="photoProfil"
                            type="file"
                            onChange={(e) => setUserFiles({ ...userFiles, photo: e.target.files?.[0] ?? null })}
                          />
                          {fileUrl(editingUserProfile?.photo) && (
                            <img
                              src={fileUrl(editingUserProfile?.photo) ?? ''}
                              alt="Photo profil"
                              className="mt-2 h-16 w-16 rounded-full object-cover"
                            />
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signature">Signature</Label>
                          <Input
                            id="signature"
                            type="file"
                            onChange={(e) => setUserFiles({ ...userFiles, signature: e.target.files?.[0] ?? null })}
                          />
                          {fileUrl(editingUserProfile?.signature) && (
                            <img
                              src={fileUrl(editingUserProfile?.signature) ?? ''}
                              alt="Signature"
                              className="mt-2 h-12 w-auto object-contain"
                            />
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pieceIdentiteFile">Pièce d'identité</Label>
                          <Input
                            id="pieceIdentiteFile"
                            type="file"
                            onChange={(e) => setUserFiles({ ...userFiles, piece_identite: e.target.files?.[0] ?? null })}
                          />
                          {fileUrl(editingUserProfile?.piece_identite) && (
                            <a
                              href={fileUrl(editingUserProfile?.piece_identite) ?? ''}
                              className="text-sm text-primary hover:underline"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Voir le document
                            </a>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contratTravail">Contrat de travail</Label>
                          <Input
                            id="contratTravail"
                            type="file"
                            onChange={(e) => setUserFiles({ ...userFiles, contrat_travail: e.target.files?.[0] ?? null })}
                          />
                          {fileUrl(editingUserProfile?.contrat_travail) && (
                            <a
                              href={fileUrl(editingUserProfile?.contrat_travail) ?? ''}
                              className="text-sm text-primary hover:underline"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Voir le document
                            </a>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="photoIdentite">Photo d'identité</Label>
                          <Input
                            id="photoIdentite"
                            type="file"
                            onChange={(e) => setUserFiles({ ...userFiles, photo_identite: e.target.files?.[0] ?? null })}
                          />
                          {fileUrl(editingUserProfile?.photo_identite) && (
                            <img
                              src={fileUrl(editingUserProfile?.photo_identite) ?? ''}
                              alt="Photo identité"
                              className="mt-2 h-16 w-16 rounded object-cover"
                            />
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bulletinSalaire">Bulletin de salaire</Label>
                          <Input
                            id="bulletinSalaire"
                            type="file"
                            onChange={(e) => setUserFiles({ ...userFiles, dernier_bulletin_salaire: e.target.files?.[0] ?? null })}
                          />
                          {fileUrl(editingUserProfile?.dernier_bulletin_salaire) && (
                            <a
                              href={fileUrl(editingUserProfile?.dernier_bulletin_salaire) ?? ''}
                              className="text-sm text-primary hover:underline"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Voir le document
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    </div>
                  </ScrollArea>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleSaveUser}>
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
                    <TableHead>Compagnie</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>{getCompanyName(user.companyId)}</TableCell>
                      <TableCell>
                        <Badge className={roleBadgeVariants[user.role]}>
                          {roleLabels[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewUser(user.id)}
                          >
                            <UserCheck className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              handleEditUser(user);
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
                                  Cette action est irréversible. L'utilisateur {user.firstName} {user.lastName} sera définitivement supprimé.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDeleteUser(user.id)}
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

        <Dialog open={isUserDetailsOpen} onOpenChange={setIsUserDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Détails utilisateur</DialogTitle>
              <DialogDescription>
                Informations complètes du profil utilisateur.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Username</div>
                    <div className="text-sm">{selectedUserProfile?.username ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Email (compte)</div>
                    <div className="text-sm">{selectedUserProfile?.user_email ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Prénom</div>
                    <div className="text-sm">{selectedUserProfile?.prenom ?? selectedUserProfile?.first_name ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Nom</div>
                    <div className="text-sm">{selectedUserProfile?.nom ?? selectedUserProfile?.last_name ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Téléphone</div>
                    <div className="text-sm">{selectedUserProfile?.telephone ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Statut</div>
                    <div className="text-sm">{selectedUserProfile?.is_active ? 'Actif' : 'Inactif'}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Entreprise</div>
                  <div className="text-sm">
                    {selectedUserProfile?.entreprise?.nom ?? '—'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Rôle</div>
                    <div className="text-sm">{selectedUserProfile?.role ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Date création</div>
                    <div className="text-sm">{selectedUserProfile?.created_at ?? '—'}</div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-2">Informations personnelles</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Date de naissance</div>
                      <div className="text-sm">{selectedUserProfile?.date_naissance ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Lieu de naissance</div>
                      <div className="text-sm">{selectedUserProfile?.lieu_naissance ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Sexe</div>
                      <div className="text-sm">{selectedUserProfile?.sexe ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Nationalité</div>
                      <div className="text-sm">{selectedUserProfile?.nationalite ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">N° pièce d'identité</div>
                      <div className="text-sm">{selectedUserProfile?.numero_piece_identite ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Adresse</div>
                      <div className="text-sm">{selectedUserProfile?.adresse_residence ?? '—'}</div>
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-2">Informations professionnelles</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Poste</div>
                      <div className="text-sm">{selectedUserProfile?.poste ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Département</div>
                      <div className="text-sm">{selectedUserProfile?.departement ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Type de contrat</div>
                      <div className="text-sm">{selectedUserProfile?.type_contrat ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Date d'embauche</div>
                      <div className="text-sm">{selectedUserProfile?.date_embauche ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Matricule</div>
                      <div className="text-sm">{selectedUserProfile?.matricule_interne ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Lieu de travail</div>
                      <div className="text-sm">{selectedUserProfile?.lieu_travail ?? '—'}</div>
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-2">Situation syndicale</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Première adhésion</div>
                      <div className="text-sm">{selectedUserProfile?.premiere_adhesion ? 'Oui' : 'Non'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Ancien syndicat</div>
                      <div className="text-sm">{selectedUserProfile?.ancien_syndicat ? 'Oui' : 'Non'}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-muted-foreground">Nom ancien syndicat</div>
                      <div className="text-sm">{selectedUserProfile?.nom_ancien_syndicat ?? '—'}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-muted-foreground">Motivation</div>
                      <div className="text-sm">{selectedUserProfile?.motivation_adhesion ?? '—'}</div>
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-2">Engagement</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Statuts</div>
                      <div className="text-sm">{selectedUserProfile?.engagement_statuts ? 'Oui' : 'Non'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Consentement données</div>
                      <div className="text-sm">{selectedUserProfile?.consentement_donnees ? 'Oui' : 'Non'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Date d'adhésion</div>
                      <div className="text-sm">{selectedUserProfile?.date_adhesion ?? '—'}</div>
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-2">Pièces jointes</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Photo de profil</div>
                      {fileUrl(selectedUserProfile?.photo) ? (
                        <img
                          src={fileUrl(selectedUserProfile?.photo) ?? ''}
                          alt="Photo profil"
                          className="mt-2 h-20 w-20 rounded-full object-cover"
                        />
                      ) : (
                        <div className="text-sm">—</div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Signature</div>
                      {fileUrl(selectedUserProfile?.signature) ? (
                        <img
                          src={fileUrl(selectedUserProfile?.signature) ?? ''}
                          alt="Signature"
                          className="mt-2 h-16 w-auto object-contain"
                        />
                      ) : (
                        <div className="text-sm">—</div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Pièce d'identité</div>
                      {fileUrl(selectedUserProfile?.piece_identite) ? (
                        <a
                          href={fileUrl(selectedUserProfile?.piece_identite) ?? ''}
                          className="text-sm text-primary hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Voir le document
                        </a>
                      ) : (
                        <div className="text-sm">—</div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Contrat de travail</div>
                      {fileUrl(selectedUserProfile?.contrat_travail) ? (
                        <a
                          href={fileUrl(selectedUserProfile?.contrat_travail) ?? ''}
                          className="text-sm text-primary hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Voir le document
                        </a>
                      ) : (
                        <div className="text-sm">—</div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Photo d'identité</div>
                      {fileUrl(selectedUserProfile?.photo_identite) ? (
                        <img
                          src={fileUrl(selectedUserProfile?.photo_identite) ?? ''}
                          alt="Photo identité"
                          className="mt-2 h-20 w-20 rounded object-cover"
                        />
                      ) : (
                        <div className="text-sm">—</div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Bulletin de salaire</div>
                      {fileUrl(selectedUserProfile?.dernier_bulletin_salaire) ? (
                        <a
                          href={fileUrl(selectedUserProfile?.dernier_bulletin_salaire) ?? ''}
                          className="text-sm text-primary hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Voir le document
                        </a>
                      ) : (
                        <div className="text-sm">—</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

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
                        onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyCode">Code</Label>
                      <Input
                        id="companyCode"
                        value={companyForm.code}
                        onChange={(e) => setCompanyForm({ ...companyForm, code: e.target.value })}
                        placeholder="Ex: AS, SA..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCompanyDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleSaveCompany}>
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
                    <TableHead>Code</TableHead>
                    <TableHead>Utilisateurs</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map(company => {
                    const userCount = usersList.filter(u => u.companyId === company.id).length;
                    return (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            {company.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{company.code}</Badge>
                        </TableCell>
                        <TableCell>{userCount} utilisateur{userCount > 1 ? 's' : ''}</TableCell>
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
                                onClick={() => handleDeleteCompany(company.id)}
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                      <Input
                        id="poleName"
                        value={poleForm.name}
                        onChange={(e) => setPoleForm({ ...poleForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="poleDescription">Description</Label>
                      <Textarea
                        id="poleDescription"
                        value={poleForm.description}
                        onChange={(e) => setPoleForm({ ...poleForm, description: e.target.value })}
                        placeholder="Décrivez les responsabilités de ce pôle..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsPoleDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleSavePole}>
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
                                onClick={() => handleDeletePole(pole.id)}
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
                      <Select
                        value={delegateForm.userId}
                        onValueChange={(value) => {
                          const selected = usersList.find((user) => user.id === value);
                          setDelegateForm((prev) => ({
                            ...prev,
                            userId: value,
                            email: selected?.email ?? prev.email,
                            phone: selected?.phone ?? prev.phone,
                            companyId: selected?.companyId ?? prev.companyId,
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un utilisateur" />
                        </SelectTrigger>
                        <SelectContent>
                          {usersList.map(user => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.firstName} {user.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="delegateCompany">Compagnie</Label>
                      <Select
                        value={delegateForm.companyId}
                        onValueChange={(value) => setDelegateForm({ ...delegateForm, companyId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une compagnie" />
                        </SelectTrigger>
                        <SelectContent>
                          {companiesList.map(company => (
                            <SelectItem key={company.id} value={company.id.toString()}>
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
                          onChange={(e) => setDelegateForm({ ...delegateForm, email: e.target.value })}
                          disabled={Boolean(delegateForm.userId)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="delegatePhone">Téléphone</Label>
                        <Input
                          id="delegatePhone"
                          value={delegateForm.phone}
                          onChange={(e) => setDelegateForm({ ...delegateForm, phone: e.target.value })}
                          disabled={Boolean(delegateForm.userId)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="delegateActive"
                        checked={delegateForm.isActive}
                        onCheckedChange={(value) => setDelegateForm({ ...delegateForm, isActive: value })}
                      />
                      <Label htmlFor="delegateActive">Délégué actif</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDelegateDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleSaveDelegate}>
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
                          {delegate.user.firstName} {delegate.user.lastName}
                        </div>
                      </TableCell>
                      <TableCell>{delegate.company.name}</TableCell>
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
                        <Badge className={delegate.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                        }>
                          {delegate.isActive ? 'Actif' : 'Inactif'}
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
                                  Cette action est irréversible. Le délégué {delegate.user.firstName} {delegate.user.lastName} sera définitivement supprimé.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDeleteDelegate(delegate.id)}
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
