import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Upload, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { fetchCompanies } from '@/lib/api/companies';
import { createTicket, type CreateTicketPayload } from '@/lib/api/tickets';
import { uploadDocument } from '@/lib/api/documents';
import { fetchProfiles } from '@/lib/api/users';
import { createHRInteraction } from '@/lib/api/hr';
import { fetchPoles } from '@/lib/api/poles';
import { fetchActivityTypes, type ActivityTypeFieldConfig } from '@/lib/api/activityTypes';
import { urgencyLabels } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useAcl } from '@/contexts/AuthContext';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const steps = [
  { id: 1, title: 'Identification', description: 'Vérifiez vos informations' },
  { id: 2, title: 'Type & Urgence', description: 'Classifiez la requête' },
  { id: 3, title: 'Détails', description: 'Décrivez la situation' },
];

const urgencyLevels = Object.entries(urgencyLabels) as [string, string][];

export default function SubmitRequest() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { can } = useAcl();
  const { user } = useAuth();
  const canClassify = can('ticket_classify');
  const canSubmitForOthers = can('submit_for_others');
  // Admins/pôle peuvent choisir n'importe quelle compagnie ; délégués sont verrouillés sur la leur
  const canChooseAnyCompany = canClassify;
  const totalSteps = steps.length;
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch companies and poles from API
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => fetchCompanies({ page_size: '1000' }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: poles = [] } = useQuery({
    queryKey: ['poles'],
    queryFn: () => fetchPoles({ page_size: '1000' }),
    staleTime: 5 * 60 * 1000,
  });

  // Form state
  const [formData, setFormData] = useState({
    companyId: '',
    poleId: '',
    workerId: '' as string,
    urgency: '' as string,
    subject: '',
    description: '',
    files: [] as File[],
  });

  const [noCompanyError, setNoCompanyError] = useState(false);
  // Champs dynamiques selon le pôle sélectionné
  const [extraData, setExtraData] = useState<Record<string, string>>({});

  // Auto-select first pole when data loads
  useEffect(() => {
    if (poles.length > 0 && !formData.poleId) {
      setFormData((prev) => ({ ...prev, poleId: poles[0].id }));
    }
  }, [poles]);

  // Auto-fill company depuis les rôles de l'utilisateur
  useEffect(() => {
    if (formData.companyId) return; // déjà défini
    const roleWithCompany = user?.roles?.find((r) => r.company_id);
    if (roleWithCompany?.company_id) {
      setFormData((prev) => ({ ...prev, companyId: roleWithCompany.company_id! }));
    } else if (!canSubmitForOthers && user) {
      // Membre sans compagnie connue
      setNoCompanyError(true);
    }
  }, [user, canSubmitForOthers]);

  // Fetch profiles filtrés par compagnie sélectionnée (uniquement si admin peut soumettre pour d'autres)
  const [profileSearch, setProfileSearch] = useState('');
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles', 'by-company', formData.companyId],
    queryFn: () => fetchProfiles({ company: formData.companyId, page_size: '500' }),
    enabled: canSubmitForOthers && !!formData.companyId,
    staleTime: 2 * 60 * 1000,
  });

  // ActivityType fields pour le pôle sélectionné
  const selectedPole = useMemo(
    () => poles.find((p) => p.id === formData.poleId),
    [poles, formData.poleId],
  );

  // Fetch tous les ActivityTypes actifs une seule fois (filtrage côté client)
  const { data: allActivityTypes = [] } = useQuery({
    queryKey: ['activity-types', 'all-active'],
    queryFn: () => fetchActivityTypes({ active: 'true', page_size: '200' }),
    staleTime: 10 * 60 * 1000,
  });

  // ActivityTypes pour le pôle sélectionné (filtrage côté client)
  const poleActivityTypes = useMemo(
    () => allActivityTypes.filter((at) => at.primary_pole === formData.poleId),
    [allActivityTypes, formData.poleId],
  );

  // ActivityType demande_habitat (champs dynamiques uniquement pour Pôle Habitat)
  const habitatActivityType = useMemo(() => {
    return poleActivityTypes.find((a) => a.code === 'demande_habitat' && a.fields_config.length > 0) ?? null;
  }, [poleActivityTypes]);

  const dynamicFields = useMemo<ActivityTypeFieldConfig[]>(() => {
    if (!habitatActivityType) return [];
    return [...habitatActivityType.fields_config].sort((x, y) => x.order - y.order);
  }, [habitatActivityType]);

  // Réinitialiser extraData quand le pôle change
  useEffect(() => {
    setExtraData({});
  }, [formData.poleId]);

  const filteredProfiles = useMemo(() => {
    if (!profileSearch.trim()) return profiles;
    const q = profileSearch.toLowerCase();
    return profiles.filter(
      (p) =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q) ||
        p.employee_id?.toLowerCase().includes(q),
    );
  }, [profiles, profileSearch]);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!formData.companyId;
      case 2:
        if (!canClassify) return true;
        return !!formData.poleId && !!formData.urgency;
      case 3: {
        if (formData.subject.length < 5 || formData.description.length < 20) return false;
        // Vérifier les champs dynamiques requis
        for (const f of dynamicFields) {
          if (f.required && !extraData[f.name]?.trim()) return false;
        }
        return true;
      }
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload: CreateTicketPayload = {
        subject: formData.subject,
        description: formData.description,
        company: formData.companyId,
        pole: formData.poleId || undefined,
        model_ticket: 'requeterh',
      };
      if (formData.urgency) {
        payload.urgency = formData.urgency as CreateTicketPayload['urgency'];
      }
      if (canSubmitForOthers) {
        if (formData.workerId) {
          const selectedProfile = profiles.find((p) => p.id === formData.workerId);
          if (selectedProfile) {
            payload.worker = selectedProfile.user;
          }
        } else if (user?.id) {
          // "Moi-même" sélectionné → se mapper comme demandeur
          payload.worker = user.id;
        }
      }

      const ticket = await createTicket(payload);

      // Créer une Interaction avec les champs dynamiques si le pôle en a
      if (dynamicFields.length > 0 && habitatActivityType) {
        try {
          await createHRInteraction({
            ticket: ticket.id,
            pole: formData.poleId || undefined,
            company: formData.companyId || undefined,
            activity_type: habitatActivityType.id,
            hr_name: user?.name || user?.username || '',
            channel: 'meeting',
            summary: formData.subject,
            extra_data: extraData,
          });
        } catch {
          // Non-bloquant
        }
      }

      // Upload any attached files
      for (const file of formData.files) {
        const form = new FormData();
        form.append('file', file);
        form.append('ticket', ticket.id);
        form.append('name', file.name);
        form.append('doc_type', 'other');
        try {
          await uploadDocument(form);
        } catch {
          // Non-blocking: ticket was created successfully; warn without failing
          toast({
            title: 'Avertissement',
            description: `Impossible d'uploader "${file.name}". Vous pouvez le joindre depuis le détail de la requête.`,
            variant: 'destructive',
          });
        }
      }

      toast({
        title: 'Requête envoyée !',
        description: `Votre requête a été soumise avec succès. Référence: ${ticket.reference}`,
      });

      navigate('/tickets');
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de soumettre la requête.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData({ ...formData, files: [...formData.files, ...files] });
  };

  const removeFile = (index: number) => {
    const newFiles = formData.files.filter((_, i) => i !== index);
    setFormData({ ...formData, files: newFiles });
  };

  const urgencyColors: Record<string, string> = {
    low: 'border-urgency-low text-urgency-low',
    medium: 'border-urgency-medium text-urgency-medium',
    high: 'border-urgency-high text-urgency-high',
    critical: 'border-urgency-critical text-urgency-critical',
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Soumettre une requête</h1>
        <p className="text-muted-foreground mt-1">
          {canClassify
            ? 'Décrivez la situation et classifiez la requête.'
            : 'Décrivez simplement votre situation, nous nous occupons du reste.'}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'wizard-step',
                    currentStep === step.id && 'wizard-step-active',
                    currentStep > step.id && 'wizard-step-completed',
                    currentStep < step.id && 'wizard-step-pending'
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className={cn(
                    'text-sm font-medium',
                    currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {step.description}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-20 sm:w-32 h-0.5 mx-2',
                    currentStep > step.id ? 'bg-status-resolved' : 'bg-border'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-card rounded-xl border shadow-card p-6">
        {/* Step 1: Identification */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-slide-up">
            {/* Erreur : membre sans compagnie */}
            {noCompanyError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Aucune compagnie n&apos;est associée à votre compte. Veuillez contacter un administrateur.
              </div>
            )}

            <div>
              <h2 className="text-lg font-semibold mb-4">Vos informations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nom complet</Label>
                  <Input value={user?.name || user?.username || ''} disabled className="mt-1.5 bg-muted" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={user?.email || ''} disabled className="mt-1.5 bg-muted" />
                </div>
              </div>
            </div>

            {/* Compagnie — toujours affichée en premier */}
            <div>
              <Label htmlFor="company">Compagnie *</Label>
              {canChooseAnyCompany ? (
                <>
                  <Select
                    value={formData.companyId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, companyId: value, workerId: '' })
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Sélectionnez une compagnie" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    Choisissez la compagnie pour filtrer les adhérents disponibles.
                  </p>
                </>
              ) : (
                <>
                  <Input
                    value={companies.find((c) => c.id === formData.companyId)?.name ?? '—'}
                    disabled
                    className="mt-1.5 bg-muted"
                  />
                  <p className="text-sm text-muted-foreground mt-1.5">
                    {canSubmitForOthers
                      ? 'Compagnie fixée à votre périmètre de délégation.'
                      : 'Compagnie chargée automatiquement depuis votre profil.'}
                  </p>
                </>
              )}
            </div>

            {/* Sélection de l'utilisateur — disponible uniquement après choix de la compagnie */}
            {canSubmitForOthers && (
              <div>
                <Label htmlFor="worker">Soumettre pour un adhérent</Label>
                {!formData.companyId ? (
                  <p className="text-sm text-muted-foreground mt-1.5 italic">
                    Sélectionnez d&apos;abord une compagnie pour afficher les adhérents.
                  </p>
                ) : (
                  <>
                    <Input
                      placeholder="Rechercher par nom, username ou matricule…"
                      value={profileSearch}
                      onChange={(e) => setProfileSearch(e.target.value)}
                      className="mt-1.5 mb-1.5"
                    />
                    <Select
                      value={formData.workerId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, workerId: value === '__self__' ? '' : value })
                      }
                    >
                      <SelectTrigger className="mt-0.5">
                        <SelectValue placeholder="Moi-même (par défaut)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__self__">Moi-même</SelectItem>
                        {filteredProfiles.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.first_name} {p.last_name} — {p.username}
                            {p.employee_id ? ` (${p.employee_id})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1.5">
                      Laissez sur « Moi-même » pour soumettre en votre propre nom.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Type & Urgence */}
        {currentStep === 2 && (
          <div className="space-y-8 animate-slide-up">
            {!canClassify && (
              <p className="text-sm text-muted-foreground mb-3">
                Cette étape est préremplie automatiquement.
              </p>
            )}
            <div>
              <h2 className="text-lg font-semibold mb-4">Type de requête *</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {poles.map((pole) => (
                  <Tooltip key={pole.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, poleId: pole.id })}
                        className={cn(
                          'p-4 rounded-lg border-2 text-left transition-all',
                          'hover:border-primary/50 hover:bg-accent/50',
                          formData.poleId === pole.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border'
                        )}
                      >
                        <span className="font-medium">{pole.name}</span>
                        {pole.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {pole.description}
                          </p>
                        )}
                      </button>
                    </TooltipTrigger>
                    {pole.description && (
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">{pole.description}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Niveau d'urgence *</h2>
              <RadioGroup
                value={formData.urgency}
                onValueChange={(value) => setFormData({ ...formData, urgency: value })}
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
              >
                {urgencyLevels.map(([value, label]) => (
                  <div key={value}>
                    <RadioGroupItem
                      value={value}
                      id={value}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={value}
                      className={cn(
                        'flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all',
                        'hover:bg-accent/50',
                        'peer-data-[state=checked]:border-2',
                        formData.urgency === value
                          ? urgencyColors[value]
                          : 'border-border'
                      )}
                    >
                      <span className="font-semibold">{label}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              <p className="text-sm text-muted-foreground mt-3">
                <strong>Critique:</strong> Menace immédiate (licenciement, sanction grave) —
                <strong> Élevée:</strong> Urgent sous 48h —
                <strong> Moyenne:</strong> À traiter sous 1 semaine —
                <strong> Faible:</strong> Demande d'information
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Détails */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-slide-up">
            <div>
              <Label htmlFor="subject">Objet de la requête *</Label>
              <Input
                id="subject"
                placeholder="Résumez votre demande en quelques mots"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="mt-1.5"
              />
              <p className="text-sm text-muted-foreground mt-1.5">
                Minimum 5 caractères
              </p>
            </div>

            <div>
              <Label htmlFor="description">Description détaillée *</Label>
              <Textarea
                id="description"
                placeholder="Décrivez votre situation en détail : contexte, faits, dates importantes..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1.5 min-h-[200px]"
              />
              <p className="text-sm text-muted-foreground mt-1.5">
                {formData.description.length}/20 caractères minimum
              </p>
            </div>

            {/* Champs dynamiques selon le pôle */}
            {dynamicFields.length > 0 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
                <p className="text-sm font-semibold text-primary">
                  Informations spécifiques — {selectedPole?.name}
                </p>
                {dynamicFields.map((field) => (
                  <div key={field.name}>
                    <Label htmlFor={`dyn-${field.name}`}>
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {field.field_type === 'choice' && field.options?.length ? (
                      <Select
                        value={extraData[field.name] ?? ''}
                        onValueChange={(v) => setExtraData((prev) => ({ ...prev, [field.name]: v }))}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder={`Choisir…`} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : field.field_type === 'textarea' ? (
                      <Textarea
                        id={`dyn-${field.name}`}
                        value={extraData[field.name] ?? ''}
                        onChange={(e) => setExtraData((prev) => ({ ...prev, [field.name]: e.target.value }))}
                        className="mt-1.5"
                        rows={3}
                      />
                    ) : field.field_type === 'boolean' ? (
                      <div className="flex gap-4 mt-1.5">
                        {['Oui', 'Non'].map((opt) => (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`dyn-${field.name}`}
                              value={opt}
                              checked={extraData[field.name] === opt}
                              onChange={() => setExtraData((prev) => ({ ...prev, [field.name]: opt }))}
                            />
                            <span className="text-sm">{opt}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <Input
                        id={`dyn-${field.name}`}
                        type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                        value={extraData[field.name] ?? ''}
                        onChange={(e) => setExtraData((prev) => ({ ...prev, [field.name]: e.target.value }))}
                        className="mt-1.5"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div>
              <Label>Pièces jointes</Label>
              <div className="mt-1.5">
                <label
                  htmlFor="file-upload"
                  className={cn(
                    'flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed cursor-pointer',
                    'hover:border-primary/50 hover:bg-accent/50 transition-colors'
                  )}
                >
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm font-medium">Cliquez pour ajouter des fichiers</span>
                  <span className="text-xs text-muted-foreground">PDF, images (max 10MB)</span>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
              {formData.files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {formData.files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <span className="text-sm truncate">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeFile(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-border">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            Retour
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || isSubmitting}
          >
            {isSubmitting ? (
              'Envoi en cours...'
            ) : currentStep === totalSteps ? (
              'Envoyer la requête'
            ) : (
              <>
                Suivant
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
