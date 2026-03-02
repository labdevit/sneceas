import { useCallback, useEffect, useState } from 'react';
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
import {
  getEntreprises,
  getNotationsEntreprise,
  getNotationAutomatique,
  upsertNotationEntreprise,
  CRITERES_NOTATION,
  type EntrepriseDto,
  type NotationEntrepriseDto,
} from '@/lib/api';
import { cn } from '@/lib/utils';

type NotationByCompany = {
  entreprise: EntrepriseDto;
  notations: NotationEntrepriseDto[];
  /** Moyenne par critère */
  avgByCritere: Record<string, { avg: number; count: number }>;
  /** Moyenne globale */
  overallAvg: number;
};

const NOTE_MAX = 5;

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

export default function CompanyRatings() {
  const [entreprises, setEntreprises] = useState<EntrepriseDto[]>([]);
  const [notations, setNotations] = useState<NotationEntrepriseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [formNotes, setFormNotes] = useState<Record<string, number>>({});
  const [formComments, setFormComments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  /** Notation automatique par entreprise (calculée à partir des requêtes). */
  const [notationAutoByCompany, setNotationAutoByCompany] = useState<Record<number, Record<string, number>>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [entreprisesRes, notationsRes] = await Promise.all([
        getEntreprises(),
        getNotationsEntreprise(),
      ]);
      const entreprisesList = Array.isArray(entreprisesRes) ? entreprisesRes : [];
      setEntreprises(entreprisesList);
      setNotations(Array.isArray(notationsRes) ? notationsRes : []);

      const autoByCompany: Record<number, Record<string, number>> = {};
      await Promise.all(
        entreprisesList.map(async (e) => {
          const auto = await getNotationAutomatique(e.id);
          autoByCompany[e.id] = auto;
        })
      );
      setNotationAutoByCompany(autoByCompany);
    } catch {
      setError('Impossible de charger les entreprises et les notations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summaryByCompany: NotationByCompany[] = entreprises.map((entreprise) => {
    const companyNotations = notations.filter((n) => n.entreprise?.id === entreprise.id);
    const autoNotes = notationAutoByCompany[entreprise.id] ?? {};
    const avgByCritere: Record<string, { avg: number; count: number }> = {};
    let sumForOverall = 0;
    let countForOverall = 0;
    CRITERES_NOTATION.forEach(({ value }) => {
      const forCritere = companyNotations.filter((n) => n.critere === value);
      const manualSum = forCritere.reduce((s, n) => s + n.note, 0);
      const manualCount = forCritere.length;
      const autoNote = autoNotes[value];
      const hasManual = manualCount > 0;
      const noteToUse = hasManual ? manualSum / manualCount : (autoNote ?? 0);
      const countToUse = hasManual ? manualCount : (autoNote != null ? 1 : 0);
      if (noteToUse > 0) {
        sumForOverall += noteToUse * (hasManual ? manualCount : 1);
        countForOverall += countToUse;
      }
      avgByCritere[value] = {
        avg: noteToUse ? Math.round(noteToUse * 10) / 10 : 0,
        count: countToUse,
      };
    });
    const overallAvg =
      countForOverall > 0 ? Math.round((sumForOverall / countForOverall) * 10) / 10 : 0;
    return {
      entreprise,
      notations: companyNotations,
      avgByCritere,
      overallAvg,
    };
  });

  const openNoter = (entrepriseId: number) => {
    const existing = notations.filter(
      (n) => n.entreprise?.id === entrepriseId
    ) as NotationEntrepriseDto[];
    const autoNotes = notationAutoByCompany[entrepriseId] ?? {};
    const notes: Record<string, number> = {};
    const comments: Record<string, string> = {};
    CRITERES_NOTATION.forEach(({ value }) => {
      const one = existing.find((n) => n.critere === value);
      notes[value] = one?.note ?? autoNotes[value] ?? 0;
      comments[value] = one?.commentaire ?? '';
    });
    setFormNotes(notes);
    setFormComments(comments);
    setSelectedCompanyId(entrepriseId);
    setDialogOpen(true);
  };

  const applyNotationAutomatique = () => {
    if (selectedCompanyId == null) return;
    const auto = notationAutoByCompany[selectedCompanyId] ?? {};
    const next: Record<string, number> = {};
    CRITERES_NOTATION.forEach(({ value }) => {
      next[value] = auto[value] ?? formNotes[value] ?? 0;
    });
    setFormNotes(next);
  };

  const handleSaveNotation = async () => {
    if (selectedCompanyId == null) return;
    setSaving(true);
    try {
      for (const { value } of CRITERES_NOTATION) {
        const note = formNotes[value] ?? 0;
        if (note < 1 || note > NOTE_MAX) continue;
        await upsertNotationEntreprise({
          entreprise_id: selectedCompanyId,
          critere: value,
          note,
          commentaire: formComments[value]?.trim() || undefined,
        });
      }
      await loadData();
      setDialogOpen(false);
    } catch {
      setError('Erreur lors de l\'enregistrement des notes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Star className="w-7 h-7 text-amber-500" />
          Notation des entreprises
        </h1>
        <p className="text-muted-foreground mt-1">
          Consultez et renseignez les notes par critère pour chaque entreprise (1 = très
          insuffisant, 5 = excellent). La notation peut être calculée automatiquement à partir des requêtes clôturées (résolu / non résolu).
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Légende des critères */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Critères de notation</CardTitle>
          <CardDescription>
            Ces critères permettent d&apos;évaluer la relation employeur / syndicat, les conditions de travail
            et le respect de la Convention collective des Assurances.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">1. Critères d&apos;évaluation des entreprises</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
              {CRITERES_NOTATION.filter((c) => c.section === 1).map((c) => (
                <li key={c.value} className="flex items-start gap-2">
                  <Star className="w-4 h-4 text-amber-500/70 shrink-0 mt-0.5" />
                  <span><strong className="text-foreground">{c.label}</strong></span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">2. Convention collective des Assurances</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
              {CRITERES_NOTATION.filter((c) => c.section === 2).map((c) => (
                <li key={c.value} className="flex items-start gap-2">
                  <Star className="w-4 h-4 text-amber-500/70 shrink-0 mt-0.5" />
                  <span><strong className="text-foreground">{c.label}</strong></span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détail des critères</CardTitle>
          <CardDescription>
            Définition de chaque critère pour une évaluation homogène.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold text-foreground mb-2">1. Critères d&apos;évaluation des entreprises</h3>
            <dl className="space-y-2 text-muted-foreground">
              <dt className="font-medium text-foreground">Conformité des contrats</dt>
              <dd className="ml-0">Respect des types de contrats (CDD/CDI), des périodes d&apos;essai, et des clauses de non-concurrence.</dd>
              <dt className="font-medium text-foreground">Rémunération et avantages</dt>
              <dd className="ml-0">Respect des barèmes de salaires, paiement des heures supplémentaires et des primes de rendement.</dd>
              <dt className="font-medium text-foreground">Sécurité et santé</dt>
              <dd className="ml-0">Mise en place d&apos;un comité d&apos;hygiène et de sécurité, respect des normes de sécurité.</dd>
              <dt className="font-medium text-foreground">Relations sociales</dt>
              <dd className="ml-0">Existence de délégués du personnel, respect de la liberté syndicale.</dd>
              <dt className="font-medium text-foreground">Rupture du contrat</dt>
              <dd className="ml-0">Procédures de licenciement, paiement des indemnités de préavis et de licenciement.</dd>
              <dt className="font-medium text-foreground">Rupture de communication</dt>
              <dd className="ml-0">Avec les représentants du personnel, non-respect du calendrier d&apos;entretien avec les délégués.</dd>
            </dl>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">2. Convention collective des Assurances</h3>
            <dl className="space-y-2 text-muted-foreground">
              <dt className="font-medium text-foreground">Classification professionnelle</dt>
              <dd className="ml-0">Catégorisation des employés (1ère à 6ème catégorie, AM2, AM3, etc.) déterminant le salaire.</dd>
              <dt className="font-medium text-foreground">Primes spécifiques</dt>
              <dd className="ml-0">Prime d&apos;ancienneté (débutant à 2% après 2 ans, progressant jusqu&apos;à la 25ème année), prime de technicité, 13ème mois / gratifications.</dd>
              <dt className="font-medium text-foreground">Conditions de travail (CCA)</dt>
              <dd className="ml-0">Indemnités de transport (Article 35), avantages aux cadres (Article 36), tenue de travail (Article 37).</dd>
              <dt className="font-medium text-foreground">Formation</dt>
              <dd className="ml-0">Accès à la formation professionnelle continue.</dd>
              <dt className="font-medium text-foreground">Traitement équitable</dt>
              <dd className="ml-0">Évaluation équitable et impartiale des employés sans discrimination.</dd>
            </dl>
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
            {summaryByCompany.map(({ entreprise, overallAvg, avgByCritere, notations: nList }) => (
              <Card key={entreprise.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{entreprise.nom}</CardTitle>
                    <Badge variant="secondary" className="shrink-0">
                      {nList.length} note{nList.length !== 1 ? 's' : ''}
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-auto w-full"
                    onClick={() => openNoter(entreprise.id)}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Noter cette entreprise
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Détail des notations (tableau récap) */}
      {!loading && notations.length > 0 && (
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
                    {notations
                      .sort(
                        (a, b) =>
                          (a.entreprise?.nom ?? '').localeCompare(b.entreprise?.nom ?? '') ||
                          a.critere.localeCompare(b.critere)
                      )
                      .map((n) => (
                        <tr key={n.id} className="border-b last:border-0">
                          <td className="p-3">{n.entreprise?.nom ?? '—'}</td>
                          <td className="p-3">{n.critere_display}</td>
                          <td className="p-3">
                            <StarRating value={n.note} readonly />
                          </td>
                          <td className="p-3 max-w-[200px] truncate text-muted-foreground">
                            {n.commentaire || '—'}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {n.created_by_display ?? '—'}
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
              {selectedCompanyId != null &&
                entreprises.find((e) => e.id === selectedCompanyId)?.nom}
              . Donnez une note de 1 à 5 pour chaque critère (optionnel : commentaire).
              La notation automatique est calculée à partir des requêtes clôturées (résolu / non résolu).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">1. Critères d&apos;évaluation des entreprises</h4>
              <div className="space-y-4">
                {CRITERES_NOTATION.filter((c) => c.section === 1).map((c) => (
                  <div key={c.value} className="space-y-2">
                    <Label>{c.label}</Label>
                    <StarRating
                      value={formNotes[c.value] ?? 0}
                      onChange={(n) => setFormNotes((prev) => ({ ...prev, [c.value]: n }))}
                    />
                    <Textarea
                      placeholder="Commentaire (optionnel)"
                      value={formComments[c.value] ?? ''}
                      onChange={(e) =>
                        setFormComments((prev) => ({ ...prev, [c.value]: e.target.value }))
                      }
                      className="min-h-[60px] resize-none"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">2. Convention collective des Assurances</h4>
              <div className="space-y-4">
                {CRITERES_NOTATION.filter((c) => c.section === 2).map((c) => (
                  <div key={c.value} className="space-y-2">
                    <Label>{c.label}</Label>
                    <StarRating
                      value={formNotes[c.value] ?? 0}
                      onChange={(n) => setFormNotes((prev) => ({ ...prev, [c.value]: n }))}
                    />
                    <Textarea
                      placeholder="Commentaire (optionnel)"
                      value={formComments[c.value] ?? ''}
                      onChange={(e) =>
                        setFormComments((prev) => ({ ...prev, [c.value]: e.target.value }))
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
              Utiliser la notation automatique
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
