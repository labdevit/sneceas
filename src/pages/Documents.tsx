import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  FileText,
  Download,
  Plus,
  Loader2,
  History,
  Pencil,
  Trash2,
  FileUp,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { getMediaUrl } from '@/lib/api';
import {
  getGestionDocuments,
  getGestionDocument,
  createGestionDocument,
  updateGestionDocument,
  deleteGestionDocument,
  getGestionDocumentHistorique,
  getGestionDocumentChoices,
  ensureGestionDocumentsSuivi,
  apiRequest,
  type GestionDocumentListDto,
  type GestionDocumentDto,
  type GestionDocumentHistoriqueDto,
  type GestionDocumentChoicesDto,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type PoleOption = { id: number; nom: string };
type RequeteOption = { id: number; numero_reference: string; titre: string };

export default function Documents() {
  const [documents, setDocuments] = useState<GestionDocumentListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterPole, setFilterPole] = useState<string>('all');
  const [filterConfidentialite, setFilterConfidentialite] = useState<string>('all');
  const [filterStatut, setFilterStatut] = useState<string>('all');

  const [choices, setChoices] = useState<GestionDocumentChoicesDto | null>(null);
  const [poles, setPoles] = useState<PoleOption[]>([]);
  const [requetes, setRequetes] = useState<RequeteOption[]>([]);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDoc, setDetailDoc] = useState<GestionDocumentDto | null>(null);
  const [historique, setHistorique] = useState<GestionDocumentHistoriqueDto[]>([]);
  const [historiqueLoading, setHistoriqueLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [ensureSuiviLoading, setEnsureSuiviLoading] = useState(false);
  const { isAdmin } = useAuth();

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Parameters<typeof getGestionDocuments>[0] = {
        ordering: '-created_at',
      };
      if (search.trim()) params.search = search.trim();
      if (filterPole !== 'all') params.pole = parseInt(filterPole, 10);
      if (filterConfidentialite !== 'all') params.confidentialite = filterConfidentialite;
      if (filterStatut !== 'all') params.statut = filterStatut;
      const data = await getGestionDocuments(params);
      setDocuments(data);
    } catch (err: unknown) {
      const msg =
        (err && typeof err === 'object' && 'data' in err && (err as { data?: { detail?: string } }).data?.detail) ||
        'Impossible de charger les documents';
      setError(String(msg));
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [search, filterPole, filterConfidentialite, filterStatut]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    getGestionDocumentChoices()
      .then(setChoices)
      .catch(() => setChoices(null));
  }, []);

  useEffect(() => {
    apiRequest<PoleOption[] | { results: PoleOption[] }>('/poles/')
      .then((data) => setPoles(Array.isArray(data) ? data : data.results ?? []))
      .catch(() => setPoles([]));
  }, []);

  useEffect(() => {
    apiRequest<RequeteOption[] | { results: RequeteOption[] }>('/requetes/?page_size=200')
      .then((data) => {
        const list = Array.isArray(data) ? data : (data as { results?: RequeteOption[] }).results ?? [];
        setRequetes(list);
      })
      .catch(() => setRequetes([]));
  }, []);

  const openDetail = (id: number) => {
    setDetailOpen(true);
    setDetailDoc(null);
    setHistorique([]);
    getGestionDocument(id)
      .then((doc) => {
        setDetailDoc(doc);
        setHistoriqueLoading(true);
        return getGestionDocumentHistorique(id);
      })
      .then(setHistorique)
      .catch(() => setHistorique([]))
      .finally(() => setHistoriqueLoading(false));
  };

  const handleDownload = (doc: GestionDocumentListDto | GestionDocumentDto) => {
    const url = getMediaUrl(doc.fichier);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = (id: number, titre: string) => {
    if (!window.confirm(`Supprimer le document « ${titre} » ?`)) return;
    setSubmitting(true);
    deleteGestionDocument(id)
      .then(() => {
        loadDocuments();
        if (detailDoc?.id === id) setDetailOpen(false);
      })
      .catch((err: unknown) => {
        const msg = (err && typeof err === 'object' && 'data' in err && (err as { data?: { detail?: string } }).data?.detail) || 'Erreur lors de la suppression';
        setError(String(msg));
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion des documents</h1>
          <p className="text-muted-foreground mt-1">
            Upload, classification par pôle, confidentialité (Public, Pôle, Bureau, Confidentiel), statut et lien optionnel avec une requête.
          </p>
        </div>
        <Button onClick={() => { setEditId(null); setUploadOpen(true); setFormError(null); }}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un document
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par titre ou description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterPole} onValueChange={setFilterPole}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Pôle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les pôles</SelectItem>
            {poles.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterConfidentialite} onValueChange={setFilterConfidentialite}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Confidentialité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {choices?.confidentialite?.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {choices?.statut?.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Pôle</TableHead>
                <TableHead>Confidentialité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Requête</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">Aucun document à afficher.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vous voyez les documents de vos requêtes (suivi automatique) et, si vous êtes responsable de pôle, ceux de votre pôle. Ajoutez un document ou modifiez les filtres.
                    </p>
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        disabled={ensureSuiviLoading}
                        onClick={async () => {
                          setEnsureSuiviLoading(true);
                          setError(null);
                          try {
                            const res = await ensureGestionDocumentsSuivi();
                            if (res.created > 0) {
                              loadDocuments();
                            }
                          } catch (err: unknown) {
                            const msg = (err && typeof err === 'object' && 'data' in err && (err as { data?: { detail?: string } }).data?.detail) || 'Erreur';
                            setError(String(msg));
                          } finally {
                            setEnsureSuiviLoading(false);
                          }
                        }}
                      >
                        {ensureSuiviLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Créer les documents de suivi des requêtes
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.titre}</TableCell>
                    <TableCell>{doc.pole_nom ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{doc.confidentialite_display}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{doc.statut_display}</Badge>
                    </TableCell>
                    <TableCell>
                      {doc.requete ? (
                        <Link to={`/tickets/${doc.requete}`} className="text-primary hover:underline text-sm">
                          {doc.requete_numero ?? doc.requete}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openDetail(doc.id)} title="Voir détail et historique">
                          <History className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} title="Télécharger">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEditId(doc.id); setUploadOpen(true); setFormError(null); }} title="Modifier">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id, doc.titre)} title="Supprimer" disabled={submitting}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog détail + historique */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Détail du document
            </DialogTitle>
          </DialogHeader>
          {detailDoc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Titre</span>
                <span className="font-medium">{detailDoc.titre}</span>
                <span className="text-muted-foreground">Pôle</span>
                <span>{detailDoc.pole_nom ?? '—'}</span>
                <span className="text-muted-foreground">Confidentialité</span>
                <span><Badge variant="outline">{detailDoc.confidentialite_display}</Badge></span>
                <span className="text-muted-foreground">Statut</span>
                <span><Badge variant="secondary">{detailDoc.statut_display}</Badge></span>
                <span className="text-muted-foreground">Requête</span>
                <span>
                  {detailDoc.requete_numero ? (
                    <Link to={`/tickets/${detailDoc.requete}`} className="text-primary hover:underline">{detailDoc.requete_numero}</Link>
                  ) : '—'}
                </span>
                <span className="text-muted-foreground">Créé par</span>
                <span>{detailDoc.created_by_username}</span>
                <span className="text-muted-foreground">Créé le</span>
                <span>{new Date(detailDoc.created_at).toLocaleString('fr-FR')}</span>
              </div>
              {detailDoc.description && (
                <p className="text-sm text-muted-foreground border-t pt-2">{detailDoc.description}</p>
              )}
              <Button variant="outline" size="sm" onClick={() => handleDownload(detailDoc)}>
                <Download className="w-4 h-4 mr-2" />
                Télécharger le fichier
              </Button>
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <History className="w-4 h-4" />
                  Historique des actions
                </h4>
                {historiqueLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <ul className="space-y-2 text-sm border rounded-lg p-3 max-h-48 overflow-y-auto">
                    {historique.length === 0 ? (
                      <li className="text-muted-foreground">Aucune action enregistrée.</li>
                    ) : (
                      historique.map((h) => (
                        <li key={h.id} className="flex flex-wrap gap-x-2 gap-y-1">
                          <Badge variant="outline" className="text-xs">{h.action_display}</Badge>
                          <span className="text-muted-foreground">{h.utilisateur_display ?? ''}</span>
                          <span>{new Date(h.timestamp).toLocaleString('fr-FR')}</span>
                          {h.commentaire && <span className="w-full text-muted-foreground">{h.commentaire}</span>}
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog upload / édition */}
      <UploadEditDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        editId={editId}
        poles={poles}
        requetes={requetes}
        choices={choices}
        onSuccess={() => { setUploadOpen(false); setEditId(null); loadDocuments(); }}
        submitting={submitting}
        setSubmitting={setSubmitting}
        formError={formError}
        setFormError={setFormError}
      />
    </div>
  );
}

interface UploadEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId: number | null;
  poles: PoleOption[];
  requetes: RequeteOption[];
  choices: GestionDocumentChoicesDto | null;
  onSuccess: () => void;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  formError: string | null;
  setFormError: (v: string | null) => void;
}

function UploadEditDialog({
  open,
  onOpenChange,
  editId,
  poles,
  requetes,
  choices,
  onSuccess,
  submitting,
  setSubmitting,
  formError,
  setFormError,
}: UploadEditDialogProps) {
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [poleId, setPoleId] = useState<string>('');
  const [confidentialite, setConfidentialite] = useState<string>('POLE');
  const [requeteId, setRequeteId] = useState<string>('');
  const [statut, setStatut] = useState<string>('ACTIF');
  const [file, setFile] = useState<File | null>(null);

  const isEdit = editId != null;

  useEffect(() => {
    if (!open) return;
    setTitre('');
    setDescription('');
    setPoleId('');
    setConfidentialite(choices?.confidentialite?.[0]?.value ?? 'POLE');
    setRequeteId('');
    setStatut(choices?.statut?.[0]?.value ?? 'ACTIF');
    setFile(null);
    setFormError(null);
    if (editId != null) {
      getGestionDocument(editId).then((doc) => {
        setTitre(doc.titre);
        setDescription(doc.description || '');
        setPoleId(doc.pole != null ? String(doc.pole) : '');
        setConfidentialite(doc.confidentialite);
        setRequeteId(doc.requete != null ? String(doc.requete) : '');
        setStatut(doc.statut);
      }).catch(() => setFormError('Impossible de charger le document'));
    }
  }, [open, editId, choices, setFormError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!titre.trim()) {
      setFormError('Le titre est obligatoire.');
      return;
    }
    if (!isEdit && !file) {
      setFormError('Le fichier est obligatoire pour un nouveau document.');
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit) {
        const formData = new FormData();
        formData.append('titre', titre.trim());
        formData.append('description', description.trim());
        formData.append('confidentialite', confidentialite);
        formData.append('statut', statut);
        if (poleId) formData.append('pole', poleId); else formData.append('pole', '');
        if (requeteId) formData.append('requete', requeteId); else formData.append('requete', '');
        if (file) formData.append('fichier', file);
        await updateGestionDocument(editId, formData);
      } else {
        const formData = new FormData();
        formData.append('titre', titre.trim());
        formData.append('description', description.trim());
        formData.append('confidentialite', confidentialite);
        formData.append('statut', statut);
        if (poleId) formData.append('pole', poleId);
        if (requeteId) formData.append('requete', requeteId);
        if (file) formData.append('fichier', file);
        await createGestionDocument(formData);
      }
      onSuccess();
    } catch (err: unknown) {
      const msg = (err && typeof err === 'object' && 'data' in err && (err as { data?: { detail?: string } }).data?.detail) || 'Erreur lors de l\'enregistrement';
      setFormError(String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5" />
            {isEdit ? 'Modifier le document' : 'Ajouter un document'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}
          <div>
            <Label htmlFor="doc-titre">Titre *</Label>
            <Input
              id="doc-titre"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Titre du document"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="doc-desc">Description</Label>
            <textarea
              id="doc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description optionnelle"
              className={cn(
                'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1'
              )}
            />
          </div>
          {!isEdit && (
            <div>
              <Label htmlFor="doc-file">Fichier *</Label>
              <Input
                id="doc-file"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1"
              />
            </div>
          )}
          {isEdit && (
            <div>
              <Label>Fichier actuel</Label>
              <p className="text-sm text-muted-foreground mt-1">Laissez vide pour conserver le fichier, ou choisissez un nouveau.</p>
              <Input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1"
              />
            </div>
          )}
          <div>
            <Label>Pôle</Label>
            <Select value={poleId || 'none'} onValueChange={(v) => setPoleId(v === 'none' ? '' : v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sélectionner un pôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {poles.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Confidentialité</Label>
            <Select value={confidentialite} onValueChange={setConfidentialite}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {choices?.confidentialite?.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Requête (optionnel)</Label>
            <Select value={requeteId || 'none'} onValueChange={(v) => setRequeteId(v === 'none' ? '' : v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Lier à une requête" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                {requetes.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>{r.numero_reference} — {r.titre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Statut</Label>
            <Select value={statut} onValueChange={setStatut}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {choices?.statut?.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
