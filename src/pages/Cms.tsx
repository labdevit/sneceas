import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, Loader2, Globe, ExternalLink, Handshake, FolderOpen, FileText, Image,
  Newspaper, CalendarDays, Users, Layers, Monitor,
  UploadCloud, Mail, CheckCircle, Clock, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  cmsSlides, cmsServices, cmsArticles, cmsEvents, cmsTeam, cmsContact, cmsPartners, cmsPublicDocuments, cmsGallery,
  type CmsSlide, type CmsService, type CmsArticle, type CmsEvent, type CmsPartner, type CmsPublicDocument, type CmsGalleryImage,
  type CmsTeamMember, type CmsContact,
} from '@/lib/api/cms';

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  );
}

// ── Image Dropzone ───────────────────────────────────────────────────
function ImageDropzone({
  currentUrl, onFileChange, onUrlChange,
}: {
  currentUrl: string;
  onFileChange: (file: File | null) => void;
  onUrlChange: (url: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    onFileChange(file);
  }

  function clearFile() {
    setPreview(null);
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const display = preview || currentUrl;

  return (
    <div className="space-y-2">
      <div
        className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden ${dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/40'}`}
        style={{ minHeight: '110px' }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        {display ? (
          <>
            <img src={display} alt="" className="w-full max-h-36 object-cover" />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center">
              <p className="text-white text-xs font-medium opacity-0 hover:opacity-100 transition-opacity">Changer l'image</p>
            </div>
            {preview && (
              <button
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                onClick={(e) => { e.stopPropagation(); clearFile(); }}
              ><X className="w-3 h-3" /></button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <UploadCloud className="w-7 h-7" />
            <p className="text-sm">Glissez une image ou cliquez</p>
            <p className="text-xs opacity-50">PNG, JPG, WebP</p>
          </div>
        )}
      </div>
      <Input
        value={preview ? '' : currentUrl}
        onChange={(e) => { clearFile(); onUrlChange(e.target.value); }}
        placeholder="ou collez une URL d'image..."
        className="text-xs h-8"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ── SLIDES ───────────────────────────────────────────────────────────
const SLIDE_BLANK: Partial<CmsSlide> = { title: '', subtitle: '', badge_text: '', image_url: '', cta_label: '', cta_url: '', cta_label_secondary: '', cta_url_secondary: '', order: 1 };

function SlidesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CmsSlide | null>(null);
  const [form, setForm] = useState<Partial<CmsSlide>>(SLIDE_BLANK);
  const [imgFile, setImgFile] = useState<File | null>(null);

  const { data: slides = [], isLoading } = useQuery({ queryKey: ['cms-slides'], queryFn: cmsSlides.list });
  const inv = () => qc.invalidateQueries({ queryKey: ['cms-slides'] });

  const save = useMutation({
    mutationFn: () => editing
      ? cmsSlides.update(editing.id, form, imgFile ?? undefined)
      : cmsSlides.create(form, imgFile ?? undefined),
    onSuccess: () => { inv(); setOpen(false); toast({ title: 'Slide sauvegardé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
  const del = useMutation({
    mutationFn: (id: string) => cmsSlides.remove(id),
    onSuccess: () => { inv(); toast({ title: 'Slide supprimé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  function openCreate() { setEditing(null); setForm(SLIDE_BLANK); setImgFile(null); setOpen(true); }
  function openEdit(s: CmsSlide) { setEditing(s); setForm(s); setImgFile(null); setOpen(true); }
  function set(k: keyof CmsSlide, v: unknown) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{slides.length} slide{slides.length !== 1 ? 's' : ''} dans le carrousel</p>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
      </div>
      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin w-5 h-5 text-muted-foreground" /></div>
        : slides.length === 0 ? <div className="text-center py-10 text-muted-foreground text-sm">Aucun slide.</div>
        : <div className="space-y-2">{slides.map(s => (
          <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{s.order}</span>
            {s.background && <img src={s.background} alt="" className="w-14 h-9 object-cover rounded shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{s.title}</p>
              {s.badge_text && <p className="text-xs text-muted-foreground truncate">{s.badge_text}</p>}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm('Supprimer ?')) del.mutate(s.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        ))}</div>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Modifier' : 'Nouveau'} slide</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Image de fond">
              <ImageDropzone currentUrl={form.background ?? form.image_url ?? ''} onFileChange={setImgFile} onUrlChange={v => set('image_url', v)} />
            </Field>
            <Field label="Titre *"><Input value={form.title ?? ''} onChange={e => set('title', e.target.value)} /></Field>
            <Field label="Sous-titre"><Textarea rows={2} value={form.subtitle ?? ''} onChange={e => set('subtitle', e.target.value)} /></Field>
            <Field label="Badge"><Input value={form.badge_text ?? ''} onChange={e => set('badge_text', e.target.value)} placeholder="Syndicat National..." /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bouton 1"><Input value={form.cta_label ?? ''} onChange={e => set('cta_label', e.target.value)} placeholder="Nous rejoindre" /></Field>
              <Field label="Lien 1"><Input value={form.cta_url ?? ''} onChange={e => set('cta_url', e.target.value)} placeholder="/contact" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bouton 2"><Input value={form.cta_label_secondary ?? ''} onChange={e => set('cta_label_secondary', e.target.value)} placeholder="Nos services" /></Field>
              <Field label="Lien 2"><Input value={form.cta_url_secondary ?? ''} onChange={e => set('cta_url_secondary', e.target.value)} placeholder="/services" /></Field>
            </div>
            <Field label="Ordre"><Input type="number" min={1} value={form.order ?? 1} onChange={e => set('order', parseInt(e.target.value) || 1)} className="w-24" /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.title}>
              {save.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── SERVICES ─────────────────────────────────────────────────────────
const ICONS = ['Shield', 'Scale', 'Users', 'BookOpen', 'Handshake', 'HeartHandshake', 'Briefcase', 'FileText', 'Star', 'Building2'];
const SVC_BLANK: Partial<CmsService> = { title: '', slug: '', icon: 'Shield', short_description: '', body: '', order: 1 };

function ServicesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CmsService | null>(null);
  const [form, setForm] = useState<Partial<CmsService>>(SVC_BLANK);

  const { data: services = [], isLoading } = useQuery({ queryKey: ['cms-services'], queryFn: cmsServices.list });
  const inv = () => qc.invalidateQueries({ queryKey: ['cms-services'] });

  const save = useMutation({
    mutationFn: () => editing
      ? cmsServices.update(editing.slug, form)
      : cmsServices.create({ ...form, slug: form.slug || slugify(form.title ?? '') }),
    onSuccess: () => { inv(); setOpen(false); toast({ title: 'Service sauvegardé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
  const del = useMutation({
    mutationFn: (slug: string) => cmsServices.remove(slug),
    onSuccess: () => { inv(); toast({ title: 'Service supprimé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  function openCreate() { setEditing(null); setForm(SVC_BLANK); setOpen(true); }
  function openEdit(s: CmsService) { setEditing(s); setForm(s); setOpen(true); }
  function set(k: keyof CmsService, v: unknown) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{services.length} service{services.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
      </div>
      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin w-5 h-5 text-muted-foreground" /></div>
        : services.length === 0 ? <div className="text-center py-10 text-muted-foreground text-sm">Aucun service.</div>
        : <div className="space-y-2">{services.map(s => (
          <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
            <span className="w-6 text-xs font-mono text-muted-foreground shrink-0">{s.order}</span>
            <Badge variant="secondary" className="shrink-0 text-xs">{s.icon}</Badge>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{s.title}</p>
              <p className="text-xs text-muted-foreground truncate">{s.short_description}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm('Supprimer ?')) del.mutate(s.slug); }}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        ))}</div>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Modifier' : 'Nouveau'} service</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Titre *"><Input value={form.title ?? ''} onChange={e => set('title', e.target.value)} /></Field>
            {!editing && <Field label="Slug"><Input value={form.slug || slugify(form.title ?? '')} onChange={e => set('slug', e.target.value)} /></Field>}
            <Field label="Icône">
              <Select value={form.icon ?? 'Shield'} onValueChange={v => set('icon', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ICONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Description courte *"><Textarea rows={2} value={form.short_description ?? ''} onChange={e => set('short_description', e.target.value)} /></Field>
            <Field label="Description complète"><Textarea rows={4} value={form.body ?? ''} onChange={e => set('body', e.target.value)} /></Field>
            <Field label="Ordre"><Input type="number" min={1} value={form.order ?? 1} onChange={e => set('order', parseInt(e.target.value) || 1)} className="w-24" /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.title || !form.short_description}>
              {save.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── ARTICLES ─────────────────────────────────────────────────────────
const ART_BLANK: Partial<CmsArticle> = { title: '', slug: '', excerpt: '', cover_image_url: '', author_name: '', category: 'Actualité', status: 'draft', is_featured: false, body: '' };
const ART_CATS = ['Actualité', 'Négociation', 'Juridique', 'Formation', 'Événement', 'Communiqué'];

function ArticlesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CmsArticle | null>(null);
  const [form, setForm] = useState<Partial<CmsArticle>>(ART_BLANK);
  const [imgFile, setImgFile] = useState<File | null>(null);

  const { data: articles = [], isLoading } = useQuery({ queryKey: ['cms-articles'], queryFn: cmsArticles.list });
  const inv = () => qc.invalidateQueries({ queryKey: ['cms-articles'] });

  const save = useMutation({
    mutationFn: () => editing
      ? cmsArticles.update(editing.slug, form, imgFile ?? undefined)
      : cmsArticles.create({ ...form, slug: form.slug || slugify(form.title ?? '') }, imgFile ?? undefined),
    onSuccess: () => { inv(); setOpen(false); toast({ title: 'Article sauvegardé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
  const del = useMutation({
    mutationFn: (slug: string) => cmsArticles.remove(slug),
    onSuccess: () => { inv(); toast({ title: 'Article supprimé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  function openCreate() { setEditing(null); setForm(ART_BLANK); setImgFile(null); setOpen(true); }
  function openEdit(a: CmsArticle) { setEditing(a); setForm(a); setImgFile(null); setOpen(true); }
  function set(k: keyof CmsArticle, v: unknown) { setForm(f => ({ ...f, [k]: v })); }

  const STATUS: Record<string, 'default' | 'secondary' | 'outline'> = { published: 'default', draft: 'secondary', archived: 'outline' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{articles.length} article{articles.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
      </div>
      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin w-5 h-5 text-muted-foreground" /></div>
        : articles.length === 0 ? <div className="text-center py-10 text-muted-foreground text-sm">Aucun article.</div>
        : <div className="space-y-2">{articles.map(a => (
          <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
            {a.cover ? <img src={a.cover} alt="" className="w-14 h-9 object-cover rounded shrink-0" /> : <div className="w-14 h-9 rounded bg-muted shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{a.title}</p>
              <p className="text-xs text-muted-foreground">{a.category}</p>
            </div>
            <Badge variant={STATUS[a.status] ?? 'secondary'} className="shrink-0 text-xs capitalize">{a.status}</Badge>
            {a.is_featured && <Badge className="shrink-0 text-xs">★</Badge>}
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm('Supprimer ?')) del.mutate(a.slug); }}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        ))}</div>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Modifier' : 'Nouvel'} article</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Image de couverture">
              <ImageDropzone currentUrl={form.cover ?? form.cover_image_url ?? ''} onFileChange={setImgFile} onUrlChange={v => set('cover_image_url', v)} />
            </Field>
            <Field label="Titre *"><Input value={form.title ?? ''} onChange={e => set('title', e.target.value)} /></Field>
            {!editing && <Field label="Slug"><Input value={form.slug || slugify(form.title ?? '')} onChange={e => set('slug', e.target.value)} /></Field>}
            <Field label="Résumé"><Textarea rows={2} value={form.excerpt ?? ''} onChange={e => set('excerpt', e.target.value)} /></Field>
            <Field label="Contenu"><Textarea rows={4} value={form.body ?? ''} onChange={e => set('body', e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Auteur"><Input value={form.author_name ?? ''} onChange={e => set('author_name', e.target.value)} /></Field>
              <Field label="Catégorie">
                <Select value={form.category ?? 'Actualité'} onValueChange={v => set('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ART_CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Statut">
                <Select value={form.status ?? 'draft'} onValueChange={v => set('status', v)}>
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
                  <Switch checked={!!form.is_featured} onCheckedChange={v => set('is_featured', v)} />
                  <span className="text-sm">{form.is_featured ? 'Oui' : 'Non'}</span>
                </div>
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.title}>
              {save.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── EVENTS ───────────────────────────────────────────────────────────
const EVT_BLANK: Partial<CmsEvent> = { title: '', slug: '', description: '', cover_image_url: '', location: '', address: '', start_date: '', end_date: '', status: 'upcoming', is_featured: false, registration_url: '' };

function EventsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CmsEvent | null>(null);
  const [form, setForm] = useState<Partial<CmsEvent>>(EVT_BLANK);
  const [imgFile, setImgFile] = useState<File | null>(null);

  const { data: events = [], isLoading } = useQuery({ queryKey: ['cms-events'], queryFn: cmsEvents.list });
  const inv = () => qc.invalidateQueries({ queryKey: ['cms-events'] });

  const save = useMutation({
    mutationFn: () => {
      const payload = { ...form, slug: form.slug || slugify(form.title ?? ''), end_date: form.end_date || null };
      return editing
        ? cmsEvents.update(editing.slug, payload, imgFile ?? undefined)
        : cmsEvents.create(payload, imgFile ?? undefined);
    },
    onSuccess: () => { inv(); setOpen(false); toast({ title: 'Événement sauvegardé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
  const del = useMutation({
    mutationFn: (slug: string) => cmsEvents.remove(slug),
    onSuccess: () => { inv(); toast({ title: 'Événement supprimé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  function openCreate() { setEditing(null); setForm(EVT_BLANK); setImgFile(null); setOpen(true); }
  function openEdit(e: CmsEvent) { setEditing(e); setForm(e); setImgFile(null); setOpen(true); }
  function set(k: keyof CmsEvent, v: unknown) { setForm(f => ({ ...f, [k]: v })); }
  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{events.length} événement{events.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
      </div>
      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin w-5 h-5 text-muted-foreground" /></div>
        : events.length === 0 ? <div className="text-center py-10 text-muted-foreground text-sm">Aucun événement.</div>
        : <div className="space-y-2">{events.map(e => (
          <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
            {e.cover ? <img src={e.cover} alt="" className="w-14 h-9 object-cover rounded shrink-0" /> : <div className="w-14 h-9 rounded bg-muted flex items-center justify-center shrink-0"><CalendarDays className="w-4 h-4 text-muted-foreground" /></div>}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{e.title}</p>
              <p className="text-xs text-muted-foreground">{fmtDate(e.start_date)} · {e.location}</p>
            </div>
            <Badge variant={e.status === 'upcoming' ? 'default' : 'secondary'} className="shrink-0 text-xs">{e.status}</Badge>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm('Supprimer ?')) del.mutate(e.slug); }}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        ))}</div>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Modifier' : 'Nouvel'} événement</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Image">
              <ImageDropzone currentUrl={form.cover ?? form.cover_image_url ?? ''} onFileChange={setImgFile} onUrlChange={v => set('cover_image_url', v)} />
            </Field>
            <Field label="Titre *"><Input value={form.title ?? ''} onChange={e => set('title', e.target.value)} /></Field>
            {!editing && <Field label="Slug"><Input value={form.slug || slugify(form.title ?? '')} onChange={e => set('slug', e.target.value)} /></Field>}
            <Field label="Description"><Textarea rows={2} value={form.description ?? ''} onChange={e => set('description', e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lieu"><Input value={form.location ?? ''} onChange={e => set('location', e.target.value)} /></Field>
              <Field label="Adresse"><Input value={form.address ?? ''} onChange={e => set('address', e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date début *"><Input type="datetime-local" value={form.start_date ? form.start_date.slice(0, 16) : ''} onChange={e => set('start_date', e.target.value + ':00Z')} /></Field>
              <Field label="Date fin"><Input type="datetime-local" value={form.end_date ? form.end_date.slice(0, 16) : ''} onChange={e => set('end_date', e.target.value ? e.target.value + ':00Z' : '')} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Statut">
                <Select value={form.status ?? 'upcoming'} onValueChange={v => set('status', v)}>
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
                  <Switch checked={!!form.is_featured} onCheckedChange={v => set('is_featured', v)} />
                  <span className="text-sm">{form.is_featured ? 'Oui' : 'Non'}</span>
                </div>
              </Field>
            </div>
            <Field label="URL d'inscription"><Input value={form.registration_url ?? ''} onChange={e => set('registration_url', e.target.value)} placeholder="https://..." /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.title || !form.start_date}>
              {save.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── TEAM ─────────────────────────────────────────────────────────────
const TEAM_BLANK: Partial<CmsTeamMember> = { full_name: '', role: '', bio: '', photo_url: '', email: '', linkedin_url: '', order: 1 };

function TeamTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CmsTeamMember | null>(null);
  const [form, setForm] = useState<Partial<CmsTeamMember>>(TEAM_BLANK);
  const [imgFile, setImgFile] = useState<File | null>(null);

  const { data: members = [], isLoading } = useQuery({ queryKey: ['cms-team'], queryFn: cmsTeam.list });
  const inv = () => qc.invalidateQueries({ queryKey: ['cms-team'] });

  const save = useMutation({
    mutationFn: () => editing
      ? cmsTeam.update(editing.id, form, imgFile ?? undefined)
      : cmsTeam.create(form, imgFile ?? undefined),
    onSuccess: () => { inv(); setOpen(false); toast({ title: 'Membre sauvegardé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
  const del = useMutation({
    mutationFn: (id: string) => cmsTeam.remove(id),
    onSuccess: () => { inv(); toast({ title: 'Membre supprimé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  function openCreate() { setEditing(null); setForm({ ...TEAM_BLANK, order: members.length + 1 }); setImgFile(null); setOpen(true); }
  function openEdit(m: CmsTeamMember) { setEditing(m); setForm(m); setImgFile(null); setOpen(true); }
  function set(k: keyof CmsTeamMember, v: unknown) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{members.length} membre{members.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Ajouter</Button>
      </div>
      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin w-5 h-5 text-muted-foreground" /></div>
        : members.length === 0 ? <div className="text-center py-10 text-muted-foreground text-sm">Aucun membre.</div>
        : <div className="space-y-2">{members.map(m => (
          <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
            {m.avatar ? <img src={m.avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" /> : <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0"><Users className="w-4 h-4 text-muted-foreground" /></div>}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{m.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{m.role}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(m)}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm('Supprimer ?')) del.mutate(m.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        ))}</div>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Modifier' : 'Nouveau'} membre</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Photo">
              <ImageDropzone currentUrl={form.avatar ?? form.photo_url ?? ''} onFileChange={setImgFile} onUrlChange={v => set('photo_url', v)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nom complet *"><Input value={form.full_name ?? ''} onChange={e => set('full_name', e.target.value)} /></Field>
              <Field label="Fonction *"><Input value={form.role ?? ''} onChange={e => set('role', e.target.value)} /></Field>
            </div>
            <Field label="Biographie"><Textarea rows={3} value={form.bio ?? ''} onChange={e => set('bio', e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email"><Input type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} /></Field>
              <Field label="LinkedIn"><Input value={form.linkedin_url ?? ''} onChange={e => set('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." /></Field>
            </div>
            <Field label="Ordre"><Input type="number" min={1} value={form.order ?? 1} onChange={e => set('order', parseInt(e.target.value) || 1)} className="w-24" /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.full_name || !form.role}>
              {save.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── CONTACT MESSAGES ─────────────────────────────────────────────────
function ContactTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<CmsContact | null>(null);

  const { data: messages = [], isLoading } = useQuery({ queryKey: ['cms-contact'], queryFn: cmsContact.list });
  const inv = () => qc.invalidateQueries({ queryKey: ['cms-contact'] });

  const markRead = useMutation({
    mutationFn: (id: string) => cmsContact.updateStatus(id, 'resolved'),
    onSuccess: () => { inv(); toast({ title: 'Marqué comme traité' }); },
  });
  const del = useMutation({
    mutationFn: (id: string) => cmsContact.remove(id),
    onSuccess: () => { inv(); setSelected(null); toast({ title: 'Message supprimé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const unread = messages.filter(m => m.status === 'new').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">{messages.length} message{messages.length !== 1 ? 's' : ''}</p>
        {unread > 0 && <Badge variant="default" className="text-xs">{unread} nouveau{unread > 1 ? 'x' : ''}</Badge>}
      </div>
      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin w-5 h-5 text-muted-foreground" /></div>
        : messages.length === 0 ? <div className="text-center py-10 text-muted-foreground text-sm">Aucun message reçu.</div>
        : <div className="space-y-2">{messages.map(m => (
          <div
            key={m.id}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent/30 ${m.status === 'new' ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}
            onClick={() => setSelected(m)}
          >
            <div className="mt-0.5 shrink-0">
              {m.status === 'new' ? <Clock className="w-4 h-4 text-primary" /> : <CheckCircle className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{m.full_name}</p>
                {m.company && <span className="text-xs text-muted-foreground">· {m.company}</span>}
              </div>
              <p className="text-xs font-medium text-foreground/80 truncate">{m.subject}</p>
              <p className="text-xs text-muted-foreground truncate">{m.message}</p>
            </div>
            <div className="text-xs text-muted-foreground shrink-0">
              {new Date(m.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </div>
          </div>
        ))}</div>}

      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-4 h-4" /> Message de {selected.full_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div><span className="font-semibold text-foreground">Email : </span>{selected.email}</div>
                {selected.phone && <div><span className="font-semibold text-foreground">Tél : </span>{selected.phone}</div>}
                {selected.company && <div><span className="font-semibold text-foreground">Société : </span>{selected.company}</div>}
                <div><span className="font-semibold text-foreground">Date : </span>{new Date(selected.created_at).toLocaleString('fr-FR')}</div>
              </div>
              <Separator />
              <p className="font-semibold">{selected.subject}</p>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{selected.message}</p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => { if (confirm('Supprimer ?')) del.mutate(selected.id); }}>
                <Trash2 className="w-3.5 h-3.5 mr-1" />Supprimer
              </Button>
              {selected.status === 'new' && (
                <Button size="sm" onClick={() => { markRead.mutate(selected.id); setSelected(null); }}>
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />Marquer traité
                </Button>
              )}
              <a href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <Mail className="w-3.5 h-3.5" />Répondre par email
              </a>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

// ── PAGE PRINCIPALE ──────────────────────────────────────────────────
export default function Cms() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" />Gestion du site web
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Gérez le contenu visible sur le site public du S.N.E.C.E.A.S</p>
        </div>
        <a href="http://188.245.55.173:3001" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Monitor className="w-4 h-4" />Voir le site<ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <Tabs defaultValue="slides">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="slides" className="flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5" />Hero Slides</TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />Services</TabsTrigger>
          <TabsTrigger value="articles" className="flex items-center gap-1.5"><Newspaper className="w-3.5 h-3.5" />Articles</TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />Événements</TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Équipe</TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />Messages</TabsTrigger>
          <TabsTrigger value="partners" className="flex items-center gap-1.5"><Handshake className="w-3.5 h-3.5" />Partenaires</TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1.5"><FolderOpen className="w-3.5 h-3.5" />Documents</TabsTrigger>
          <TabsTrigger value="gallery" className="flex items-center gap-1.5"><Image className="w-3.5 h-3.5" />Galerie</TabsTrigger>
        </TabsList>
        <Separator className="my-4" />
        <TabsContent value="slides"><SlidesTab /></TabsContent>
        <TabsContent value="services"><ServicesTab /></TabsContent>
        <TabsContent value="articles"><ArticlesTab /></TabsContent>
        <TabsContent value="events"><EventsTab /></TabsContent>
        <TabsContent value="team"><TeamTab /></TabsContent>
        <TabsContent value="contact"><ContactTab /></TabsContent>
        <TabsContent value="partners"><PartnersTab /></TabsContent>
        <TabsContent value="documents"><DocumentsTab /></TabsContent>
        <TabsContent value="gallery"><GalleryTab /></TabsContent>
      </Tabs>
    </div>
  );
}
