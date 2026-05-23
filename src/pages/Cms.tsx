import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, Loader2, Globe, Image, ExternalLink,
  Newspaper, CalendarDays, Users, Layers, Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  cmsSlides, cmsServices, cmsArticles, cmsEvents, cmsTeam,
  type CmsSlide, type CmsService, type CmsArticle, type CmsEvent, type CmsTeamMember,
} from '@/lib/api/cms';

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Shared field helpers ─────────────────────────────────────────────
function Field({
  label, children,
}: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>
      {children}
    </div>
  );
}

// ── SLIDES TAB ───────────────────────────────────────────────────────
const SLIDE_BLANK: Partial<CmsSlide> = {
  title: '', subtitle: '', badge_text: '', image_url: '',
  cta_label: '', cta_url: '', cta_label_secondary: '', cta_url_secondary: '', order: 1,
};

function SlidesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CmsSlide | null>(null);
  const [form, setForm] = useState<Partial<CmsSlide>>(SLIDE_BLANK);

  const { data: slides = [], isLoading } = useQuery({
    queryKey: ['cms-slides'],
    queryFn: cmsSlides.list,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['cms-slides'] });

  const saveMutation = useMutation({
    mutationFn: () =>
      editing ? cmsSlides.update(editing.id, form) : cmsSlides.create(form),
    onSuccess: () => { invalidate(); setOpen(false); toast({ title: 'Slide sauvegardé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => cmsSlides.remove(id),
    onSuccess: () => { invalidate(); toast({ title: 'Slide supprimé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  function openCreate() { setEditing(null); setForm(SLIDE_BLANK); setOpen(true); }
  function openEdit(s: CmsSlide) { setEditing(s); setForm(s); setOpen(true); }
  function set(k: keyof CmsSlide, v: unknown) { setForm((f) => ({ ...f, [k]: v })); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{slides.length} slide{slides.length !== 1 ? 's' : ''} dans le carrousel du hero</p>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin w-5 h-5 text-muted-foreground" /></div>
      ) : slides.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Aucun slide — cliquez « Ajouter » pour créer le premier.</div>
      ) : (
        <div className="space-y-2">
          {slides.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{s.order}</span>
              {s.background && (
                <img src={s.background} alt="" className="w-12 h-8 object-cover rounded shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{s.title}</p>
                {s.badge_text && <p className="text-xs text-muted-foreground truncate">{s.badge_text}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => { if (confirm('Supprimer ce slide ?')) deleteMutation.mutate(s.id); }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le slide' : 'Nouveau slide'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Titre *"><Input value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder="Votre voix dans le secteur..." /></Field>
            <Field label="Sous-titre"><Textarea rows={2} value={form.subtitle ?? ''} onChange={(e) => set('subtitle', e.target.value)} /></Field>
            <Field label="Badge"><Input value={form.badge_text ?? ''} onChange={(e) => set('badge_text', e.target.value)} placeholder="Syndicat National..." /></Field>
            <Field label="URL image de fond"><Input value={form.image_url ?? ''} onChange={(e) => set('image_url', e.target.value)} placeholder="https://..." /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bouton principal"><Input value={form.cta_label ?? ''} onChange={(e) => set('cta_label', e.target.value)} placeholder="Nous rejoindre" /></Field>
              <Field label="Lien bouton principal"><Input value={form.cta_url ?? ''} onChange={(e) => set('cta_url', e.target.value)} placeholder="/contact" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bouton secondaire"><Input value={form.cta_label_secondary ?? ''} onChange={(e) => set('cta_label_secondary', e.target.value)} placeholder="Nos services" /></Field>
              <Field label="Lien bouton secondaire"><Input value={form.cta_url_secondary ?? ''} onChange={(e) => set('cta_url_secondary', e.target.value)} placeholder="/services" /></Field>
            </div>
            <Field label="Ordre">
              <Input type="number" min={1} value={form.order ?? 1} onChange={(e) => set('order', parseInt(e.target.value, 10) || 1)} className="w-24" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── SERVICES TAB ─────────────────────────────────────────────────────
const ICONS = ['Shield', 'Scale', 'Users', 'BookOpen', 'Handshake', 'HeartHandshake', 'Briefcase', 'FileText', 'Star', 'Building2'];

const SVC_BLANK: Partial<CmsService> = {
  title: '', slug: '', icon: 'Shield', short_description: '', body: '', order: 1,
};

function ServicesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CmsService | null>(null);
  const [form, setForm] = useState<Partial<CmsService>>(SVC_BLANK);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['cms-services'],
    queryFn: cmsServices.list,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['cms-services'] });

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? cmsServices.update(editing.slug, form)
        : cmsServices.create({ ...form, slug: form.slug || slugify(form.title ?? '') }),
    onSuccess: () => { invalidate(); setOpen(false); toast({ title: 'Service sauvegardé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => cmsServices.remove(slug),
    onSuccess: () => { invalidate(); toast({ title: 'Service supprimé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  function openCreate() { setEditing(null); setForm(SVC_BLANK); setOpen(true); }
  function openEdit(s: CmsService) { setEditing(s); setForm(s); setOpen(true); }
  function set(k: keyof CmsService, v: unknown) { setForm((f) => ({ ...f, [k]: v })); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{services.length} service{services.length !== 1 ? 's' : ''} affiché{services.length !== 1 ? 's' : ''} sur la page d'accueil</p>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin w-5 h-5 text-muted-foreground" /></div>
      ) : services.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Aucun service configuré.</div>
      ) : (
        <div className="space-y-2">
          {services.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
              <span className="w-6 text-xs font-mono text-muted-foreground shrink-0">{s.order}</span>
              <Badge variant="secondary" className="shrink-0 text-xs">{s.icon}</Badge>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground truncate">{s.short_description}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => { if (confirm('Supprimer ce service ?')) deleteMutation.mutate(s.slug); }}
                ><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Modifier le service' : 'Nouveau service'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Titre *"><Input value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} /></Field>
            {!editing && (
              <Field label="Slug">
                <Input value={form.slug || slugify(form.title ?? '')} onChange={(e) => set('slug', e.target.value)} placeholder="auto-généré depuis le titre" />
              </Field>
            )}
            <Field label="Icône">
              <Select value={form.icon ?? 'Shield'} onValueChange={(v) => set('icon', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ICONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Description courte *"><Textarea rows={2} value={form.short_description ?? ''} onChange={(e) => set('short_description', e.target.value)} /></Field>
            <Field label="Description complète"><Textarea rows={4} value={form.body ?? ''} onChange={(e) => set('body', e.target.value)} /></Field>
            <Field label="Ordre"><Input type="number" min={1} value={form.order ?? 1} onChange={(e) => set('order', parseInt(e.target.value, 10) || 1)} className="w-24" /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title || !form.short_description}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── ARTICLES TAB ─────────────────────────────────────────────────────
const ART_BLANK: Partial<CmsArticle> = {
  title: '', slug: '', excerpt: '', cover_image_url: '', author_name: '',
  category: 'Actualité', status: 'draft', is_featured: false, body: '',
};

const ART_CATEGORIES = ['Actualité', 'Négociation', 'Juridique', 'Formation', 'Événement', 'Communiqué'];

function ArticlesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CmsArticle | null>(null);
  const [form, setForm] = useState<Partial<CmsArticle>>(ART_BLANK);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['cms-articles'],
    queryFn: cmsArticles.list,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['cms-articles'] });

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? cmsArticles.update(editing.slug, form)
        : cmsArticles.create({ ...form, slug: form.slug || slugify(form.title ?? '') }),
    onSuccess: () => { invalidate(); setOpen(false); toast({ title: 'Article sauvegardé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => cmsArticles.remove(slug),
    onSuccess: () => { invalidate(); toast({ title: 'Article supprimé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const STATUS_COLORS: Record<string, string> = {
    draft: 'secondary', published: 'default', archived: 'outline',
  } as const;

  function openCreate() { setEditing(null); setForm(ART_BLANK); setOpen(true); }
  function openEdit(a: CmsArticle) { setEditing(a); setForm(a); setOpen(true); }
  function set(k: keyof CmsArticle, v: unknown) { setForm((f) => ({ ...f, [k]: v })); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{articles.length} article{articles.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin w-5 h-5 text-muted-foreground" /></div>
      ) : articles.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Aucun article publié.</div>
      ) : (
        <div className="space-y-2">
          {articles.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
              {a.cover ? (
                <img src={a.cover} alt="" className="w-12 h-8 object-cover rounded shrink-0" />
              ) : (
                <div className="w-12 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                  <Image className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.category}</p>
              </div>
              <Badge variant={(STATUS_COLORS[a.status] ?? 'secondary') as 'default' | 'secondary' | 'outline'} className="shrink-0 text-xs capitalize">{a.status}</Badge>
              {a.is_featured && <Badge variant="default" className="shrink-0 text-xs">★</Badge>}
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => { if (confirm('Supprimer cet article ?')) deleteMutation.mutate(a.slug); }}
                ><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Modifier l\'article' : 'Nouvel article'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Titre *"><Input value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} /></Field>
            {!editing && (
              <Field label="Slug">
                <Input value={form.slug || slugify(form.title ?? '')} onChange={(e) => set('slug', e.target.value)} />
              </Field>
            )}
            <Field label="Résumé"><Textarea rows={2} value={form.excerpt ?? ''} onChange={(e) => set('excerpt', e.target.value)} /></Field>
            <Field label="Contenu"><Textarea rows={4} value={form.body ?? ''} onChange={(e) => set('body', e.target.value)} /></Field>
            <Field label="URL image de couverture">
              <Input value={form.cover_image_url ?? ''} onChange={(e) => set('cover_image_url', e.target.value)} placeholder="https://..." />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Auteur"><Input value={form.author_name ?? ''} onChange={(e) => set('author_name', e.target.value)} /></Field>
              <Field label="Catégorie">
                <Select value={form.category ?? 'Actualité'} onValueChange={(v) => set('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ART_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Statut">
                <Select value={form.status ?? 'draft'} onValueChange={(v) => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="published">Publié</SelectItem>
                    <SelectItem value="archived">Archivé</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="À la une">
                <div className="flex items-center gap-2 pt-2">
                  <Switch checked={!!form.is_featured} onCheckedChange={(v) => set('is_featured', v)} />
                  <span className="text-sm">{form.is_featured ? 'Oui' : 'Non'}</span>
                </div>
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── EVENTS TAB ───────────────────────────────────────────────────────
const EVT_BLANK: Partial<CmsEvent> = {
  title: '', slug: '', description: '', cover_image_url: '',
  location: '', address: '', start_date: '', end_date: '',
  status: 'upcoming', is_featured: false, registration_url: '',
};

function EventsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CmsEvent | null>(null);
  const [form, setForm] = useState<Partial<CmsEvent>>(EVT_BLANK);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['cms-events'],
    queryFn: cmsEvents.list,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['cms-events'] });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        slug: form.slug || slugify(form.title ?? ''),
        end_date: form.end_date || null,
      };
      return editing ? cmsEvents.update(editing.slug, payload) : cmsEvents.create(payload);
    },
    onSuccess: () => { invalidate(); setOpen(false); toast({ title: 'Événement sauvegardé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => cmsEvents.remove(slug),
    onSuccess: () => { invalidate(); toast({ title: 'Événement supprimé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  function openCreate() { setEditing(null); setForm(EVT_BLANK); setOpen(true); }
  function openEdit(e: CmsEvent) { setEditing(e); setForm(e); setOpen(true); }
  function set(k: keyof CmsEvent, v: unknown) { setForm((f) => ({ ...f, [k]: v })); }

  const fmtDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{events.length} événement{events.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin w-5 h-5 text-muted-foreground" /></div>
      ) : events.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Aucun événement programmé.</div>
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
              {e.cover ? (
                <img src={e.cover} alt="" className="w-12 h-8 object-cover rounded shrink-0" />
              ) : (
                <div className="w-12 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{e.title}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(e.start_date)} · {e.location}</p>
              </div>
              <Badge variant={e.status === 'upcoming' ? 'default' : 'secondary'} className="shrink-0 text-xs capitalize">{e.status}</Badge>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => { if (confirm('Supprimer cet événement ?')) deleteMutation.mutate(e.slug); }}
                ><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Modifier l\'événement' : 'Nouvel événement'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Titre *"><Input value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} /></Field>
            {!editing && (
              <Field label="Slug"><Input value={form.slug || slugify(form.title ?? '')} onChange={(e) => set('slug', e.target.value)} /></Field>
            )}
            <Field label="Description"><Textarea rows={2} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
            <Field label="URL image"><Input value={form.cover_image_url ?? ''} onChange={(e) => set('cover_image_url', e.target.value)} placeholder="https://..." /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lieu"><Input value={form.location ?? ''} onChange={(e) => set('location', e.target.value)} /></Field>
              <Field label="Adresse"><Input value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date de début *"><Input type="datetime-local" value={form.start_date ? form.start_date.slice(0, 16) : ''} onChange={(e) => set('start_date', e.target.value + ':00Z')} /></Field>
              <Field label="Date de fin"><Input type="datetime-local" value={form.end_date ? form.end_date.slice(0, 16) : ''} onChange={(e) => set('end_date', e.target.value ? e.target.value + ':00Z' : '')} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Statut">
                <Select value={form.status ?? 'upcoming'} onValueChange={(v) => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">À venir</SelectItem>
                    <SelectItem value="ongoing">En cours</SelectItem>
                    <SelectItem value="past">Passé</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="À la une">
                <div className="flex items-center gap-2 pt-2">
                  <Switch checked={!!form.is_featured} onCheckedChange={(v) => set('is_featured', v)} />
                  <span className="text-sm">{form.is_featured ? 'Oui' : 'Non'}</span>
                </div>
              </Field>
            </div>
            <Field label="URL d'inscription"><Input value={form.registration_url ?? ''} onChange={(e) => set('registration_url', e.target.value)} placeholder="https://..." /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title || !form.start_date}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── TEAM TAB ─────────────────────────────────────────────────────────
const TEAM_BLANK: Partial<CmsTeamMember> = {
  full_name: '', role: '', bio: '', photo_url: '', email: '', linkedin_url: '', order: 1,
};

function TeamTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CmsTeamMember | null>(null);
  const [form, setForm] = useState<Partial<CmsTeamMember>>(TEAM_BLANK);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['cms-team'],
    queryFn: cmsTeam.list,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['cms-team'] });

  const saveMutation = useMutation({
    mutationFn: () =>
      editing ? cmsTeam.update(editing.id, form) : cmsTeam.create(form),
    onSuccess: () => { invalidate(); setOpen(false); toast({ title: 'Membre sauvegardé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => cmsTeam.remove(id),
    onSuccess: () => { invalidate(); toast({ title: 'Membre supprimé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  function openCreate() { setEditing(null); setForm({ ...TEAM_BLANK, order: members.length + 1 }); setOpen(true); }
  function openEdit(m: CmsTeamMember) { setEditing(m); setForm(m); setOpen(true); }
  function set(k: keyof CmsTeamMember, v: unknown) { setForm((f) => ({ ...f, [k]: v })); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{members.length} membre{members.length !== 1 ? 's' : ''} de l'équipe visible sur le site</p>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin w-5 h-5 text-muted-foreground" /></div>
      ) : members.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Aucun membre de l'équipe.</div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
              {m.avatar ? (
                <img src={m.avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{m.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{m.role}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(m)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => { if (confirm('Supprimer ce membre ?')) deleteMutation.mutate(m.id); }}
                ><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Modifier le membre' : 'Nouveau membre'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nom complet *"><Input value={form.full_name ?? ''} onChange={(e) => set('full_name', e.target.value)} /></Field>
              <Field label="Fonction *"><Input value={form.role ?? ''} onChange={(e) => set('role', e.target.value)} placeholder="Secrétaire Général" /></Field>
            </div>
            <Field label="Biographie"><Textarea rows={3} value={form.bio ?? ''} onChange={(e) => set('bio', e.target.value)} /></Field>
            <Field label="URL photo"><Input value={form.photo_url ?? ''} onChange={(e) => set('photo_url', e.target.value)} placeholder="https://..." /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email"><Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Field>
              <Field label="LinkedIn URL"><Input value={form.linkedin_url ?? ''} onChange={(e) => set('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." /></Field>
            </div>
            <Field label="Ordre"><Input type="number" min={1} value={form.order ?? 1} onChange={(e) => set('order', parseInt(e.target.value, 10) || 1)} className="w-24" /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.full_name || !form.role}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── MAIN PAGE ────────────────────────────────────────────────────────
export default function Cms() {
  const SITE_URL = 'http://188.245.55.173:3001';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" />
            Gestion du site web
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gérez le contenu visible sur le site public du S.N.E.C.E.A.S
          </p>
        </div>
        <a
          href={SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Monitor className="w-4 h-4" />
          Voir le site
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <Tabs defaultValue="slides">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="slides" className="flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5" />Hero Slides
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />Services
          </TabsTrigger>
          <TabsTrigger value="articles" className="flex items-center gap-1.5">
            <Newspaper className="w-3.5 h-3.5" />Articles
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />Événements
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />Équipe
          </TabsTrigger>
        </TabsList>

        <Separator className="my-4" />

        <TabsContent value="slides"><SlidesTab /></TabsContent>
        <TabsContent value="services"><ServicesTab /></TabsContent>
        <TabsContent value="articles"><ArticlesTab /></TabsContent>
        <TabsContent value="events"><EventsTab /></TabsContent>
        <TabsContent value="team"><TeamTab /></TabsContent>
      </Tabs>
    </div>
  );
}
