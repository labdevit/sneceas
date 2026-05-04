import { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Link from '@tiptap/extension-link';
import {
  Send,
  Loader2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Link as LinkIcon,
  Type,
  Heading1,
  Heading2,
  Palette,
  Mail,
  MessageCircle,
  Users,
  Building2,
  Globe,
  ArrowLeft,
  Eye,
  Save,
  Trash2,
  Paperclip,
  X,
  FileIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPoles, type ApiPole } from '@/lib/api/poles';
import { fetchCompanies, type ApiCompany } from '@/lib/api/companies';
import { fetchBureaux, type ApiBureau } from '@/lib/api/bureau';
import { UserCheck } from 'lucide-react';
import {
  createBroadcast,
  sendBroadcast,
  type CreateBroadcastPayload,
} from '@/lib/api/broadcasts';
import { cn } from '@/lib/utils';

interface BroadcastComposerProps {
  onBack: () => void;
  onSent: () => void;
}

type Channel = 'email' | 'whatsapp';
type Audience = 'all' | 'poles' | 'companies' | 'delegates' | 'bureau';

export function BroadcastComposer({ onBack, onSent }: BroadcastComposerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Form state ──────────────────────────────────────────────
  const [subject, setSubject] = useState('');
  const [channel, setChannel] = useState<Channel>('email');
  const [audience, setAudience] = useState<Audience>('all');
  const [selectedPoles, setSelectedPoles] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedBureaux, setSelectedBureaux] = useState<string[]>([]);
  const [whatsappText, setWhatsappText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  // ── Load poles & companies ──────────────────────────────────
  const { data: poles = [] } = useQuery({
    queryKey: ['poles'],
    queryFn: () => fetchPoles(),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => fetchCompanies(),
  });

  const { data: bureaux = [] } = useQuery({
    queryKey: ['bureaux'],
    queryFn: () => fetchBureaux({ active: 'true' }),
  });

  // ── TipTap editor (for email) ──────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      Placeholder.configure({
        placeholder: 'Rédigez votre message ici...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
  });

  // ── TipTap editor (for WhatsApp) ───────────────────────────
  const waEditor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: 'Rédigez votre message WhatsApp ici...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
    onUpdate: ({ editor: e }) => {
      setWhatsappText(e.getText());
    },
  });

  // ── Helpers ─────────────────────────────────────────────────
  const getAudienceLabel = useCallback(() => {
    if (audience === 'all') return 'Tout le monde';
    if (audience === 'delegates') return 'Délégués syndicaux';
    if (audience === 'poles') {
      const names = poles.filter((p: ApiPole) => selectedPoles.includes(p.id)).map((p: ApiPole) => p.name);
      return names.length ? names.join(', ') : 'Aucun pôle sélectionné';
    }
    if (audience === 'companies') {
      const names = companies.filter((c: ApiCompany) => selectedCompanies.includes(c.id)).map((c: ApiCompany) => c.name);
      return names.length ? names.join(', ') : 'Aucune entreprise sélectionnée';
    }
    if (audience === 'bureau') {
      const names = (bureaux as ApiBureau[]).filter((b) => selectedBureaux.includes(b.id)).map((b) => b.name);
      return names.length ? names.join(', ') : 'Aucun bureau sélectionné';
    }
    return '';
  }, [audience, poles, companies, bureaux, selectedPoles, selectedCompanies, selectedBureaux]);

  const isValid = useCallback(() => {
    if (!subject.trim()) return false;
    if (channel === 'email' && (!editor || editor.isEmpty)) return false;
    if (channel === 'whatsapp' && (!waEditor || waEditor.isEmpty)) return false;
    if (audience === 'poles' && selectedPoles.length === 0) return false;
    if (audience === 'companies' && selectedCompanies.length === 0) return false;
    if (audience === 'bureau' && selectedBureaux.length === 0) return false;
    return true;
  }, [subject, channel, editor, waEditor, audience, selectedPoles, selectedCompanies, selectedBureaux]);

  const handleTogglePole = (poleId: string) => {
    setSelectedPoles((prev) =>
      prev.includes(poleId) ? prev.filter((id) => id !== poleId) : [...prev, poleId]
    );
  };

  const handleToggleCompany = (companyId: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [...prev, companyId]
    );
  };

  const handleAddLink = () => {
    if (!editor) return;
    const url = window.prompt('URL du lien :');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  // ── File handling ────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  // ── Send ────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!isValid()) return;
    setIsSending(true);
    setShowConfirm(false);

    try {
      const payload: CreateBroadcastPayload = {
        subject: subject.trim(),
        channel,
        audience,
        html_content: channel === 'email' ? (editor?.getHTML() || '') : '',
        plain_content: channel === 'whatsapp' ? whatsappText.trim() : '',
        target_poles: audience === 'poles' ? selectedPoles : [],
        target_companies: audience === 'companies' ? selectedCompanies : [],
        target_bureaux: audience === 'bureau' ? selectedBureaux : [],
      };

      const broadcast = await createBroadcast(payload, channel === 'email' ? attachedFiles : []);
      await sendBroadcast(broadcast.id);

      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      toast({ title: 'Diffusion envoyée', description: `Message envoyé via ${channel === 'email' ? 'Email' : 'WhatsApp'}` });
      onSent();
    } catch (error: any) {
      toast({
        title: 'Erreur d\'envoi',
        description: error.message || 'Impossible d\'envoyer la diffusion.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nouveau message de diffusion</h1>
          <p className="text-muted-foreground mt-1">
            Composez et envoyez un message à vos membres
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Editor ───────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Objet du message</Label>
            <Input
              id="subject"
              placeholder="Ex: Convocation assemblée générale..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-lg"
            />
          </div>

          {/* Channel toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={channel === 'email' ? 'default' : 'outline'}
              onClick={() => setChannel('email')}
              className="flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Email
            </Button>
            <Button
              type="button"
              variant={channel === 'whatsapp' ? 'default' : 'outline'}
              onClick={() => setChannel('whatsapp')}
              className="flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
          </div>

          {/* Email WYSIWYG editor */}
          {channel === 'email' && editor && (
            <Card>
              <CardContent className="p-0">
                {/* Toolbar */}
                <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    data-active={editor.isActive('bold')}
                  >
                    <Bold className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    data-active={editor.isActive('italic')}
                  >
                    <Italic className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    data-active={editor.isActive('underline')}
                  >
                    <UnderlineIcon className="w-4 h-4" />
                  </Button>

                  <Separator orientation="vertical" className="h-8 mx-1" />

                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    data-active={editor.isActive('heading', { level: 1 })}
                  >
                    <Heading1 className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    data-active={editor.isActive('heading', { level: 2 })}
                  >
                    <Heading2 className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => editor.chain().focus().setParagraph().run()}
                    data-active={editor.isActive('paragraph')}
                  >
                    <Type className="w-4 h-4" />
                  </Button>

                  <Separator orientation="vertical" className="h-8 mx-1" />

                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    data-active={editor.isActive('bulletList')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    data-active={editor.isActive('orderedList')}
                  >
                    <ListOrdered className="w-4 h-4" />
                  </Button>

                  <Separator orientation="vertical" className="h-8 mx-1" />

                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    data-active={editor.isActive({ textAlign: 'left' })}
                  >
                    <AlignLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    data-active={editor.isActive({ textAlign: 'center' })}
                  >
                    <AlignCenter className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    data-active={editor.isActive({ textAlign: 'right' })}
                  >
                    <AlignRight className="w-4 h-4" />
                  </Button>

                  <Separator orientation="vertical" className="h-8 mx-1" />

                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    onClick={handleAddLink}
                    data-active={editor.isActive('link')}
                  >
                    <LinkIcon className="w-4 h-4" />
                  </Button>

                  {/* Color picker */}
                  <div className="relative">
                    <input
                      type="color"
                      className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer"
                      onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <Palette className="w-4 h-4" />
                    </Button>
                  </div>

                  <Separator orientation="vertical" className="h-8 mx-1" />

                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                  >
                    <Undo className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                  >
                    <Redo className="w-4 h-4" />
                  </Button>
                </div>

                {/* Editor area */}
                <EditorContent editor={editor} />
              </CardContent>
            </Card>
          )}

          {/* Email file attachments */}
          {channel === 'email' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Pièces jointes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Ajouter des fichiers…</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
                {attachedFiles.length > 0 && (
                  <div className="space-y-2">
                    {attachedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                      >
                        <FileIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => handleRemoveFile(index)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      {attachedFiles.length} fichier(s) — {formatFileSize(attachedFiles.reduce((s, f) => s + f.size, 0))} au total
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* WhatsApp WYSIWYG editor */}
          {channel === 'whatsapp' && waEditor && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Message WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Toolbar */}
                <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => waEditor.chain().focus().toggleBold().run()}
                    data-active={waEditor.isActive('bold')}
                  >
                    <Bold className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => waEditor.chain().focus().toggleItalic().run()}
                    data-active={waEditor.isActive('italic')}
                  >
                    <Italic className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => waEditor.chain().focus().toggleUnderline().run()}
                    data-active={waEditor.isActive('underline')}
                  >
                    <UnderlineIcon className="w-4 h-4" />
                  </Button>
                  <Separator orientation="vertical" className="h-8 mx-1" />
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => waEditor.chain().focus().toggleBulletList().run()}
                    data-active={waEditor.isActive('bulletList')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => waEditor.chain().focus().toggleOrderedList().run()}
                    data-active={waEditor.isActive('orderedList')}
                  >
                    <ListOrdered className="w-4 h-4" />
                  </Button>
                  <Separator orientation="vertical" className="h-8 mx-1" />
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => waEditor.chain().focus().undo().run()}
                    disabled={!waEditor.can().undo()}
                  >
                    <Undo className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => waEditor.chain().focus().redo().run()}
                    disabled={!waEditor.can().redo()}
                  >
                    <Redo className="w-4 h-4" />
                  </Button>
                </div>
                {/* Editor area */}
                <EditorContent editor={waEditor} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right: Settings ────────────────────────────────── */}
        <div className="space-y-4">
          {/* Audience */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Destinataires
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Tout le monde
                    </div>
                  </SelectItem>
                  <SelectItem value="poles">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Par pôles
                    </div>
                  </SelectItem>
                  <SelectItem value="companies">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Par entreprises
                    </div>
                  </SelectItem>
                  <SelectItem value="delegates">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      Délégués syndicaux
                    </div>
                  </SelectItem>
                  <SelectItem value="bureau">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Bureau Exécutif
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Pole multi-select */}
              {audience === 'poles' && (
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {poles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun pôle disponible</p>
                  ) : (
                    poles.map((pole: ApiPole) => (
                      <label
                        key={pole.id}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedPoles.includes(pole.id)}
                          onCheckedChange={() => handleTogglePole(pole.id)}
                        />
                        <span className="text-sm">{pole.name}</span>
                      </label>
                    ))
                  )}
                  {selectedPoles.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2 border-t">
                      {poles
                        .filter((p: ApiPole) => selectedPoles.includes(p.id))
                        .map((p: ApiPole) => (
                          <Badge key={p.id} variant="secondary" className="text-xs">
                            {p.name}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Company multi-select */}
              {audience === 'companies' && (
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {companies.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune entreprise disponible</p>
                  ) : (
                    companies.map((company: ApiCompany) => (
                      <label
                        key={company.id}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedCompanies.includes(company.id)}
                          onCheckedChange={() => handleToggleCompany(company.id)}
                        />
                        <span className="text-sm">{company.name}</span>
                      </label>
                    ))
                  )}
                  {selectedCompanies.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2 border-t">
                      {companies
                        .filter((c: ApiCompany) => selectedCompanies.includes(c.id))
                        .map((c: ApiCompany) => (
                          <Badge key={c.id} variant="secondary" className="text-xs">
                            {c.name}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Bureau multi-select */}
              {audience === 'bureau' && (
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {(bureaux as ApiBureau[]).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun bureau disponible</p>
                  ) : (
                    (bureaux as ApiBureau[]).map((b) => (
                      <label
                        key={b.id}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedBureaux.includes(b.id)}
                          onCheckedChange={() =>
                            setSelectedBureaux((prev) =>
                              prev.includes(b.id) ? prev.filter((id) => id !== b.id) : [...prev, b.id]
                            )
                          }
                        />
                        <div>
                          <span className="text-sm">{b.name}</span>
                          {b.sg_name && <span className="text-xs text-muted-foreground ml-1">— SG : {b.sg_name}</span>}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}

              {audience === 'delegates' && (
                <p className="text-sm text-muted-foreground">
                  Le message sera envoyé à tous les délégués syndicaux actifs.
                </p>
              )}

              {audience === 'all' && (
                <p className="text-sm text-muted-foreground">
                  Le message sera envoyé à tous les membres actifs.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Résumé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Canal</span>
                <Badge variant={channel === 'email' ? 'default' : 'secondary'}>
                  {channel === 'email' ? 'Email' : 'WhatsApp'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Audience</span>
                <span className="text-right max-w-[180px] truncate">{getAudienceLabel()}</span>
              </div>
              {subject && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Objet</span>
                  <span className="text-right max-w-[180px] truncate">{subject}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {channel === 'email' && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setShowPreview(true)}
                disabled={!editor || editor.isEmpty}
              >
                <Eye className="w-4 h-4 mr-2" />
                Aperçu
              </Button>
            )}
            <Button
              type="button"
              className="w-full"
              disabled={!isValid() || isSending}
              onClick={() => setShowConfirm(true)}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Envoyer la diffusion
            </Button>
          </div>
        </div>
      </div>

      {/* ── Preview Dialog ───────────────────────────────────── */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aperçu du message</DialogTitle>
            <DialogDescription>Voici comment votre email apparaîtra</DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-6 bg-white">
            <div className="border-b pb-4 mb-4">
              <p className="text-sm text-muted-foreground">Objet :</p>
              <p className="font-semibold text-lg">{subject || '(sans objet)'}</p>
            </div>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: editor?.getHTML() || '' }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Dialog ───────────────────────────────────── */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer l'envoi</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point d'envoyer ce message via{' '}
              <strong>{channel === 'email' ? 'Email' : 'WhatsApp'}</strong> à{' '}
              <strong>{getAudienceLabel()}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm bg-muted/50 rounded-lg p-4">
            <p><strong>Objet :</strong> {subject}</p>
            <p><strong>Canal :</strong> {channel === 'email' ? 'Email' : 'WhatsApp'}</p>
            <p><strong>Destinataires :</strong> {getAudienceLabel()}</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={isSending}>
              Annuler
            </Button>
            <Button onClick={handleSend} disabled={isSending}>
              {isSending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Confirmer l'envoi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
