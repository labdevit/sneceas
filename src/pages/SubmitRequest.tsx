import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Upload, X } from 'lucide-react';
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
import { ticketTypeDescriptions, urgencyLabels } from '@/lib/mock-data';
import type { TicketType, TicketUrgency } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { apiRequest } from '@/lib/api';

type ApiCompany = { id: number; nom: string; code: string };
type ApiPole = { id: number; nom: string; description: string; types_problemes: string[] };
type ApiProfile = {
  id: number;
  role: string;
  entreprise: { id: number; nom: string } | null;
  user_id_read: number;
  first_name: string;
  last_name: string;
  user_email: string;
};

const urgencyLevels = Object.entries(urgencyLabels) as [TicketUrgency, string][];

export default function SubmitRequest() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [poles, setPoles] = useState<ApiPole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    companyId: '',
    poleId: '',
    type: '' as TicketType | '',
    urgency: '' as TicketUrgency | '',
    otherTypeDetails: '',
    subject: '',
    description: '',
    files: [] as File[],
  });

  const canClassify = useMemo(
    () => profile?.role === 'member' || profile?.role === 'delegate',
    [profile]
  );
  const steps = useMemo(
    () => [
      { id: 1, title: 'Identification', description: 'Vérifiez vos informations' },
      { id: 2, title: 'Type & Urgence', description: 'Classifiez la requête' },
      { id: 3, title: 'Détails', description: 'Décrivez la situation' },
    ],
    []
  );
  const totalSteps = 3;

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [profileData, companiesData, polesData] = await Promise.all([
          apiRequest<ApiProfile>('/profils/me/'),
          apiRequest<ApiCompany[] | { results: ApiCompany[] }>('/entreprises/', { auth: false }),
          apiRequest<ApiPole[] | { results: ApiPole[] }>('/poles/'),
        ]);
        const companiesList = Array.isArray(companiesData)
          ? companiesData
          : companiesData.results ?? [];
        const polesList = Array.isArray(polesData) ? polesData : polesData.results ?? [];
        const defaultPoleId = polesList[0] ? String(polesList[0].id) : '';
        const defaultType = polesList[0]?.types_problemes?.[0] ?? 'other';

        setProfile(profileData);
        setCompanies(companiesList);
        setPoles(polesList);
        setFormData((prev) => ({
          ...prev,
          companyId: profileData.entreprise ? String(profileData.entreprise.id) : prev.companyId,
          poleId: prev.poleId || defaultPoleId,
          type: prev.type || defaultType,
          urgency: prev.urgency || 'medium',
        }));
        setErrorMessage(null);
      } catch {
        setErrorMessage("Impossible de charger les données du formulaire.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (poles.length === 0) {
      return;
    }
    if (!formData.poleId) {
      const firstPoleId = String(poles[0].id);
      const firstType = poles[0]?.types_problemes?.[0] ?? 'other';
      setFormData((prev) => ({
        ...prev,
        poleId: firstPoleId,
        type: prev.type || firstType,
      }));
    }
  }, [formData.poleId, formData.type, poles]);

  const canProceed = () => {
    if (!formData.companyId || !formData.poleId) {
      return false;
    }
    switch (currentStep) {
      case 1:
        return !!formData.companyId && !!formData.poleId;
      case 2:
        if (!canClassify) {
          return true;
        }
        return !!formData.poleId && !!formData.urgency;
      case 3:
        return formData.subject.length >= 5 && formData.description.length >= 20;
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
    if (!profile) {
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        travailleur_id: profile.user_id_read,
        entreprise_id: Number(formData.companyId),
        pole_id: Number(formData.poleId),
        type_probleme: formData.type || 'other',
        priorite: formData.urgency || 'medium',
        titre: formData.subject,
        description: formData.description,
      };
      const created = await apiRequest<{ id: number; numero_reference: string }>('/requetes/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (formData.files.length > 0) {
        await Promise.all(
          formData.files.map((file) => {
            const data = new FormData();
            data.append('fichier', file);
            data.append('type_document', 'AUTRE');
            data.append('description', 'Pièce jointe');
            return apiRequest(`/requetes/${created.id}/pieces-jointes/`, {
              method: 'POST',
              body: data,
            });
          })
        );
      }

      toast({
        title: 'Requête envoyée !',
        description: `Votre requête a été soumise avec succès. Référence: ${created.numero_reference}`,
      });
      navigate('/tickets');
    } catch {
      toast({
        title: 'Erreur',
        description: "Impossible d'envoyer la requête.",
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

  const urgencyColors: Record<TicketUrgency, string> = {
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
        {isLoading ? (
          <div className="text-sm text-muted-foreground mb-4">Chargement...</div>
        ) : errorMessage ? (
          <div className="text-sm text-destructive mb-4">{errorMessage}</div>
        ) : null}
        {/* Step 1: Identification */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-slide-up">
            <div>
              <h2 className="text-lg font-semibold mb-4">Vos informations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nom complet</Label>
                  <Input
                    value={profile ? `${profile.first_name} ${profile.last_name}` : ''}
                    disabled
                    className="mt-1.5 bg-muted"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={profile?.user_email ?? ''}
                    disabled
                    className="mt-1.5 bg-muted"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="company">Compagnie *</Label>
              <Select
                value={formData.companyId}
                onValueChange={(value) => setFormData({ ...formData, companyId: value })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Sélectionnez votre compagnie" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={String(company.id)}>
                      {company.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1.5">
                Confirmez la compagnie concernée par votre requête.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Type & Urgency */}
        {currentStep === 2 && (
          <div className="space-y-8 animate-slide-up">
            <div>
              <h2 className="text-lg font-semibold mb-4">Type de requête *</h2>
              {!canClassify && (
                <p className="text-sm text-muted-foreground mb-3">
                  Cette étape est préremplie automatiquement.
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {poles.map((pole) => {
                  const isSelected = formData.poleId === String(pole.id);
                  const defaultType = pole.types_problemes?.[0] ?? 'other';
                  return (
                    <Tooltip key={pole.id}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              poleId: String(pole.id),
                              type: defaultType as TicketType,
                            })
                          }
                          className={cn(
                            'p-4 rounded-lg border-2 text-left transition-all',
                            'hover:border-primary/50 hover:bg-accent/50',
                            isSelected ? 'border-primary bg-primary/5' : 'border-border'
                          )}
                          title={pole.description}
                        >
                          <span className="font-medium">{pole.nom}</span>
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
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Niveau d'urgence *</h2>
              <RadioGroup
                value={formData.urgency}
                onValueChange={(value) =>
                  setFormData({ ...formData, urgency: value as TicketUrgency })
                }
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
                          ? urgencyColors[value as TicketUrgency]
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
