import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getActiviteTemplatesPage,
  deleteActiviteTemplate,
  updateActiviteTemplate,
  type ActiviteTemplateListeDto,
} from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Search, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 400;

export function ActiviteTemplateList() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ActiviteTemplateListeDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const isFirstRender = useRef(true);
  const [confirmDisableId, setConfirmDisableId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'true' | 'false'>('all');

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const load = useCallback((pageNum: number = 1, overrides?: { search?: string; dateAfter?: string; dateBefore?: string; isActive?: boolean | null }) => {
    setLoading(true);
    const search = overrides?.search !== undefined ? overrides.search : appliedSearch;
    const after = overrides?.dateAfter !== undefined ? overrides.dateAfter : dateFrom;
    const before = overrides?.dateBefore !== undefined ? overrides.dateBefore : dateTo;
    const isActive = overrides?.isActive !== undefined ? overrides.isActive : (statusFilter === 'all' ? undefined : statusFilter === 'true');
    getActiviteTemplatesPage({
      page: pageNum,
      search: search.trim() || undefined,
      created_after: after.trim() || undefined,
      created_before: before.trim() || undefined,
      is_active: isActive,
    })
      .then((data) => {
        setTemplates(data.results ?? []);
        setTotalCount(data.count ?? 0);
        setPage(pageNum);
      })
      .catch(() => {
        setTemplates([]);
        setTotalCount(0);
      })
      .finally(() => setLoading(false));
  }, [appliedSearch, dateFrom, dateTo, statusFilter]);

  useEffect(() => {
    load(1);
  }, [load]);

  // Recherche en direct (filtrée à la frappe) avec debounce
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const t = setTimeout(() => {
      setAppliedSearch(searchTerm);
      setLoading(true);
      getActiviteTemplatesPage({
        page: 1,
        search: searchTerm.trim() || undefined,
        created_after: dateFrom.trim() || undefined,
        created_before: dateTo.trim() || undefined,
        is_active: statusFilter === 'all' ? undefined : statusFilter === 'true',
      })
        .then((data) => {
          setTemplates(data.results ?? []);
          setTotalCount(data.count ?? 0);
          setPage(1);
        })
        .catch(() => {
          setTemplates([]);
          setTotalCount(0);
        })
        .finally(() => setLoading(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchTerm, dateFrom, dateTo, statusFilter]);

  const handleSearchClear = () => {
    setSearchTerm('');
    setAppliedSearch('');
    load(1, { search: '' });
  };

  const handleDateFilterClear = () => {
    setDateFrom('');
    setDateTo('');
    load(1, { dateAfter: '', dateBefore: '' });
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteActiviteTemplate(id);
      setConfirmDisableId(null);
      load(page);
      if (editingId === id) setEditingId(null);
      toast({
        title: 'Modèle désactivé',
        description: 'Les activités déjà créées restent visibles.',
      });
    } catch (e) {
      toast({
        title: 'Erreur',
        description: e instanceof Error ? e.message : 'Impossible de désactiver.',
        variant: 'destructive',
      });
    }
  };

  const handleReactivate = async (id: number) => {
    try {
      await updateActiviteTemplate(id, { is_active: true });
      load(page);
      toast({
        title: 'Modèle réactivé',
        description: 'Le modèle est à nouveau proposé pour les nouvelles activités.',
      });
    } catch (e) {
      toast({
        title: 'Erreur',
        description: e instanceof Error ? e.message : 'Impossible de réactiver.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Modèles d&apos;activité</h2>
        <Button
          onClick={() => {
            setCreating(true);
            setEditingId(null);
          }}
        >
          + Nouveau modèle
        </Button>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="mb-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Rechercher par nom, code ou description… (filtré à la frappe)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            aria-label="Recherche"
          />
        </div>
        {searchTerm.trim() && (
          <Button type="button" variant="ghost" size="default" onClick={handleSearchClear}>
            Effacer
          </Button>
        )}
      </form>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-muted-foreground">Filtre par date de création</span>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-muted-foreground">Du</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[160px]"
            aria-label="Créé après le"
          />
          <label className="text-sm text-muted-foreground">au</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[160px]"
            aria-label="Créé avant le"
          />
          {(dateFrom || dateTo) && (
            <Button type="button" variant="ghost" size="default" onClick={handleDateFilterClear}>
              Effacer les dates
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-l pl-4">
          <span className="text-sm font-medium text-muted-foreground">Statut</span>
          <Select
            value={statusFilter}
            onValueChange={(value: 'all' | 'true' | 'false') => setStatusFilter(value)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="true">Actifs</SelectItem>
              <SelectItem value="false">Désactivés</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {creating && (
        <div className="mb-6">
          <ActiviteTemplateForm
            onSuccess={() => {
              setCreating(false);
              load(1);
              toast({ title: 'Modèle créé' });
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {editingId && !creating && (
        <div className="mb-6">
          <ActiviteTemplateForm
            templateId={editingId}
            onSuccess={() => {
              setEditingId(null);
              load(page);
              toast({ title: 'Modèle enregistré' });
            }}
            onCancel={() => setEditingId(null)}
          />
        </div>
      )}

      <ul className="space-y-2">
        {loading ? (
          <li className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Chargement des modèles d&apos;activité…</span>
          </li>
        ) : (
          templates.map((t) => (
            <li
              key={t.id}
              className={`flex items-center justify-between rounded-lg border bg-card px-4 py-3 ${
                t.is_active ? '' : 'opacity-70 bg-muted/50'
              }`}
            >
              <span>
                <strong>{t.nom}</strong>
                <span className="ml-2 text-sm text-muted-foreground">
                  {t.code}
                  {t.pole_ids?.length ? ` · ${t.pole_ids.length} pôle(s)` : ''}
                  {t.created_at && (
                    <>
                      {' · '}
                      Créé le {new Date(t.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </>
                  )}
                </span>
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingId(t.id);
                    setCreating(false);
                  }}
                >
                  Modifier
                </Button>
                {t.is_active ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDisableId(t.id)}
                  >
                    Désactiver
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReactivate(t.id)}
                    className="border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700 dark:border-green-500 dark:text-green-400 dark:hover:bg-green-950 dark:hover:text-green-300"
                  >
                    Réactiver
                  </Button>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
      {!loading && !templates.length && !creating && (
        <p className="text-muted-foreground">
          Aucun modèle d&apos;activité. Créez-en un (réservé aux administrateurs).
        </p>
      )}

      {/* Confirmation désactivation */}
      <AlertDialog open={confirmDisableId !== null} onOpenChange={(open) => !open && setConfirmDisableId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver ce modèle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les activités déjà créées avec ce modèle resteront visibles. Le modèle ne sera plus proposé pour les nouvelles activités.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDisableId !== null && handleDelete(confirmDisableId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pagination */}
      {!loading && totalCount > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground order-2 sm:order-1">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} sur {totalCount} modèle(s)
          </p>
          <div className="flex items-center gap-2 order-1 sm:order-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => load(page - 1)}
              disabled={!hasPrev || loading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Précédent
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {page} sur {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => load(page + 1)}
              disabled={!hasNext || loading}
            >
              Suivant
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
