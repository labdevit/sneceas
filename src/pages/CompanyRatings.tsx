import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient, useQueries } from '@tanstack/react-query';
import { Building2, Star, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCompanies, type ApiCompany } from '@/lib/api/companies';
import { fetchBureaux } from '@/lib/api/bureau';
import {
  fetchCompanyRatings,
  upsertCompanyRating,
  fetchCompanyAutoRating,
  CRITERES_NOTATION,
  type ApiCompanyRating,
} from '@/lib/api/companyRatings';
import { cn } from '@/lib/utils';

// ── Types locaux ─────────────────────────────────────────────────────

type CompanySummary = {
  company: ApiCompany;
  ratings: ApiCompanyRating[];
  avgByCritere: Record<string, { avg: number; count: number }>;
  overallAvg: number;
};

const NOTE_MAX = 5;

// ── Composant StarRating ─────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (n: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          className={cn(
            'p-0.5 rounded transition-colors',
            readonly ? 'cursor-default' : 'hover:scale-110',
            value >= n ? 'text-amber-500' : 'text-muted-foreground/40'
          )}
          onClick={() => !readonly && onChange?.(n)}
          aria-label={`${n} sur ${NOTE_MAX}`}
        >
          <Star className="w-6 h-6 fill-current" />
        </button>
      ))}
    </div>
  );
}

// ── Page principale ──────────────────────────────────────────────────

