import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Upload, X, Loader2 } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
import { useTicketMeta } from '@/hooks/useTicketMeta';
import { urgencyLabels, ticketTypeDescriptions } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useAcl } from '@/contexts/AuthContext';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const stepsSimple = [
  { id: 1, title: 'Identification', description: 'Vérifiez vos informations' },
  { id: 2, title: 'Description', description: 'Expliquez votre situation' },
];

const stepsFull = [
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
  const steps = canClassify ? stepsFull : stepsSimple;
  const totalSteps = steps.length;
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch companies and ticket types from API
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => fetchCompanies(),
    staleTime: 5 * 60 * 1000,
  });

  const { types: ticketTypes } = useTicketMeta();

  // Form state
  const [formData, setFormData] = useState({
    companyId: '',
    type: '' as string,
    urgency: '' as string,
    otherTypeDetails: '',
    subject: '',
    description: '',
    files: [] as File[],
  });

  const canProceed = () => {
    if (canClassify) {
      // Mode complet pour membres/délégués
      switch (currentStep) {
        case 1:
          return !!formData.companyId;
        case 2:
          return (
            !!formData.type &&
            !!formData.urgency
          );
        case 3:
          return formData.subject.length >= 5 && formData.description.length >= 20;
        default:
          return false;
      }
    } else {
      // Mode simplifié pour employés
      switch (currentStep) {
        case 1:
          return !!formData.companyId;
        case 2:
          return formData.subject.length >= 5 && formData.description.length >= 20;
        default:
          return false;
      }
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
      };
      if (canClassify && formData.type) {
        payload.ticket_type = formData.type;
      }
      if (canClassify && formData.urgency) {
        payload.urgency = formData.urgency as CreateTicketPayload['urgency'];
      }

      const ticket = await createTicket(payload);

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
            <div>
              <h2 className="text-lg font-semibold mb-4">Vos informations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nom complet</Label>
                  <Input
                    value={user?.name || user?.username || ''}
                    disabled
                    className="mt-1.5 bg-muted"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={user?.email || ''}
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
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
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

        {/* Step 2: Type & Urgency (seulement pour membres/délégués) */}
        {canClassify && currentStep === 2 && (
          <div className="space-y-8 animate-slide-up">
            <div>
              <h2 className="text-lg font-semibold mb-4">Type de requête *</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ticketTypes.map((tt) => (
                  <Tooltip key={tt.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: tt.id })}
                        className={cn(
                          'p-4 rounded-lg border-2 text-left transition-all',
                          'hover:border-primary/50 hover:bg-accent/50',
                          formData.type === tt.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border'
                        )}
                        title={ticketTypeDescriptions[tt.code] ?? tt.label}
                      >
                        <span className="font-medium">{tt.label}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">
                        {ticketTypeDescriptions[tt.code] ?? tt.label}
                      </p>
                    </TooltipContent>
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

        {/* Step Details (Step 3 pour membres/délégués, Step 2 pour employés) */}
        {((canClassify && currentStep === 3) || (!canClassify && currentStep === 2)) && (
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
