import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, Loader2, Globe, ExternalLink, Handshake, FolderOpen, FileText, Image,
  Newspaper, CalendarDays, Users, Layers, Monitor,
  UploadCloud, Mail, CheckCircle, Clock, X, GripVertical, Video,
} from 'lucide-react';
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, arrayMove, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WysiwygEditor } from '@/components/ui/wysiwyg';
import { useToast } from '@/hooks/use-toast';
import { useLayoutContext } from '@/components/layout/AppLayout';
import {
  cmsSlides, cmsServices, cmsArticles, cmsEvents, cmsTeam, cmsContact, cmsPartners, cmsPublicDocuments, cmsGallery, cmsMedia,
  type CmsSlide, type CmsService, type CmsArticle, type CmsEvent, type CmsPartner, type CmsPublicDocument,
  type CmsGalleryImage, type CmsGalleryMedia, type CmsTeamMember, type CmsContact,
} from '@/lib/api/cms';

const uploadBodyImage = (file: File) => cmsMedia.uploadImage(file);

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

// ── Media Dropzone (images + vidéos) ────────────────────────────────
function MediaDropzone({
  currentUrl,
  onFileChange,
  acceptVideo = false,
}: {
  currentUrl: string;
  onFileChange: (file: File | null) => void;
  acceptVideo?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isImage && !(acceptVideo && isVideo)) return;
    const url = URL.createObjectURL(file);
    setPreview({ url, type: isVideo ? 'video' : 'image' });
    onFileChange(file);
  }

  function clearFile() {
    setPreview(null);
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const isVideo = (url: string) => /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
  const displayUrl = preview?.url || currentUrl;
  const displayIsVideo = preview ? preview.type === 'video' : isVideo(currentUrl);
  const accept = acceptVideo ? 'image/*,video/*' : 'image/*';

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden ${dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/40'}`}
      style={{ minHeight: '110px' }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      {displayUrl ? (
        <>
          {displayIsVideo
            ? <video src={displayUrl} className="w-full max-h-36 object-cover" muted playsInline />
            : <img src={displayUrl} alt="" className="w-full max-h-36 object-cover" />}
          <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center">
            <p className="text-white text-xs font-medium opacity-0 hover:opacity-100 transition-opacity">Changer le média</p>
          </div>
          <button
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            onClick={(e) => { e.stopPropagation(); clearFile(); }}
          ><X className="w-3 h-3" /></button>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
          {acceptVideo ? <Video className="w-7 h-7" /> : <UploadCloud className="w-7 h-7" />}
          <p className="text-sm">Glissez {acceptVideo ? 'une image ou vidéo' : 'une image'} ou cliquez</p>
          <p className="text-xs opacity-50">{acceptVideo ? 'PNG, JPG, WebP, MP4, WebM' : 'PNG, JPG, WebP'} — max 20 Mo</p>
        </div>
      )}
    </div>
  );
}

// ── Sortable row wrapper ─────────────────────────────────────────────
function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (dragHandle: React.ReactNode) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      {children(
        <button {...attributes} {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground p-1 touch-none"
          onClick={(e) => e.stopPropagation()}>
          <GripVertical className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ── Form panel ───────────────────────────────────────────────────────
function FormPanel({
  title, onClose, onSave, isSaving, canSave, children,
}: {
  title: string;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
  canSave: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card shadow-sm flex flex-col h-fit sticky top-4 max-h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
        <h3 className="font-semibold text-sm">{title}</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>
      <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
        {children}
      </div>
      <div className="flex justify-end gap-2 px-5 py-3 border-t shrink-0">
        <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
        <Button size="sm" onClick={onSave} disabled={isSaving || !canSave}>
          {isSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Sauvegarder
        </Button>
      </div>
    </div>
  );
}

// ── Compact list item (when form is open) ───────────────────────────
function CompactRow({
  label, sub, thumb, isActive, onEdit, onDelete,
}: {
  label: string;
  sub?: string;
  thumb?: string;
  isActive: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer transition-colors ${isActive ? 'border-primary/40 bg-primary/5' : 'border-transparent hover:bg-accent/30'}`}
      onClick={onEdit}
    >
      {thumb && <img src={thumb} alt="" className="w-7 h-7 object-cover rounded shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
      </div>
      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 text-destructive hover:text-destructive"
        onClick={(e) => { e.stopPropagation(); if (confirm('Supprimer ?')) onDelete(); }}>
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
}

// ── Layout helpers ────────────────────────────────────────────────────
const GRID_OPEN = 'grid gap-4 lg:grid-cols-[200px_1fr] items-start';
const GRID_CLOSED = '';

// ── SLIDES ───────────────────────────────────────────────────────────
const SLIDE_BLANK: Partial<CmsSlide> = { title: '', subtitle: '', badge_text: '', image_url: '', cta_label: '', cta_url: '', cta_label_secondary: '', cta_url_secondary: '', order: 1, is_active: true };

function SlidesTab({ onFormChange }: { onFormChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CmsSlide | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<Partial<CmsSlide>>(SLIDE_BLANK);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [items, setItems] = useState<CmsSlide[]>([]);

  const { data: slides = [], isLoading } = useQuery({ queryKey: ['cms-slides'], queryFn: cmsSlides.list });
  const inv = () => qc.invalidateQueries({ queryKey: ['cms-slides'] });
  useEffect(() => { setItems([...slides].sort((a, b) => a.order - b.order)); }, [slides]);

  const open = isNew || editing !== null;
  const sensors = useSensors(useSensor(PointerSensor));

  const save = useMutation({
    mutationFn: () => editing ? cmsSlides.update(editing.id, form, imgFile ?? undefined) : cmsSlides.create(form, imgFile ?? undefined),
    onSuccess: () => { inv(); closeForm(); toast({ title: 'Slide sauvegardé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
  const del = useMutation({
    mutationFn: (id: string) => cmsSlides.remove(id),
    onSuccess: () => { inv(); toast({ title: 'Slide supprimé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  function openCreate() { setEditing(null); setIsNew(true); setForm({ ...SLIDE_BLANK, order: items.length + 1 }); setImgFile(null); onFormChange(true); }
  function openEdit(s: CmsSlide) { setEditing(s); setIsNew(false); setForm(s); setImgFile(null); onFormChange(true); }
  function closeForm() { setEditing(null); setIsNew(false); onFormChange(false); }
  function set(k: keyof CmsSlide, v: unknown) { setForm(f => ({ ...f, [k]: v })); }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const reordered = arrayMove(items, items.findIndex(i => i.id === active.id), items.findIndex(i => i.id === over.id)).map((item, idx) => ({ ...item, order: idx + 1 }));
    setItems(reordered);
    reordered.forEach(item => { if (slides.find(s => s.id === item.id)?.order !== item.order) cmsSlides.update(item.id, { order: item.order }); });
  }

  return (
    <div className={open ? GRID_OPEN : GRID_CLOSED}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-1 mb-1">
          <p className="text-xs text-muted-foreground">{items.length} slide{items.length !== 1 ? 's' : ''}</p>
          <Button size="sm" className="h-7 text-xs px-2" onClick={openCreate}><Plus className="w-3 h-3 mr-1" />Ajouter</Button>
        </div>
        {isLoading ? <div className="flex justify-center py-6"><Loader2 className="animate-spin w-4 h-4 text-muted-foreground" /></div>
          : items.length === 0 ? <p className="text-center py-8 text-xs text-muted-foreground">Aucun slide.</p>
          : open ? (
            <div className="space-y-1">
              {items.map(s => (
                <CompactRow key={s.id} label={s.title} sub={s.badge_text} thumb={s.background || s.image_url}
                  isActive={editing?.id === s.id} onEdit={() => openEdit(s)} onDelete={() => del.mutate(s.id)} />
              ))}
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {items.map(s => (
                    <SortableRow key={s.id} id={s.id}>
                      {(dragHandle) => (
                        <div className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                          {dragHandle}
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{s.order}</span>
                          {s.background && <img src={s.background} alt="" className="w-14 h-9 object-cover rounded shrink-0" />}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-sm truncate">{s.title}</p>
                              <Badge variant={s.is_active ? 'default' : 'secondary'} className="text-[10px] shrink-0">{s.is_active ? 'Actif' : 'Inactif'}</Badge>
                            </div>
                            {s.badge_text && <p className="text-xs text-muted-foreground truncate">{s.badge_text}</p>}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm('Supprimer ?')) del.mutate(s.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                      )}
                    </SortableRow>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
      </div>

      {open && (
        <FormPanel title={editing ? 'Modifier le slide' : 'Nouveau slide'} onClose={closeForm} onSave={() => save.mutate()} isSaving={save.isPending} canSave={!!form.title}>
          <Field label="Image / Vidéo de fond">
            <MediaDropzone currentUrl={form.background ?? form.image_url ?? ''} onFileChange={f => { setImgFile(f); if (f) set('image_url', ''); }} acceptVideo />
          </Field>
          <Field label="Titre *"><Input value={form.title ?? ''} onChange={e => set('title', e.target.value)} /></Field>
          <Field label="Sous-titre">
            <WysiwygEditor key={editing?.id ?? 'new-slide'} value={form.subtitle ?? ''} onChange={v => set('subtitle', v)} placeholder="Sous-titre…" minHeight="80px" />
          </Field>
          <Field label="Badge"><Input value={form.badge_text ?? ''} onChange={e => set('badge_text', e.target.value)} placeholder="Syndicat National…" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bouton 1"><Input value={form.cta_label ?? ''} onChange={e => set('cta_label', e.target.value)} placeholder="Nous rejoindre" /></Field>
            <Field label="Lien 1"><Input value={form.cta_url ?? ''} onChange={e => set('cta_url', e.target.value)} placeholder="/contact" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bouton 2"><Input value={form.cta_label_secondary ?? ''} onChange={e => set('cta_label_secondary', e.target.value)} placeholder="Nos services" /></Field>
            <Field label="Lien 2"><Input value={form.cta_url_secondary ?? ''} onChange={e => set('cta_url_secondary', e.target.value)} placeholder="/services" /></Field>
          </div>
          <Field label="Ordre"><Input type="number" min={1} value={form.order ?? 1} onChange={e => set('order', parseInt(e.target.value) || 1)} className="w-24" /></Field>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => set('is_active', !form.is_active)}
              className={cn('w-10 h-6 rounded-full transition-colors flex items-center px-0.5', form.is_active ? 'bg-primary' : 'bg-muted')}>
              <span className={cn('w-5 h-5 rounded-full bg-white shadow transition-transform', form.is_active ? 'translate-x-4' : 'translate-x-0')} />
            </button>
            <Label>Slide visible sur le site</Label>
          </div>
        </FormPanel>
      )}
    </div>
  );
}

// ── SERVICES ─────────────────────────────────────────────────────────
const ICONS = ['Shield', 'Scale', 'Users', 'BookOpen', 'Handshake', 'HeartHandshake', 'Briefcase', 'FileText', 'Star', 'Building2'];
const SVC_BLANK: Partial<CmsService> = { title: '', slug: '', icon: 'Shield', short_description: '', body: '', order: 1, is_active: true };

function ServicesTab({ onFormChange }: { onFormChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CmsService | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<Partial<CmsService>>(SVC_BLANK);
  const [items, setItems] = useState<CmsService[]>([]);

  const { data: services = [], isLoading } = useQuery({ queryKey: ['cms-services'], queryFn: cmsServices.list });
  const inv = () => qc.invalidateQueries({ queryKey: ['cms-services'] });
  useEffect(() => { setItems([...services].sort((a, b) => a.order - b.order)); }, [services]);

  const open = isNew || editing !== null;
  const sensors = useSensors(useSensor(PointerSensor));

  const save = useMutation({
    mutationFn: () => editing ? cmsServices.update(editing.slug, form) : cmsServices.create({ ...form, slug: form.slug || slugify(form.title ?? '') }),
    onSuccess: () => { inv(); closeForm(); toast({ title: 'Service sauvegardé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
  const del = useMutation({
    mutationFn: (slug: string) => cmsServices.remove(slug),
    onSuccess: () => { inv(); toast({ title: 'Service supprimé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  function openCreate() { setEditing(null); setIsNew(true); setForm({ ...SVC_BLANK, order: items.length + 1 }); onFormChange(true); }
  function openEdit(s: CmsService) { setEditing(s); setIsNew(false); setForm(s); onFormChange(true); }
  function closeForm() { setEditing(null); setIsNew(false); onFormChange(false); }
  function set(k: keyof CmsService, v: unknown) { setForm(f => ({ ...f, [k]: v })); }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const reordered = arrayMove(items, items.findIndex(i => i.id === active.id), items.findIndex(i => i.id === over.id)).map((item, idx) => ({ ...item, order: idx + 1 }));
    setItems(reordered);
    reordered.forEach(item => { if (services.find(s => s.id === item.id)?.order !== item.order) cmsServices.update(item.slug, { order: item.order }); });
  }

  return (
    <div className={open ? GRID_OPEN : GRID_CLOSED}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-1 mb-1">
          <p className="text-xs text-muted-foreground">{items.length} service{items.length !== 1 ? 's' : ''}</p>
          <Button size="sm" className="h-7 text-xs px-2" onClick={openCreate}><Plus className="w-3 h-3 mr-1" />Ajouter</Button>
        </div>
        {isLoading ? <div className="flex justify-center py-6"><Loader2 className="animate-spin w-4 h-4 text-muted-foreground" /></div>
          : items.length === 0 ? <p className="text-center py-8 text-xs text-muted-foreground">Aucun service.</p>
          : open ? (
            <div className="space-y-1">
              {items.map(s => <CompactRow key={s.id} label={s.title} sub={`${s.icon} · ${s.short_description}`} isActive={editing?.id === s.id} onEdit={() => openEdit(s)} onDelete={() => del.mutate(s.slug)} />)}
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {items.map(s => (
                    <SortableRow key={s.id} id={s.id}>
                      {(dragHandle) => (
                        <div className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                          {dragHandle}
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
                      )}
                    </SortableRow>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
      </div>

      {open && (
        <FormPanel title={editing ? 'Modifier le service' : 'Nouveau service'} onClose={closeForm} onSave={() => save.mutate()} isSaving={save.isPending} canSave={!!form.title && !!form.short_description}>
          <Field label="Titre *"><Input value={form.title ?? ''} onChange={e => set('title', e.target.value)} /></Field>
          {!editing && <Field label="Slug"><Input value={form.slug || slugify(form.title ?? '')} onChange={e => set('slug', e.target.value)} /></Field>}
          <Field label="Icône">
            <Select value={form.icon ?? 'Shield'} onValueChange={v => set('icon', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ICONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Description courte *">
            <WysiwygEditor key={`${editing?.id ?? 'new-svc'}-short`} value={form.short_description ?? ''} onChange={v => set('short_description', v)} placeholder="Courte description…" minHeight="80px" />
          </Field>
          <Field label="Description complète">
            <WysiwygEditor key={`${editing?.id ?? 'new-svc'}-body`} value={form.body ?? ''} onChange={v => set('body', v)} placeholder="Description complète…" onUploadImage={uploadBodyImage} />
          </Field>
          <Field label="Ordre"><Input type="number" min={1} value={form.order ?? 1} onChange={e => set('order', parseInt(e.target.value) || 1)} className="w-24" /></Field>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => set('is_active', !form.is_active)}
              className={cn('w-10 h-6 rounded-full transition-colors flex items-center px-0.5', form.is_active ? 'bg-primary' : 'bg-muted')}>
              <span className={cn('w-5 h-5 rounded-full bg-white shadow transition-transform', form.is_active ? 'translate-x-4' : 'translate-x-0')} />
            </button>
            <Label>Service visible sur le site</Label>
          </div>
        </FormPanel>
      )}
    </div>
  );
}

// ── ARTICLES ─────────────────────────────────────────────────────────
const ART_BLANK: Partial<CmsArticle> = { title: '', slug: '', excerpt: '', cover_image_url: '', author_name: '', category: 'Actualité', status: 'draft', is_featured: false, body: '' };
const ART_CATS = ['Actualité', 'Négociation', 'Juridique', 'Formation', 'Événement', 'Communiqué'];

function ArticlesTab({ onFormChange }: { onFormChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CmsArticle | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<Partial<CmsArticle>>(ART_BLANK);
  const [imgFile, setImgFile] = useState<File | null>(null);

  const { data: articles = [], isLoading } = useQuery({ queryKey: ['cms-articles'], queryFn: cmsArticles.list });
  const inv = () => qc.invalidateQueries({ queryKey: ['cms-articles'] });
  const open = isNew || editing !== null;

  const save = useMutation({
    mutationFn: () => editing ? cmsArticles.update(editing.slug, form, imgFile ?? undefined) : cmsArticles.create({ ...form, slug: form.slug || slugify(form.title ?? '') }, imgFile ?? undefined),
    onSuccess: () => { inv(); closeForm(); toast({ title: 'Article sauvegardé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
  const del = useMutation({
    mutationFn: (slug: string) => cmsArticles.remove(slug),
    onSuccess: () => { inv(); toast({ title: 'Article supprimé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  function openCreate() { setEditing(null); setIsNew(true); setForm(ART_BLANK); setImgFile(null); onFormChange(true); }
  function openEdit(a: CmsArticle) { setEditing(a); setIsNew(false); setForm(a); setImgFile(null); onFormChange(true); }
  function closeForm() { setEditing(null); setIsNew(false); onFormChange(false); }
  function set(k: keyof CmsArticle, v: unknown) { setForm(f => ({ ...f, [k]: v })); }

  const STATUS: Record<string, 'default' | 'secondary' | 'outline'> = { published: 'default', draft: 'secondary', archived: 'outline' };

  return (
    <div className={open ? GRID_OPEN : GRID_CLOSED}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-1 mb-1">
          <p className="text-xs text-muted-foreground">{articles.length} article{articles.length !== 1 ? 's' : ''}</p>
          <Button size="sm" className="h-7 text-xs px-2" onClick={openCreate}><Plus className="w-3 h-3 mr-1" />Ajouter</Button>
        </div>
        {isLoading ? <div className="flex justify-center py-6"><Loader2 className="animate-spin w-4 h-4 text-muted-foreground" /></div>
          : articles.length === 0 ? <p className="text-center py-8 text-xs text-muted-foreground">Aucun article.</p>
          : open ? (
            <div className="space-y-1">
              {articles.map(a => <CompactRow key={a.id} label={a.title} sub={a.category} thumb={a.cover || undefined} isActive={editing?.id === a.id} onEdit={() => openEdit(a)} onDelete={() => del.mutate(a.slug)} />)}
            </div>
          ) : (
            <div className="space-y-2">
              {articles.map(a => (
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
              ))}
            </div>
          )}
      </div>

      {open && (
        <FormPanel title={editing ? "Modifier l'article" : 'Nouvel article'} onClose={closeForm} onSave={() => save.mutate()} isSaving={save.isPending} canSave={!!form.title}>
          <Field label="Image de couverture">
            <MediaDropzone currentUrl={form.cover ?? form.cover_image_url ?? ''} onFileChange={f => { setImgFile(f); if (f) set('cover_image_url', ''); }} acceptVideo />
          </Field>
          <Field label="Titre *"><Input value={form.title ?? ''} onChange={e => set('title', e.target.value)} /></Field>
          {!editing && <Field label="Slug"><Input value={form.slug || slugify(form.title ?? '')} onChange={e => set('slug', e.target.value)} /></Field>}
          <Field label="Résumé">
            <WysiwygEditor key={`${editing?.id ?? 'new-art'}-excerpt`} value={form.excerpt ?? ''} onChange={v => set('excerpt', v)} placeholder="Résumé de l'article…" minHeight="80px" />
          </Field>
          <Field label="Contenu">
            <WysiwygEditor key={`${editing?.id ?? 'new-art'}-body`} value={form.body ?? ''} onChange={v => set('body', v)} placeholder="Contenu de l'article…" onUploadImage={uploadBodyImage} />
          </Field>
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
        </FormPanel>
      )}
    </div>
  );
}

// ── EVENTS ───────────────────────────────────────────────────────────
const EVT_BLANK: Partial<CmsEvent> = { title: '', slug: '', description: '', body: '', cover_image_url: '', location: '', address: '', start_date: '', end_date: '', status: 'upcoming', is_featured: false, registration_url: '' };

function EventsTab({ onFormChange }: { onFormChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CmsEvent | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<Partial<CmsEvent>>(EVT_BLANK);
  const [imgFile, setImgFile] = useState<File | null>(null);

  const { data: events = [], isLoading } = useQuery({ queryKey: ['cms-events'], queryFn: cmsEvents.list });
  const inv = () => qc.invalidateQueries({ queryKey: ['cms-events'] });
  const open = isNew || editing !== null;

  const save = useMutation({
    mutationFn: () => {
      const payload = { ...form, slug: form.slug || slugify(form.title ?? ''), end_date: form.end_date || null };
      return editing ? cmsEvents.update(editing.slug, payload, imgFile ?? undefined) : cmsEvents.create(payload, imgFile ?? undefined);
    },
    onSuccess: () => { inv(); closeForm(); toast({ title: 'Événement sauvegardé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
  const del = useMutation({
    mutationFn: (slug: string) => cmsEvents.remove(slug),
    onSuccess: () => { inv(); toast({ title: 'Événement supprimé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  function openCreate() { setEditing(null); setIsNew(true); setForm(EVT_BLANK); setImgFile(null); onFormChange(true); }
  function openEdit(e: CmsEvent) { setEditing(e); setIsNew(false); setForm(e); setImgFile(null); onFormChange(true); }
  function closeForm() { setEditing(null); setIsNew(false); onFormChange(false); }
  function set(k: keyof CmsEvent, v: unknown) { setForm(f => ({ ...f, [k]: v })); }
  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';

  return (
    <div className={open ? GRID_OPEN : GRID_CLOSED}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-1 mb-1">
          <p className="text-xs text-muted-foreground">{events.length} événement{events.length !== 1 ? 's' : ''}</p>
          <Button size="sm" className="h-7 text-xs px-2" onClick={openCreate}><Plus className="w-3 h-3 mr-1" />Ajouter</Button>
        </div>
        {isLoading ? <div className="flex justify-center py-6"><Loader2 className="animate-spin w-4 h-4 text-muted-foreground" /></div>
          : events.length === 0 ? <p className="text-center py-8 text-xs text-muted-foreground">Aucun événement.</p>
          : open ? (
            <div className="space-y-1">
              {events.map(e => <CompactRow key={e.id} label={e.title} sub={`${fmtDate(e.start_date)} · ${e.location}`} thumb={e.cover || undefined} isActive={editing?.id === e.id} onEdit={() => openEdit(e)} onDelete={() => del.mutate(e.slug)} />)}
            </div>
          ) : (
            <div className="space-y-2">
              {events.map(e => (
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
              ))}
            </div>
          )}
      </div>

      {open && (
        <FormPanel title={editing ? "Modifier l'événement" : 'Nouvel événement'} onClose={closeForm} onSave={() => save.mutate()} isSaving={save.isPending} canSave={!!form.title && !!form.start_date}>
          <Field label="Image / Vidéo">
            <MediaDropzone currentUrl={form.cover ?? form.cover_image_url ?? ''} onFileChange={f => { setImgFile(f); if (f) set('cover_image_url', ''); }} acceptVideo />
          </Field>
          <Field label="Titre *"><Input value={form.title ?? ''} onChange={e => set('title', e.target.value)} /></Field>
          {!editing && <Field label="Slug"><Input value={form.slug || slugify(form.title ?? '')} onChange={e => set('slug', e.target.value)} /></Field>}
          <Field label="Résumé (texte court)">
            <Textarea value={form.description ?? ''} onChange={e => set('description', e.target.value)} placeholder="Courte description affichée dans les listes…" rows={2} />
          </Field>
          <Field label="Contenu détaillé (images, vidéos, mise en forme…)">
            <WysiwygEditor key={`${editing?.id ?? 'new-evt'}-body`} value={form.body ?? ''} onChange={v => set('body', v)} placeholder="Contenu détaillé de l'événement…" onUploadImage={uploadBodyImage} />
          </Field>
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
          <Field label="URL d'inscription"><Input value={form.registration_url ?? ''} onChange={e => set('registration_url', e.target.value)} placeholder="https://…" /></Field>
        </FormPanel>
      )}
    </div>
  );
}

// ── TEAM ─────────────────────────────────────────────────────────────
const TEAM_BLANK: Partial<CmsTeamMember> = { full_name: '', role: '', bio: '', photo_url: '', email: '', linkedin_url: '', order: 1 };

function TeamTab({ onFormChange }: { onFormChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CmsTeamMember | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<Partial<CmsTeamMember>>(TEAM_BLANK);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [items, setItems] = useState<CmsTeamMember[]>([]);

  const { data: members = [], isLoading } = useQuery({ queryKey: ['cms-team'], queryFn: cmsTeam.list });
  const inv = () => qc.invalidateQueries({ queryKey: ['cms-team'] });
  useEffect(() => { setItems([...members].sort((a, b) => a.order - b.order)); }, [members]);

  const open = isNew || editing !== null;
  const sensors = useSensors(useSensor(PointerSensor));

  const save = useMutation({
    mutationFn: () => editing ? cmsTeam.update(editing.id, form, imgFile ?? undefined) : cmsTeam.create(form, imgFile ?? undefined),
    onSuccess: () => { inv(); closeForm(); toast({ title: 'Membre sauvegardé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
  const del = useMutation({
    mutationFn: (id: string) => cmsTeam.remove(id),
    onSuccess: () => { inv(); toast({ title: 'Membre supprimé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  function openCreate() { setEditing(null); setIsNew(true); setForm({ ...TEAM_BLANK, order: items.length + 1 }); setImgFile(null); onFormChange(true); }
  function openEdit(m: CmsTeamMember) { setEditing(m); setIsNew(false); setForm(m); setImgFile(null); onFormChange(true); }
  function closeForm() { setEditing(null); setIsNew(false); onFormChange(false); }
  function set(k: keyof CmsTeamMember, v: unknown) { setForm(f => ({ ...f, [k]: v })); }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const reordered = arrayMove(items, items.findIndex(i => i.id === active.id), items.findIndex(i => i.id === over.id)).map((item, idx) => ({ ...item, order: idx + 1 }));
    setItems(reordered);
    reordered.forEach(item => { if (members.find(m => m.id === item.id)?.order !== item.order) cmsTeam.update(item.id, { order: item.order }); });
  }

  return (
    <div className={open ? GRID_OPEN : GRID_CLOSED}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-1 mb-1">
          <p className="text-xs text-muted-foreground">{items.length} membre{items.length !== 1 ? 's' : ''}</p>
          <Button size="sm" className="h-7 text-xs px-2" onClick={openCreate}><Plus className="w-3 h-3 mr-1" />Ajouter</Button>
        </div>
        {isLoading ? <div className="flex justify-center py-6"><Loader2 className="animate-spin w-4 h-4 text-muted-foreground" /></div>
          : items.length === 0 ? <p className="text-center py-8 text-xs text-muted-foreground">Aucun membre.</p>
          : open ? (
            <div className="space-y-1">
              {items.map(m => <CompactRow key={m.id} label={m.full_name} sub={m.role} thumb={m.avatar || undefined} isActive={editing?.id === m.id} onEdit={() => openEdit(m)} onDelete={() => del.mutate(m.id)} />)}
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {items.map(m => (
                    <SortableRow key={m.id} id={m.id}>
                      {(dragHandle) => (
                        <div className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                          {dragHandle}
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
                      )}
                    </SortableRow>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
      </div>

      {open && (
        <FormPanel title={editing ? 'Modifier le membre' : 'Nouveau membre'} onClose={closeForm} onSave={() => save.mutate()} isSaving={save.isPending} canSave={!!form.full_name && !!form.role}>
          <Field label="Photo">
            <MediaDropzone currentUrl={form.avatar ?? form.photo_url ?? ''} onFileChange={f => { setImgFile(f); if (f) set('photo_url', ''); }} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom complet *"><Input value={form.full_name ?? ''} onChange={e => set('full_name', e.target.value)} /></Field>
            <Field label="Fonction *"><Input value={form.role ?? ''} onChange={e => set('role', e.target.value)} /></Field>
          </div>
          <Field label="Biographie">
            <WysiwygEditor key={editing?.id ?? 'new-team'} value={form.bio ?? ''} onChange={v => set('bio', v)} placeholder="Biographie…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email"><Input type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} /></Field>
            <Field label="LinkedIn"><Input value={form.linkedin_url ?? ''} onChange={e => set('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/…" /></Field>
          </div>
          <Field label="Ordre"><Input type="number" min={1} value={form.order ?? 1} onChange={e => set('order', parseInt(e.target.value) || 1)} className="w-24" /></Field>
        </FormPanel>
      )}
    </div>
  );
}

// ── CONTACT MESSAGES ─────────────────────────────────────────────────
function ContactTab({ onFormChange }: { onFormChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<CmsContact | null>(null);

  const { data: messages = [], isLoading } = useQuery({ queryKey: ['cms-contact'], queryFn: cmsContact.list });
  const inv = () => qc.invalidateQueries({ queryKey: ['cms-contact'] });

  function selectMsg(m: CmsContact | null) {
    setSelected(m);
    onFormChange(!!m);
  }

  const markRead = useMutation({
    mutationFn: (id: string) => cmsContact.updateStatus(id, 'resolved'),
    onSuccess: () => { inv(); toast({ title: 'Marqué comme traité' }); },
  });
  const del = useMutation({
    mutationFn: (id: string) => cmsContact.remove(id),
    onSuccess: () => { inv(); selectMsg(null); toast({ title: 'Message supprimé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const unread = messages.filter(m => m.status === 'new').length;
  const open = !!selected;

  return (
    <div className={open ? GRID_OPEN : GRID_CLOSED}>
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs text-muted-foreground">{messages.length} message{messages.length !== 1 ? 's' : ''}</p>
          {unread > 0 && <Badge variant="default" className="text-xs">{unread} nouveau{unread > 1 ? 'x' : ''}</Badge>}
        </div>
        {isLoading ? <div className="flex justify-center py-6"><Loader2 className="animate-spin w-4 h-4 text-muted-foreground" /></div>
          : messages.length === 0 ? <p className="text-center py-8 text-xs text-muted-foreground">Aucun message reçu.</p>
          : open ? (
            <div className="space-y-1">
              {messages.map(m => (
                <div key={m.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer transition-colors ${selected?.id === m.id ? 'border-primary/40 bg-primary/5' : m.status === 'new' ? 'bg-primary/5 border-primary/20 hover:bg-primary/10' : 'border-transparent hover:bg-accent/30'}`}
                  onClick={() => selectMsg(m)}>
                  <div className="shrink-0">{m.status === 'new' ? <Clock className="w-3 h-3 text-primary" /> : <CheckCircle className="w-3 h-3 text-muted-foreground" />}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{m.full_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{m.subject}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map(m => (
                <div key={m.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent/30 ${m.status === 'new' ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}
                  onClick={() => selectMsg(m)}>
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
              ))}
            </div>
          )}
      </div>

      {selected && (
        <div className="rounded-xl border bg-card shadow-sm flex flex-col h-fit sticky top-4 max-h-[calc(100vh-120px)]">
          <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Mail className="w-4 h-4 shrink-0" />
              <h3 className="font-semibold text-sm truncate">{selected.full_name}</h3>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => selectMsg(null)}><X className="w-4 h-4" /></Button>
          </div>
          <div className="px-5 py-4 space-y-3 text-sm overflow-y-auto flex-1 min-h-0">
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div><span className="font-semibold text-foreground">Email : </span>{selected.email}</div>
              {selected.phone && <div><span className="font-semibold text-foreground">Tél : </span>{selected.phone}</div>}
              {selected.company && <div><span className="font-semibold text-foreground">Société : </span>{selected.company}</div>}
              <div><span className="font-semibold text-foreground">Date : </span>{new Date(selected.created_at).toLocaleString('fr-FR')}</div>
            </div>
            <Separator />
            <p className="font-semibold">{selected.subject}</p>
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-xs">{selected.message}</p>
          </div>
          <div className="flex flex-wrap gap-2 px-5 py-3 border-t shrink-0">
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => { if (confirm('Supprimer ?')) del.mutate(selected.id); }}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />Supprimer
            </Button>
            {selected.status === 'new' && (
              <Button size="sm" variant="outline" onClick={() => { markRead.mutate(selected.id); setSelected(s => s ? { ...s, status: 'resolved' } : null); }}>
                <CheckCircle className="w-3.5 h-3.5 mr-1" />Traité
              </Button>
            )}
            <a href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Mail className="w-3.5 h-3.5" />Répondre
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PARTENAIRES ───────────────────────────────────────────────────────
const PARTNER_BLANK: Partial<CmsPartner> = { name: '', logo_url: '', website_url: '', order: 1, is_active: true };

function PartnersTab({ onFormChange }: { onFormChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CmsPartner | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<Partial<CmsPartner>>(PARTNER_BLANK);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [items, setItems] = useState<CmsPartner[]>([]);

  const set = (k: keyof CmsPartner, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const inv = () => qc.invalidateQueries({ queryKey: ['cms-partners'] });

  const { data: partners = [], isLoading } = useQuery({ queryKey: ['cms-partners'], queryFn: cmsPartners.list });
  useEffect(() => { setItems([...partners].sort((a, b) => a.order - b.order)); }, [partners]);

  const open = isNew || editing !== null;
  const sensors = useSensors(useSensor(PointerSensor));

  const save = useMutation({
    mutationFn: () => editing ? cmsPartners.update(editing.id, form, pendingFile ?? undefined) : cmsPartners.create(form, pendingFile ?? undefined),
    onSuccess: () => { inv(); closeForm(); toast({ title: editing ? 'Partenaire modifié' : 'Partenaire ajouté' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
  const del = useMutation({
    mutationFn: (id: string) => cmsPartners.remove(id),
    onSuccess: () => { inv(); toast({ title: 'Partenaire supprimé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  function openNew() { setEditing(null); setIsNew(true); setForm(PARTNER_BLANK); setPendingFile(null); onFormChange(true); }
  function openEdit(p: CmsPartner) { setEditing(p); setIsNew(false); setForm(p); setPendingFile(null); onFormChange(true); }
  function closeForm() { setEditing(null); setIsNew(false); onFormChange(false); }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const reordered = arrayMove(items, items.findIndex(i => i.id === active.id), items.findIndex(i => i.id === over.id)).map((item, idx) => ({ ...item, order: idx + 1 }));
    setItems(reordered);
    cmsPartners.reorder(reordered.map(i => i.id));
  }

  return (
    <div className={open ? GRID_OPEN : GRID_CLOSED}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-1 mb-1">
          <p className="text-xs text-muted-foreground">{items.length} partenaire{items.length !== 1 ? 's' : ''}</p>
          <Button size="sm" className="h-7 text-xs px-2" onClick={openNew}><Plus className="w-3 h-3 mr-1" />Ajouter</Button>
        </div>
        {isLoading ? <div className="flex justify-center py-6"><Loader2 className="animate-spin w-4 h-4 text-muted-foreground" /></div>
          : items.length === 0 ? <p className="text-center py-8 text-xs text-muted-foreground">Aucun partenaire.</p>
          : open ? (
            <div className="space-y-1">
              {items.map(p => <CompactRow key={p.id} label={p.name} thumb={p.logo_src || p.logo_url || undefined} isActive={editing?.id === p.id} onEdit={() => openEdit(p)} onDelete={() => del.mutate(p.id)} />)}
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {items.map(p => (
                    <SortableRow key={p.id} id={p.id}>
                      {(dragHandle) => (
                        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                          {dragHandle}
                          {p.logo_src ? <img src={p.logo_src} alt={p.name} className="h-9 w-16 object-contain rounded shrink-0" /> : <div className="h-9 w-16 rounded bg-muted flex items-center justify-center shrink-0 text-xs font-medium truncate px-1">{p.name}</div>}
                          <p className="text-sm font-medium flex-1 min-w-0 truncate">{p.name}</p>
                          {!p.is_active && <Badge variant="outline" className="text-xs">Caché</Badge>}
                          <div className="flex gap-1 shrink-0">
                            <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive" onClick={() => { if (confirm('Supprimer ?')) del.mutate(p.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                      )}
                    </SortableRow>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
      </div>

      {open && (
        <FormPanel title={editing ? 'Modifier le partenaire' : 'Ajouter un partenaire'} onClose={closeForm} onSave={() => save.mutate()} isSaving={save.isPending} canSave={!!form.name}>
          <Field label="Nom *"><Input value={form.name ?? ''} onChange={e => set('name', e.target.value)} placeholder="Nom du partenaire" /></Field>
          <Field label="Logo"><MediaDropzone currentUrl={form.logo_src ?? form.logo_url ?? ''} onFileChange={f => { setPendingFile(f); if (f) set('logo_url', ''); }} /></Field>
          <Field label="Site web"><Input value={form.website_url ?? ''} onChange={e => set('website_url', e.target.value)} placeholder="https://…" /></Field>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active ?? true} onCheckedChange={v => set('is_active', v)} id="partner-active" />
            <Label htmlFor="partner-active" className="text-sm">Visible sur le site</Label>
          </div>
        </FormPanel>
      )}
    </div>
  );
}

// ── DOCUMENTS ────────────────────────────────────────────────────────
const DOC_BLANK: Partial<CmsPublicDocument> = { title: '', description: '', category: 'autre', file_url: '', order: 1, is_active: true };
const DOC_CATEGORIES = [
  { value: 'institutionnel', label: 'Institutionnel & Juridique' },
  { value: 'convention', label: 'Conventions Collectives' },
  { value: 'evaluation', label: 'Evaluation des Entreprises' },
  { value: 'adherent', label: 'Documents Adherents' },
  { value: 'financier', label: 'Transparence Financière' },
  { value: 'autre', label: 'Autres Documents' },
];

function DocumentsTab({ onFormChange }: { onFormChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CmsPublicDocument | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<Partial<CmsPublicDocument>>(DOC_BLANK);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const set = (k: keyof CmsPublicDocument, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const inv = () => qc.invalidateQueries({ queryKey: ['cms-documents'] });
  const { data: items = [], isLoading } = useQuery({ queryKey: ['cms-documents'], queryFn: cmsPublicDocuments.list });
  const open = isNew || editing !== null;

  const save = useMutation({
    mutationFn: () => editing ? cmsPublicDocuments.update(editing.id, form, pendingFile ?? undefined) : cmsPublicDocuments.create(form, pendingFile ?? undefined),
    onSuccess: () => { inv(); closeForm(); toast({ title: editing ? 'Document modifié' : 'Document ajouté' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
  const del = useMutation({
    mutationFn: (id: string) => cmsPublicDocuments.remove(id),
    onSuccess: () => { inv(); toast({ title: 'Document supprimé' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  function openNew() { setEditing(null); setIsNew(true); setForm(DOC_BLANK); setPendingFile(null); onFormChange(true); }
  function openEdit(d: CmsPublicDocument) { setEditing(d); setIsNew(false); setForm(d); setPendingFile(null); onFormChange(true); }
  function closeForm() { setEditing(null); setIsNew(false); onFormChange(false); }
  const catLabel = (key: string) => DOC_CATEGORIES.find(c => c.value === key)?.label ?? key;

  return (
    <div className={open ? GRID_OPEN : GRID_CLOSED}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-1 mb-1">
          <p className="text-xs text-muted-foreground">{items.length} document{items.length !== 1 ? 's' : ''}</p>
          <Button size="sm" className="h-7 text-xs px-2" onClick={openNew}><Plus className="w-3 h-3 mr-1" />Ajouter</Button>
        </div>
        {isLoading ? <div className="flex justify-center py-6"><Loader2 className="animate-spin w-4 h-4 text-muted-foreground" /></div>
          : items.length === 0 ? <p className="text-center py-8 text-xs text-muted-foreground">Aucun document.</p>
          : open ? (
            <div className="space-y-1">
              {items.map(d => <CompactRow key={d.id} label={d.title} sub={catLabel(d.category)} isActive={editing?.id === d.id} onEdit={() => openEdit(d)} onDelete={() => del.mutate(d.id)} />)}
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(d => (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground">{catLabel(d.category)}</p>
                  </div>
                  {d.download_url && <a href={d.download_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline shrink-0">PDF</a>}
                  <Button size="icon" variant="ghost" className="w-7 h-7 shrink-0" onClick={() => openEdit(d)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="w-7 h-7 shrink-0 text-destructive" onClick={() => { if (confirm('Supprimer ?')) del.mutate(d.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              ))}
            </div>
          )}
      </div>

      {open && (
        <FormPanel title={editing ? 'Modifier le document' : 'Ajouter un document'} onClose={closeForm} onSave={() => save.mutate()} isSaving={save.isPending} canSave={!!form.title}>
          <Field label="Titre *"><Input value={form.title ?? ''} onChange={e => set('title', e.target.value)} placeholder="Titre du document" /></Field>
          <Field label="Catégorie">
            <Select value={form.category ?? 'autre'} onValueChange={v => set('category', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DOC_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Fichier PDF">
            <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" className="text-sm w-full" onChange={e => { const f = e.target.files?.[0]; if (f) setPendingFile(f); }} />
            {(form.file_url || form.download_url) && !pendingFile && (
              <a href={form.download_url ?? form.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Voir le fichier actuel</a>
            )}
          </Field>
          <Field label="Ou URL directe"><Input value={form.file_url ?? ''} onChange={e => set('file_url', e.target.value)} placeholder="https://…" /></Field>
          <Field label="Description">
            <WysiwygEditor key={editing?.id ?? 'new-doc'} value={form.description ?? ''} onChange={v => set('description', v)} placeholder="Description…" minHeight="80px" />
          </Field>
          <Field label="Ordre"><Input type="number" min={1} value={form.order ?? 1} onChange={e => set('order', parseInt(e.target.value) || 1)} className="w-24" /></Field>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active ?? true} onCheckedChange={v => set('is_active', v)} id="doc-active" />
            <Label htmlFor="doc-active" className="text-sm">Visible sur le site</Label>
          </div>
        </FormPanel>
      )}
    </div>
  );
}

// ── GALERIE ───────────────────────────────────────────────────────────
const GALLERY_BLANK: Partial<CmsGalleryImage> = { title: '', description: '', image_url: '', category: '', order: 1, is_active: true, media: [] };

function GalleryTab({ onFormChange }: { onFormChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CmsGalleryImage | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<Partial<CmsGalleryImage>>(GALLERY_BLANK);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof CmsGalleryImage, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const inv = () => qc.invalidateQueries({ queryKey: ['cms-gallery'] });
  const { data: items = [], isLoading } = useQuery({ queryKey: ['cms-gallery'], queryFn: cmsGallery.list });
  const open = isNew || editing !== null;

  const save = useMutation({
    mutationFn: async () => {
      const saved = editing
        ? await cmsGallery.update(editing.id, form, pendingFile ?? undefined)
        : await cmsGallery.create(form, pendingFile ?? undefined);
      if (extraFiles.length > 0) {
        setUploadingExtra(true);
        await cmsGallery.addMedia(saved.id, extraFiles);
        setUploadingExtra(false);
      }
      return saved;
    },
    onSuccess: () => { inv(); closeForm(); toast({ title: editing ? 'Entrée modifiée' : 'Entrée ajoutée' }); },
    onError: (e: Error) => { setUploadingExtra(false); toast({ title: 'Erreur', description: e.message, variant: 'destructive' }); },
  });
  const del = useMutation({
    mutationFn: (id: string) => cmsGallery.remove(id),
    onSuccess: () => { inv(); toast({ title: 'Entrée supprimée' }); },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
  const delMedia = useMutation({
    mutationFn: ({ entryId, mediaId }: { entryId: string; mediaId: string }) =>
      cmsGallery.removeMedia(entryId, mediaId),
    onSuccess: () => {
      inv();
      // Refresh local form.media optimistically
      setForm(f => ({ ...f, media: (f.media ?? []).filter(m => m.id !== delMedia.variables?.mediaId) }));
      toast({ title: 'Média supprimé' });
    },
    onError: (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  function openNew() { setEditing(null); setIsNew(true); setForm({ ...GALLERY_BLANK, order: items.length + 1 }); setPendingFile(null); setExtraFiles([]); onFormChange(true); }
  function openEdit(p: CmsGalleryImage) { setEditing(p); setIsNew(false); setForm(p); setPendingFile(null); setExtraFiles([]); onFormChange(true); }
  function closeForm() { setEditing(null); setIsNew(false); setExtraFiles([]); onFormChange(false); }

  function handleExtraFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setExtraFiles(prev => [...prev, ...files]);
    e.target.value = '';
  }

  const existingMedia: CmsGalleryMedia[] = form.media ?? [];
  const totalMedia = existingMedia.length + extraFiles.length;

  return (
    <div className={open ? GRID_OPEN : GRID_CLOSED}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-1 mb-1">
          <p className="text-xs text-muted-foreground">{items.length} entrée{items.length !== 1 ? 's' : ''}</p>
          <Button size="sm" className="h-7 text-xs px-2" onClick={openNew}><Plus className="w-3 h-3 mr-1" />Ajouter</Button>
        </div>
        {isLoading ? <div className="flex justify-center py-6"><Loader2 className="animate-spin w-4 h-4 text-muted-foreground" /></div>
          : items.length === 0 ? <p className="text-center py-8 text-xs text-muted-foreground">Aucune entrée.</p>
          : open ? (
            <div className="space-y-1">
              {items.map(p => (
                <CompactRow
                  key={p.id}
                  label={p.title}
                  sub={`${p.category || ''}${p.media?.length ? ` · ${p.media.length + 1} fichier(s)` : ''}`}
                  thumb={p.src || undefined}
                  isActive={editing?.id === p.id}
                  onEdit={() => openEdit(p)}
                  onDelete={() => del.mutate(p.id)}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {items.map(p => (
                <div key={p.id} className="group relative aspect-square rounded-xl overflow-hidden border bg-muted">
                  {p.src ? <img src={p.src} alt={p.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Image className="w-8 h-8 text-muted-foreground" /></div>}
                  {(p.media?.length ?? 0) > 0 && (
                    <div className="absolute top-1 right-1 bg-black/70 text-white text-xs rounded-full px-1.5 py-0.5">+{p.media!.length}</div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <p className="text-white text-xs font-medium text-center px-2 truncate w-full">{p.title}</p>
                    <div className="flex gap-1">
                      <Button size="icon" variant="secondary" className="w-7 h-7" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="destructive" className="w-7 h-7" onClick={() => { if (confirm('Supprimer l\'entrée et tous ses médias ?')) del.mutate(p.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      {open && (
        <FormPanel
          title={editing ? 'Modifier l\'entrée galerie' : 'Nouvelle entrée galerie'}
          onClose={closeForm}
          onSave={() => save.mutate()}
          isSaving={save.isPending || uploadingExtra}
          canSave={!!form.title}
        >
          <Field label="Titre *"><Input value={form.title ?? ''} onChange={e => set('title', e.target.value)} placeholder="Assemblée Générale 2024" /></Field>
          <Field label="Image principale">
            <MediaDropzone currentUrl={form.src ?? form.image_url ?? ''} onFileChange={f => { setPendingFile(f); if (f) set('image_url', ''); }} acceptVideo />
          </Field>

          {/* Multi-media section */}
          <Field label={`Médias supplémentaires${totalMedia > 0 ? ` (${totalMedia})` : ''}`}>
            {/* Existing saved media */}
            {existingMedia.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {existingMedia.map(m => (
                  <div key={m.id} className="relative aspect-square rounded-lg overflow-hidden border bg-muted group">
                    {m.src && <img src={m.src} alt="" className="w-full h-full object-cover" />}
                    <button
                      type="button"
                      className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => editing && delMedia.mutate({ entryId: editing.id, mediaId: m.id })}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Pending new files */}
            {extraFiles.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {extraFiles.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border bg-muted group">
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setExtraFiles(prev => prev.filter((_, j) => j !== i))}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={() => mediaInputRef.current?.click()}>
              <Plus className="w-3 h-3 mr-1" />Ajouter des fichiers
            </Button>
            <input ref={mediaInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleExtraFiles} />
          </Field>

          <Field label="Catégorie"><Input value={form.category ?? ''} onChange={e => set('category', e.target.value)} placeholder="Événements, Réunions…" /></Field>
          <Field label="Description">
            <WysiwygEditor key={editing?.id ?? 'new-gal'} value={form.description ?? ''} onChange={v => set('description', v)} placeholder="Description…" minHeight="80px" />
          </Field>
          <Field label="Ordre"><Input type="number" min={1} value={form.order ?? 1} onChange={e => set('order', parseInt(e.target.value) || 1)} className="w-24" /></Field>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active ?? true} onCheckedChange={v => set('is_active', v)} id="gal-active" />
            <Label htmlFor="gal-active" className="text-sm">Visible sur le site</Label>
          </div>
        </FormPanel>
      )}
    </div>
  );
}

// ── PAGE PRINCIPALE ───────────────────────────────────────────────────
export default function Cms() {
  const { setSidebarCollapsed } = useLayoutContext();

  const handleFormChange = useCallback((open: boolean) => {
    setSidebarCollapsed(open);
  }, [setSidebarCollapsed]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" />Gestion du site web
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Gérez le contenu visible sur le site public du S.N.E.C.E.A.S</p>
        </div>
        <a href="https://snecea.com" target="_blank" rel="noopener noreferrer"
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
        <TabsContent value="slides"><SlidesTab onFormChange={handleFormChange} /></TabsContent>
        <TabsContent value="services"><ServicesTab onFormChange={handleFormChange} /></TabsContent>
        <TabsContent value="articles"><ArticlesTab onFormChange={handleFormChange} /></TabsContent>
        <TabsContent value="events"><EventsTab onFormChange={handleFormChange} /></TabsContent>
        <TabsContent value="team"><TeamTab onFormChange={handleFormChange} /></TabsContent>
        <TabsContent value="contact"><ContactTab onFormChange={handleFormChange} /></TabsContent>
        <TabsContent value="partners"><PartnersTab onFormChange={handleFormChange} /></TabsContent>
        <TabsContent value="documents"><DocumentsTab onFormChange={handleFormChange} /></TabsContent>
        <TabsContent value="gallery"><GalleryTab onFormChange={handleFormChange} /></TabsContent>
      </Tabs>
    </div>
  );
}
