import { useState, useEffect, useRef } from 'react';
import { Search, Megaphone, Calendar, User, Paperclip, Globe, Building2, PlusCircle, Upload, X, Pencil, Trash2, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/RichTextEditor';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import DOMPurify from 'dompurify';
import {
  getCommunications,
  getCommunicationCanManage,
  createCommunicationPost,
  updateCommunicationPost,
  deleteCommunicationPost,
  uploadCommunicationInlineImage,
  addCommunicationAttachment,
  getMediaUrl,
  apiRequest,
  type CommunicationPostDto,
  type CreateCommunicationPostPayload,
} from '@/lib/api';

/** Affiche du HTML sanitisé (contenu éditeur riche). */
function SafeHtml({ html, className }: { html: string; className?: string }) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h2', 'h3', 'img'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class'],
  });
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

const visibilityLabels: Record<string, string> = {
  global: 'Tous les adhérents',
  company: 'Par compagnie',
  pole: 'Par pôle',
};

const visibilityIcons: Record<string, typeof Globe> = {
  global: Globe,
  company: Building2,
  pole: Megaphone,
};

function fileNameFromPath(path: string): string {
  const parts = path.replace(/^.*[/\\]/, '');
  return parts || 'Pièce jointe';
}

/** Extrait un résumé texte depuis du HTML (sans balises), tronqué à maxLength caractères. */
function htmlToSummary(html: string, maxLength: number = 220): string {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (!div) return html.replace(/<[^>]*>/g, '').slice(0, maxLength).trim();
  div.innerHTML = html;
  const text = (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '…';
}

const COMMUNICATIONS_PAGE_SIZE = 10;

type VisibiliteForm = 'global' | 'company' | 'pole';

const emptyForm = {
  titre: '',
  contenu: '',
  visibilite: 'global' as VisibiliteForm,
  entreprise_cible: null as number | null,
  pole_cible: null as number | null,
};

export default function Communication() {
  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [posts, setPosts] = useState<CommunicationPostDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [postToRead, setPostToRead] = useState<CommunicationPostDto | null>(null);

  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [editingPost, setEditingPost] = useState<CommunicationPostDto | null>(null);
  const [postToDelete, setPostToDelete] = useState<CommunicationPostDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [attachmentFiles, setAttachmentFiles] = useState<{ file: File; description: string }[]>([]);
  const [entreprises, setEntreprises] = useState<{ id: number; nom: string }[]>([]);
  const [poles, setPoles] = useState<{ id: number; nom: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const loadList = (pageNum: number = 1) => {
    setLoading(true);
    setError(null);
    getCommunications({
      page: pageNum,
      page_size: COMMUNICATIONS_PAGE_SIZE,
      search: searchQuery || undefined,
      visibilite: visibilityFilter !== 'all' ? visibilityFilter : undefined,
    })
      .then((data) => {
        setPosts(data.results);
        setTotalCount(data.count);
        setPage(pageNum);
      })
      .catch((e) => setError(e?.data?.detail ?? 'Impossible de charger les communications.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    getCommunicationCanManage()
      .then(({ can_manage }) => { if (!cancelled) setCanManage(can_manage); })
      .catch(() => { if (!cancelled) setCanManage(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    loadList(1);
  }, [searchQuery, visibilityFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / COMMUNICATIONS_PAGE_SIZE));
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const handleOpenNewDialog = (open: boolean) => {
    if (!open) {
      setEditingPost(null);
    }
    setOpenNewDialog(open);
    if (open) {
      if (!editingPost) {
        setForm(emptyForm);
        setAttachmentFiles([]);
      }
      setCreateError(null);
      Promise.all([
        apiRequest<{ id: number; nom: string }[] | { results: { id: number; nom: string }[] }>('/entreprises/'),
        apiRequest<{ id: number; nom: string }[] | { results: { id: number; nom: string }[] }>('/poles/'),
      ]).then(([entData, polesData]) => {
        setEntreprises(Array.isArray(entData) ? entData : entData.results ?? []);
        setPoles(Array.isArray(polesData) ? polesData : polesData.results ?? []);
      }).catch(() => {
        setEntreprises([]);
        setPoles([]);
      });
    }
  };

  const handleOpenEdit = (post: CommunicationPostDto) => {
    setEditingPost(post);
    setForm({
      titre: post.titre,
      contenu: post.contenu,
      visibilite: post.visibilite,
      entreprise_cible: post.entreprise_cible,
      pole_cible: post.pole_cible,
    });
    setAttachmentFiles([]);
    setCreateError(null);
    setOpenNewDialog(true);
    Promise.all([
      apiRequest<{ id: number; nom: string }[] | { results: { id: number; nom: string }[] }>('/entreprises/'),
      apiRequest<{ id: number; nom: string }[] | { results: { id: number; nom: string }[] }>('/poles/'),
    ]).then(([entData, polesData]) => {
      setEntreprises(Array.isArray(entData) ? entData : entData.results ?? []);
      setPoles(Array.isArray(polesData) ? polesData : polesData.results ?? []);
    }).catch(() => {
      setEntreprises([]);
      setPoles([]);
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    const payload: CreateCommunicationPostPayload = {
      titre: form.titre.trim(),
      contenu: form.contenu.trim(),
      visibilite: form.visibilite,
      entreprise_cible: form.visibilite === 'company' ? form.entreprise_cible : null,
      pole_cible: form.visibilite === 'pole' ? form.pole_cible : null,
    };
    if (!payload.titre) {
      setCreateError('Le titre est obligatoire.');
      return;
    }
    setSubmitting(true);
    if (editingPost) {
      updateCommunicationPost(editingPost.id, payload)
      .then(() => {
        setEditingPost(null);
        setOpenNewDialog(false);
        loadList(1);
      })
        .catch((e) => {
          const d = e?.data;
          const msg =
            typeof d?.detail === 'string'
              ? d.detail
              : Array.isArray(d?.detail)
                ? d.detail[0]
                : d?.titre?.[0] ?? 'Erreur lors de l\'enregistrement.';
          setCreateError(msg);
        })
        .finally(() => setSubmitting(false));
      return;
    }
    createCommunicationPost(payload)
      .then((post) => {
        const uploads = attachmentFiles.map(({ file, description }) =>
          addCommunicationAttachment(post.id, file, description || undefined)
        );
        return Promise.all(uploads).then(() => post);
      })
      .then(() => {
        setOpenNewDialog(false);
        loadList(1);
      })
      .catch((e) => {
        const d = e?.data;
        const msg =
          typeof d?.detail === 'string'
            ? d.detail
            : Array.isArray(d?.detail)
              ? d.detail[0]
              : d?.titre?.[0] ?? 'Erreur lors de la création.';
        setCreateError(msg);
      })
      .finally(() => setSubmitting(false));
  };

  const handleConfirmDelete = () => {
    if (!postToDelete) return;
    setDeleting(true);
    deleteCommunicationPost(postToDelete.id)
      .then(() => {
        setPostToDelete(null);
        loadList(page);
      })
      .finally(() => setDeleting(false));
  };

  const handleAddAttachments = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = '';
    if (!files?.length) return;
    setAttachmentFiles((prev) => [
      ...prev,
      ...Array.from(files).map((file) => ({ file, description: '' })),
    ]);
  };

  const removeAttachment = (index: number) => {
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const setAttachmentDescription = (index: number, description: string) => {
    setAttachmentFiles((prev) =>
      prev.map((item, i) => (i === index ? { ...item, description } : item))
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Communication syndicale</h1>
          <p className="text-muted-foreground mt-1">
            Restez informé des actualités et annonces du S.N.E.C.E.A.
          </p>
        </div>
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => handleOpenNewDialog(true)}
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Nouvelle publication
          </Button>
        )}
      </div>

      {/* Dialog Nouvelle publication */}
      <Dialog open={openNewDialog} onOpenChange={handleOpenNewDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
            <DialogTitle>{editingPost ? 'Modifier la publication' : 'Nouvelle publication'}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0 px-6">
            <form id="comm-form" onSubmit={handleCreateSubmit} className="space-y-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="comm-titre">Titre</Label>
              <Input
                id="comm-titre"
                value={form.titre}
                onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))}
                placeholder="Titre de la publication"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Contenu</Label>
              <RichTextEditor
                value={form.contenu}
                onChange={(html) => setForm((f) => ({ ...f, contenu: html }))}
                placeholder="Contenu : paragraphes, listes, liens, images (glisser-déposer ou bouton Image depuis l'ordinateur)…"
                minHeight="220px"
                onUploadImage={async (file) => {
                  const { url } = await uploadCommunicationInlineImage(file);
                  return getMediaUrl(url);
                }}
              />
            </div>
            {!editingPost && (
              <div className="space-y-2">
                <Label>Pièces jointes (documents ou images)</Label>
                <input
                  ref={attachmentInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleAddAttachments}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => attachmentInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Ajouter des fichiers depuis l'ordinateur
                </Button>
                {attachmentFiles.length > 0 && (
                  <ul className="space-y-2 mt-2">
                    {attachmentFiles.map((item, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 p-2 rounded-md border bg-muted/30"
                      >
                        <Paperclip className="w-4 h-4 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm flex-1 min-w-0">{item.file.name}</span>
                        <Input
                          placeholder="Description (optionnel)"
                          value={item.description}
                          onChange={(e) => setAttachmentDescription(index, e.target.value)}
                          className="h-8 flex-1 min-w-0 max-w-[180px]"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removeAttachment(index)}
                          title="Retirer"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Visibilité</Label>
              <Select
                value={form.visibilite}
                onValueChange={(v) => setForm((f) => ({ ...f, visibilite: v as VisibiliteForm }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">{visibilityLabels.global}</SelectItem>
                  <SelectItem value="company">{visibilityLabels.company}</SelectItem>
                  <SelectItem value="pole">{visibilityLabels.pole}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.visibilite === 'company' && (
              <div className="space-y-2">
                <Label>Entreprise cible</Label>
                <Select
                  value={form.entreprise_cible != null ? String(form.entreprise_cible) : ''}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, entreprise_cible: v ? Number(v) : null }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une entreprise" />
                  </SelectTrigger>
                  <SelectContent>
                    {entreprises.map((ent) => (
                      <SelectItem key={ent.id} value={String(ent.id)}>
                        {ent.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.visibilite === 'pole' && (
              <div className="space-y-2">
                <Label>Pôle cible</Label>
                <Select
                  value={form.pole_cible != null ? String(form.pole_cible) : ''}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, pole_cible: v ? Number(v) : null }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un pôle" />
                  </SelectTrigger>
                  <SelectContent>
                    {poles.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
            </form>
          </div>
          <DialogFooter className="shrink-0 border-t px-6 py-4 bg-muted/30">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenNewDialog(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button type="submit" form="comm-form" disabled={submitting}>
              {submitting ? (editingPost ? 'Enregistrement…' : 'Publication…') : editingPost ? 'Enregistrer' : 'Publier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <AlertDialog open={!!postToDelete} onOpenChange={(open) => !open && setPostToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la publication ?</AlertDialogTitle>
            <AlertDialogDescription>
              {postToDelete ? (
                <>
                  La publication « {postToDelete.titre} » sera définitivement supprimée. Cette action est irréversible.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleConfirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Suppression…' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Popup Lire la suite */}
      <Dialog open={!!postToRead} onOpenChange={(open) => !open && setPostToRead(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0">
          {postToRead && (
            <>
              <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
                <DialogTitle className="pr-8">{postToRead.titre}</DialogTitle>
                <p className="text-xs text-muted-foreground">
                  {new Date(postToRead.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  {' · '}
                  {visibilityLabels[postToRead.visibilite] ?? postToRead.visibilite}
                  {postToRead.visibilite === 'company' && postToRead.entreprise_cible_nom && ` — ${postToRead.entreprise_cible_nom}`}
                  {postToRead.visibilite === 'pole' && postToRead.pole_cible_nom && ` — ${postToRead.pole_cible_nom}`}
                </p>
              </DialogHeader>
              <div className="overflow-y-auto flex-1 min-h-0 px-6 pb-6">
                <SafeHtml
                  html={postToRead.contenu}
                  className="text-muted-foreground leading-relaxed prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-img:rounded-lg prose-img:max-w-full"
                />
                {postToRead.pieces_jointes.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="text-sm font-medium w-full">Pièces jointes :</span>
                    {postToRead.pieces_jointes.map((file) => (
                      <a
                        key={file.id}
                        href={getMediaUrl(file.fichier)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                          <Paperclip className="w-3 h-3 mr-1" />
                          {file.description || fileNameFromPath(file.fichier)}
                        </Badge>
                      </a>
                    ))}
                  </div>
                )}
                <Separator className="my-4" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {postToRead.auteur_first_name} {postToRead.auteur_last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{postToRead.auteur_username}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une publication..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Visibilité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="global">Globales</SelectItem>
            <SelectItem value="company">Par compagnie</SelectItem>
            <SelectItem value="pole">Par pôle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 bg-card rounded-xl border">
          <p className="text-muted-foreground">Chargement des publications…</p>
        </div>
      ) : (
        <>
          {/* Posts */}
          <div className="space-y-6">
            {posts.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border">
                <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucune publication trouvée</p>
              </div>
            ) : (
              posts.map((post) => {
                const VisibilityIcon = visibilityIcons[post.visibilite] ?? Globe;
                const targetLabel =
                  post.visibilite === 'company' && post.entreprise_cible_nom
                    ? ` — ${post.entreprise_cible_nom}`
                    : post.visibilite === 'pole' && post.pole_cible_nom
                      ? ` — ${post.pole_cible_nom}`
                      : '';

                return (
                  <article
                    key={post.id}
                    className="bg-card rounded-xl border shadow-card overflow-hidden card-interactive"
                  >
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Megaphone className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <VisibilityIcon className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {visibilityLabels[post.visibilite] ?? post.visibilite}
                                {targetLabel}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <Calendar className="w-3 h-3" />
                              {new Date(post.created_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </div>
                          </div>
                        </div>
                        {canManage && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenEdit(post)}
                              title="Modifier"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setPostToDelete(post)}
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Title */}
                      <h2 className="text-xl font-bold mb-2">{post.titre}</h2>

                      {/* Résumé */}
                      <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3">
                        {htmlToSummary(post.contenu)}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {post.auteur_first_name} {post.auteur_last_name}
                          </span>
                          <Button
                            type="button"
                            variant="link"
                            className="h-auto p-0 text-primary font-medium"
                            onClick={() => setPostToRead(post)}
                          >
                            <BookOpen className="w-3.5 h-3.5 mr-1 inline" />
                            Lire la suite
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
              <p className="text-sm text-muted-foreground order-2 sm:order-1">
                {(page - 1) * COMMUNICATIONS_PAGE_SIZE + 1}–{Math.min(page * COMMUNICATIONS_PAGE_SIZE, totalCount)} sur {totalCount} publication(s)
              </p>
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadList(page - 1)}
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
                  onClick={() => loadList(page + 1)}
                  disabled={!hasNext || loading}
                >
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
