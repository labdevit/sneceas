import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Briefcase,
  FileText,
  Upload,
  Loader2,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMyProfile, updateMyProfileForm, type ApiUserProfile } from '@/lib/api/users';
import { resolveFileUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  );
}

function FileField({
  label,
  currentUrl,
  onChange,
}: {
  label: string;
  currentUrl: string | null | undefined;
  onChange: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</Label>
      <div className="flex items-center gap-2">
        {currentUrl && (
          <a
            href={resolveFileUrl(currentUrl)}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary underline hover:no-underline truncate max-w-[200px]"
          >
            Voir le fichier
          </a>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => ref.current?.click()}
        >
          <Upload className="w-3.5 h-3.5 mr-1" />
          {currentUrl ? 'Remplacer' : 'Uploader'}
        </Button>
        <input
          ref={ref}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onChange(f);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function Profile() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});

  const { data: profile, isLoading } = useQuery<ApiUserProfile>({
    queryKey: ['my-profile'],
    queryFn: fetchMyProfile,
  });

  const [form, setForm] = useState<Partial<ApiUserProfile>>({});
  const isDirty = Object.keys(form).length > 0 || Object.keys(pendingFiles).length > 0;

  // Merge profile defaults with any local edits
  const val = (field: keyof ApiUserProfile) =>
    (form[field] as string | null | undefined) ?? (profile?.[field] as string | null | undefined) ?? '';

  const boolVal = (field: keyof ApiUserProfile) =>
    field in form ? Boolean(form[field]) : Boolean(profile?.[field]);

  const set = (field: keyof ApiUserProfile, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const addFile = (field: string, file: File) =>
    setPendingFiles((prev) => ({ ...prev, [field]: file }));

  const saveMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      // Only send changed text fields
      for (const [k, v] of Object.entries(form)) {
        if (v === null || v === undefined) continue;
        if (typeof v === 'boolean') fd.append(k, v ? 'true' : 'false');
        else fd.append(k, String(v));
      }
      // Always include file uploads
      for (const [k, f] of Object.entries(pendingFiles)) {
        fd.append(k, f);
      }
      return updateMyProfileForm(fd);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['my-profile'], updated);
      setForm({});
      setPendingFiles({});
      toast({ title: 'Profil mis à jour', description: 'Vos informations ont été enregistrées.' });
    },
    onError: () =>
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder.', variant: 'destructive' }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12 text-muted-foreground">Profil introuvable.</div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon profil</h1>
        <p className="text-muted-foreground mt-1">
          Consultez et complétez vos informations personnelles.
        </p>
      </div>

      {/* Rôle & compagnie */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="w-5 h-5 text-primary" />
          Rôle et appartenance
        </div>
        <div className="flex flex-wrap gap-2">
          {user?.roles?.length ? (
            user.roles.map((r, i) => (
              <Badge key={i} variant="secondary">
                {r.role_name}
                {r.company_name ? ` — ${r.company_name}` : ''}
                {r.pole_name ? ` / ${r.pole_name}` : ''}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">Aucun rôle attribué</span>
          )}
        </div>
        {user?.email && (
          <div className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            {user.email}
          </div>
        )}
      </div>

      {/* Informations personnelles */}
      <section className="bg-card border rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 font-semibold">
          <User className="w-5 h-5 text-muted-foreground" />
          Informations personnelles
        </div>
        <Separator />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Prénom">
            <Input value={val('first_name')} onChange={(e) => set('first_name', e.target.value)} />
          </Field>
          <Field label="Nom">
            <Input value={val('last_name')} onChange={(e) => set('last_name', e.target.value)} />
          </Field>
          <Field label="Téléphone">
            <Input value={val('phone')} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label="Date de naissance">
            <Input
              type="date"
              value={val('birth_date')}
              onChange={(e) => set('birth_date', e.target.value || null)}
            />
          </Field>
          <Field label="Lieu de naissance">
            <Input value={val('birth_place')} onChange={(e) => set('birth_place', e.target.value)} />
          </Field>
          <Field label="Genre">
            <Select value={val('gender')} onValueChange={(v) => set('gender', v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Masculin</SelectItem>
                <SelectItem value="F">Féminin</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Nationalité">
            <Input value={val('nationality')} onChange={(e) => set('nationality', e.target.value)} />
          </Field>
          <Field label="Numéro pièce d'identité">
            <Input value={val('id_number')} onChange={(e) => set('id_number', e.target.value)} />
          </Field>
          <Field label="Adresse de résidence">
            <Input value={val('residential_address')} onChange={(e) => set('residential_address', e.target.value)} />
          </Field>
        </div>
      </section>

      {/* Informations professionnelles */}
      <section className="bg-card border rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 font-semibold">
          <Briefcase className="w-5 h-5 text-muted-foreground" />
          Informations professionnelles
        </div>
        <Separator />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Poste">
            <Input value={val('job_title')} onChange={(e) => set('job_title', e.target.value)} />
          </Field>
          <Field label="Département">
            <Input value={val('department')} onChange={(e) => set('department', e.target.value)} />
          </Field>
          <Field label="Type de contrat">
            <Input value={val('contract_type')} onChange={(e) => set('contract_type', e.target.value)} />
          </Field>
          <Field label="Date d'embauche">
            <Input
              type="date"
              value={val('hire_date')}
              onChange={(e) => set('hire_date', e.target.value || null)}
            />
          </Field>
          <Field label="Matricule">
            <Input value={val('employee_id')} onChange={(e) => set('employee_id', e.target.value)} />
          </Field>
          <Field label="Lieu de travail">
            <Input value={val('workplace')} onChange={(e) => set('workplace', e.target.value)} />
          </Field>
        </div>
      </section>

      {/* Adhésion syndicale */}
      <section className="bg-card border rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="w-5 h-5 text-muted-foreground" />
          Adhésion syndicale
        </div>
        <Separator />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <Label>Première adhésion</Label>
            <Switch checked={boolVal('first_membership')} onCheckedChange={(v) => set('first_membership', v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Ancien syndicat</Label>
            <Switch checked={boolVal('previous_union')} onCheckedChange={(v) => set('previous_union', v)} />
          </div>
          {boolVal('previous_union') && (
            <Field label="Nom de l'ancien syndicat">
              <Input value={val('previous_union_name')} onChange={(e) => set('previous_union_name', e.target.value)} />
            </Field>
          )}
          <Field label="Date d'adhésion">
            <Input
              type="date"
              value={val('membership_date')}
              onChange={(e) => set('membership_date', e.target.value || null)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Motivation d'adhésion">
              <Textarea
                value={val('membership_motivation')}
                onChange={(e) => set('membership_motivation', e.target.value)}
                rows={3}
              />
            </Field>
          </div>
          <div className="flex items-center justify-between">
            <Label>Engagement aux statuts</Label>
            <Switch checked={boolVal('accepted_rules')} onCheckedChange={(v) => set('accepted_rules', v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Consentement données</Label>
            <Switch checked={boolVal('consent_data')} onCheckedChange={(v) => set('consent_data', v)} />
          </div>
        </div>
      </section>

      {/* Documents */}
      <section className="bg-card border rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 font-semibold">
          <FileText className="w-5 h-5 text-muted-foreground" />
          Documents
        </div>
        <Separator />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FileField
            label="Photo de profil"
            currentUrl={profile.avatar}
            onChange={(f) => addFile('avatar', f)}
          />
          <FileField
            label="Signature"
            currentUrl={profile.signature}
            onChange={(f) => addFile('signature', f)}
          />
          <FileField
            label="Pièce d'identité"
            currentUrl={profile.id_document}
            onChange={(f) => addFile('id_document', f)}
          />
          <FileField
            label="Contrat de travail"
            currentUrl={profile.work_contract}
            onChange={(f) => addFile('work_contract', f)}
          />
          <FileField
            label="Photo d'identité"
            currentUrl={profile.id_photo}
            onChange={(f) => addFile('id_photo', f)}
          />
          <FileField
            label="Dernier bulletin de salaire"
            currentUrl={profile.last_payslip}
            onChange={(f) => addFile('last_payslip', f)}
          />
        </div>
      </section>

      {/* Sauvegarder */}
      <div className="flex justify-end pb-8">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!isDirty || saveMutation.isPending}
          className={cn(!isDirty && 'opacity-50')}
        >
          {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Enregistrer les modifications
        </Button>
      </div>
    </div>
  );
}
