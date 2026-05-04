import { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import {
  FileText,
  Save,
  Download,
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
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchClosingReportTemplate, downloadClosingReportPdf, updateTicket } from '@/lib/api/tickets';
import { cn } from '@/lib/utils';

interface ClosingReportProps {
  ticketId: string;
  closingReport: string | null;
  closedAt: string | null;
}

export function ClosingReport({ ticketId, closingReport, closedAt }: ClosingReportProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Fetch the template for this ticket (always fetch so the Template button is available)
  const { data: template, isLoading: templateLoading, error: templateError } = useQuery({
    queryKey: ['closing-report-template', ticketId],
    queryFn: () => fetchClosingReportTemplate(ticketId),
    enabled: !!ticketId,
    retry: false,
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: 'Rédigez le compte-rendu de clôture...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: closingReport || template?.content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
  });

  // Update editor content when template loads
  const handleLoadTemplate = useCallback(() => {
    if (!template?.content) {
      toast({ title: 'Aucun template', description: 'Aucun template de compte-rendu n\'est configuré pour ce pôle.', variant: 'destructive' });
      return;
    }
    if (editor) {
      editor.commands.setContent(template.content);
      toast({ title: 'Template chargé', description: template.name ?? 'Template appliqué' });
    }
  }, [template, editor, toast]);

  // Save the closing report
  const handleSave = async () => {
    if (!editor) return;
    const content = editor.getHTML();
    if (!content || content === '<p></p>') {
      toast({ title: 'Erreur', description: 'Le compte-rendu ne peut pas être vide.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      await updateTicket(ticketId, {
        closing_report: content,
      } as any);
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      toast({ title: 'Compte-rendu enregistré' });
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message || 'Impossible de sauvegarder.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Generate and download PDF
  const handleDownloadPdf = async () => {
    if (!editor) return;
    const content = editor.getHTML();
    if (!content || content === '<p></p>') {
      toast({ title: 'Erreur', description: 'Le compte-rendu ne peut pas être vide.', variant: 'destructive' });
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const blob = await downloadClosingReportPdf(ticketId, content);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compte-rendu-${ticketId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'PDF généré', description: 'Le téléchargement a commencé.' });
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message || 'Impossible de générer le PDF.', variant: 'destructive' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (templateLoading) {
    return (
      <div className="bg-card rounded-xl border shadow-card p-6">
        <div className="flex items-center gap-2 justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground text-sm">Chargement du template...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border shadow-card">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Compte-rendu de clôture</h3>
          {closingReport && (
            <Badge variant="outline" className="bg-status-resolved/10 text-status-resolved border-status-resolved/30">
              Enregistré
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!templateError && (
            <Button variant="outline" size="sm" onClick={handleLoadTemplate} title="Charger le template de compte-rendu" disabled={templateLoading}>
              {templateLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
              Template
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Enregistrer
          </Button>
          <Button size="sm" onClick={handleDownloadPdf} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1" />}
            PDF
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      {editor && (
        <div className="p-2 border-b border-border flex flex-wrap items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-8 w-8 p-0', editor.isActive('bold') && 'bg-accent')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-8 w-8 p-0', editor.isActive('italic') && 'bg-accent')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-8 w-8 p-0', editor.isActive('underline') && 'bg-accent')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            className={cn('h-8 w-8 p-0', editor.isActive('bulletList') && 'bg-accent')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-8 w-8 p-0', editor.isActive('orderedList') && 'bg-accent')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            className={cn('h-8 w-8 p-0', editor.isActive({ textAlign: 'left' }) && 'bg-accent')}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >
            <AlignLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-8 w-8 p-0', editor.isActive({ textAlign: 'center' }) && 'bg-accent')}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >
            <AlignCenter className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-8 w-8 p-0', editor.isActive({ textAlign: 'right' }) && 'bg-accent')}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          >
            <AlignRight className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Editor */}
      <div className="min-h-[250px] max-h-[500px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {closedAt && (
        <div className="p-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Clôturé le {new Date(closedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      )}
    </div>
  );
}