export default function CompanyRatings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => fetchCompanies(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: ratings = [], isLoading: loadingRatings } = useQuery({
    queryKey: ['company-ratings'],
    queryFn: () => fetchCompanyRatings(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: bureaux = [] } = useQuery({
    queryKey: ['bureaux'],
    queryFn: () => fetchBureaux({ active: 'true' }),
    staleTime: 5 * 60 * 1000,
  });

  const loading = loadingCompanies || loadingRatings;

  // IDs of companies this user can rate (delegate of that company, or any bureau member)
  const canRateCompanyId = useMemo(() => {
    if (!user) return null;
    if (user.is_staff || user.is_superuser) return null; // null = unrestricted
    const userId = user.id;
    const isBureauMember = bureaux.some(
      (b) => b.secretaire_general === userId || b.members.some((m) => m.user === userId)
    );
    if (isBureauMember) return null; // bureau members can rate all companies
    return new Set(
      (user.roles ?? [])
        .filter((r) => r.role_code === 'delegate' && r.company_id)
        .map((r) => r.company_id as string)
    );
  }, [user, bureaux]);

  // Notation automatique par entreprise (depuis les tickets clôturés)
  const autoRatingQueries = useQueries({
    queries: companies.map((c) => ({
      queryKey: ['company-auto-rating', c.id],
      queryFn: () => fetchCompanyAutoRating(c.id),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const autoRatingByCompany: Record<string, Record<string, number>> = {};
  companies.forEach((c, i) => {
    autoRatingByCompany[c.id] = autoRatingQueries[i]?.data ?? {};
  });

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [formNotes, setFormNotes] = useState<Record<string, number>>({});
  const [formComments, setFormComments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // ── Résumé par entreprise ──────────────────────────────────────────

  const summaryByCompany: CompanySummary[] = companies.map((company) => {
    const companyRatings = ratings.filter((r) => r.company === company.id);
    const avgByCritere: Record<string, { avg: number; count: number }> = {};
    let sumForOverall = 0;
    let countForOverall = 0;

    CRITERES_NOTATION.forEach(({ value }) => {
      const forCritere = companyRatings.filter((r) => r.criterion === value);
      const sum = forCritere.reduce((s, r) => s + r.rating, 0);
      const count = forCritere.length;
      const avg = count > 0 ? sum / count : 0;
      if (avg > 0) {
        sumForOverall += sum;
        countForOverall += count;
      }
      avgByCritere[value] = {
        avg: avg ? Math.round(avg * 10) / 10 : 0,
        count,
      };
    });

    const overallAvg =
      countForOverall > 0
        ? Math.round((sumForOverall / countForOverall) * 10) / 10
        : 0;

    return { company, ratings: companyRatings, avgByCritere, overallAvg };
  });

  // ── Dialog noter ───────────────────────────────────────────────────

  const openNoter = useCallback(
    (companyId: string) => {
      const existing = ratings.filter((r) => r.company === companyId);
      const autoNotes = autoRatingByCompany[companyId] ?? {};
      const notes: Record<string, number> = {};
      const comments: Record<string, string> = {};
      CRITERES_NOTATION.forEach(({ value }) => {
        const one = existing.find((r) => r.criterion === value);
        notes[value] = one?.rating ?? autoNotes[value] ?? 0;
        comments[value] = one?.comment ?? '';
      });
      setFormNotes(notes);
      setFormComments(comments);
      setSelectedCompanyId(companyId);
      setDialogOpen(true);
    },
    [ratings, autoRatingByCompany]
  );

  const applyNotationAutomatique = () => {
    if (!selectedCompanyId) return;
    const auto = autoRatingByCompany[selectedCompanyId] ?? {};
    setFormNotes((prev) => {
      const next = { ...prev };
      CRITERES_NOTATION.forEach(({ value }) => {
        if (auto[value] != null) next[value] = auto[value];
      });
      return next;
    });
  };

  const handleSaveNotation = async () => {
    if (!selectedCompanyId) return;
    setSaving(true);
    try {
      for (const { value } of CRITERES_NOTATION) {
        const rating = formNotes[value] ?? 0;
        if (rating < 1 || rating > NOTE_MAX) continue;
        await upsertCompanyRating({
          company: selectedCompanyId,
          criterion: value,
          rating,
          comment: formComments[value]?.trim() || undefined,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ['company-ratings'] });
      setDialogOpen(false);
      toast({ title: 'Notes enregistrées', description: 'Les notations ont été sauvegardées.' });
    } catch {
      toast({
        title: 'Erreur',
        description: "Impossible d'enregistrer les notes.",
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Rendu ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Star className="w-7 h-7 text-amber-500" />
          Notation des entreprises
        </h1>
        <p className="text-muted-foreground mt-1">
          Consultez et renseignez les notes par critère pour chaque entreprise (1 = très
          insuffisant, 5 = excellent).
        </p>
      </div>

      {/* Légende des critères */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Critères de notation</CardTitle>
          <CardDescription>
            Ces critères permettent d&apos;évaluer la relation employeur / syndicat, les
            conditions de travail et le respect de la Convention collective des Assurances.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              1. Critères d&apos;évaluation des entreprises
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
              {CRITERES_NOTATION.filter((c) => c.section === 1).map((c) => (
                <li key={c.value} className="flex items-start gap-2">
                  <Star className="w-4 h-4 text-amber-500/70 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">{c.label}</strong>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              2. Convention collective des Assurances (CCA)
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
              {CRITERES_NOTATION.filter((c) => c.section === 2).map((c) => (
                <li key={c.value} className="flex items-start gap-2">
                  <Star className="w-4 h-4 text-amber-500/70 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">{c.label}</strong>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Liste des entreprises avec notes */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Notes par entreprise
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border p-6 h-40 animate-pulse bg-muted/30"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summaryByCompany.map(({ company, overallAvg, avgByCritere, ratings: rList }) => (
              <Card key={company.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{company.name}</CardTitle>
                    <Badge variant="secondary" className="shrink-0">
                      {rList.length} note{rList.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <CardDescription>
                    Moyenne globale :{' '}
                    {overallAvg > 0 ? (
                      <span className="font-medium text-foreground">
                        {overallAvg.toFixed(1)} / 5
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  <div className="text-xs text-muted-foreground space-y-1">
                    {CRITERES_NOTATION.slice(0, 3).map((c) => (
                      <div key={c.value} className="flex justify-between">
                        <span>{c.label}</span>
                        <span>
                          {avgByCritere[c.value]?.count
                            ? `${avgByCritere[c.value].avg.toFixed(1)} (${avgByCritere[c.value].count})`
                            : '—'}
                        </span>
                      </div>
                    ))}
                    {CRITERES_NOTATION.length > 3 && (
                      <div className="pt-1 border-t">
                        + {CRITERES_NOTATION.length - 3} autre
                        {CRITERES_NOTATION.length - 3 > 1 ? 's' : ''} critère
                        {CRITERES_NOTATION.length - 3 > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  {(canRateCompanyId === null || canRateCompanyId.has(company.id)) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-auto w-full"
                      onClick={() => openNoter(company.id)}
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Noter cette entreprise
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Détail des notations (tableau récap) */}
      {!loading && ratings.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Détail des notations
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Entreprise</th>
                      <th className="text-left p-3 font-medium">Critère</th>
                      <th className="text-left p-3 font-medium">Note</th>
                      <th className="text-left p-3 font-medium">Commentaire</th>
                      <th className="text-left p-3 font-medium">Par</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...ratings]
                      .sort(
                        (a, b) =>
                          (a.company_name ?? '').localeCompare(b.company_name ?? '') ||
                          a.criterion.localeCompare(b.criterion)
                      )
                      .map((r) => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="p-3">{r.company_name ?? '—'}</td>
                          <td className="p-3">{r.criterion_display}</td>
                          <td className="p-3">
                            <StarRating value={r.rating} readonly />
                          </td>
                          <td className="p-3 max-w-[200px] truncate text-muted-foreground">
                            {r.comment || '—'}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {r.rated_by_name ?? '—'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Dialog Noter */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Noter l&apos;entreprise</DialogTitle>
            <DialogDescription>
              {selectedCompanyId &&
                companies.find((c) => c.id === selectedCompanyId)?.name}
              . Donnez une note de 1 à 5 pour chaque critère (optionnel : commentaire).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                1. Critères d&apos;évaluation des entreprises
              </h4>
              <div className="space-y-4">
                {CRITERES_NOTATION.filter((c) => c.section === 1).map((c) => (
                  <div key={c.value} className="space-y-2">
                    <Label>{c.label}</Label>
                    <StarRating
                      value={formNotes[c.value] ?? 0}
                      onChange={(n) =>
                        setFormNotes((prev) => ({ ...prev, [c.value]: n }))
                      }
                    />
                    <Textarea
                      placeholder="Commentaire (optionnel)"
                      value={formComments[c.value] ?? ''}
                      onChange={(e) =>
                        setFormComments((prev) => ({
                          ...prev,
                          [c.value]: e.target.value,
                        }))
                      }
                      className="min-h-[60px] resize-none"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                2. Convention collective des Assurances (CCA)
              </h4>
              <div className="space-y-4">
                {CRITERES_NOTATION.filter((c) => c.section === 2).map((c) => (
                  <div key={c.value} className="space-y-2">
                    <Label>{c.label}</Label>
                    <StarRating
                      value={formNotes[c.value] ?? 0}
                      onChange={(n) =>
                        setFormNotes((prev) => ({ ...prev, [c.value]: n }))
                      }
                    />
                    <Textarea
                      placeholder="Commentaire (optionnel)"
                      value={formComments[c.value] ?? ''}
                      onChange={(e) =>
                        setFormComments((prev) => ({
                          ...prev,
                          [c.value]: e.target.value,
                        }))
                      }
                      className="min-h-[60px] resize-none"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={applyNotationAutomatique}
              className="mr-auto"
            >
              Notation automatique
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveNotation} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer les notes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
