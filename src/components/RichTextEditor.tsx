import { useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  ImagePlus,
  Upload,
  Undo,
  Redo,
  Type,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useMemo } from 'react';

const defaultPlaceholder = 'Saisissez le contenu… Paragraphes, listes, liens, images.';

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  /** Upload une image depuis l'ordinateur : retourne l'URL à insérer. Si non fourni, seul le champ URL est proposé. */
  onUploadImage?: (file: File) => Promise<string>;
};

function Toolbar({
  editor,
  onUploadImage,
}: {
  editor: Editor | null;
  onUploadImage?: (file: File) => Promise<string>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL du lien:', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImageByUrl = useCallback(() => {
    if (!editor) return;
    const url = window.prompt(
      "URL de l'image (ou collez une image depuis le presse-papier)",
      'https://'
    );
    if (url === null) return;
    if (url.startsWith('data:')) {
      editor.chain().focus().setImage({ src: url }).run();
      return;
    }
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const addImageFromFile = useCallback(() => {
    if (!editor || !onUploadImage) return;
    fileInputRef.current?.click();
  }, [editor, onUploadImage]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !editor || !onUploadImage) return;
      if (!file.type.startsWith('image/')) return;
      onUploadImage(file).then((url) => {
        editor.chain().focus().setImage({ src: url }).run();
      });
    },
    [editor, onUploadImage]
  );

  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-2 py-1 rounded-t-md">
      {/* Styles de paragraphe */}
      <Select
        value={
          editor.isActive('heading', { level: 2 })
            ? 'h2'
            : editor.isActive('heading', { level: 3 })
              ? 'h3'
              : 'p'
        }
        onValueChange={(v) => {
          if (v === 'p') editor.chain().focus().setParagraph().run();
          else if (v === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
          else if (v === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
        }}
      >
        <SelectTrigger className="h-8 w-[120px] border-0 bg-transparent shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="p" className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            Paragraphe
          </SelectItem>
          <SelectItem value="h2">
            <span className="font-semibold">Titre 2</span>
          </SelectItem>
          <SelectItem value="h3">
            <span className="font-medium text-sm">Titre 3</span>
          </SelectItem>
        </SelectContent>
      </Select>
      <span className="w-px h-5 bg-border mx-0.5" />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        title="Gras"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        title="Italique"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", editor.isActive('underline') && "bg-muted")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        disabled={!editor.can().chain().focus().toggleUnderline().run()}
        title="Souligner"
      >
        <UnderlineIcon className="h-4 w-4" />
      </Button>
      <span className="w-px h-5 bg-border mx-0.5" />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Liste à puces"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Liste numérotée"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <span className="w-px h-5 bg-border mx-0.5" />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={setLink}
        title="Insérer un lien"
      >
        <LinkIcon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={addImageByUrl}
        title="Insérer une image (URL)"
      >
        <ImagePlus className="h-4 w-4" />
      </Button>
      {onUploadImage && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={addImageFromFile}
            title="Image depuis l'ordinateur"
          >
            <Upload className="h-4 w-4" />
          </Button>
        </>
      )}
      <span className="w-px h-5 bg-border mx-0.5" />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        title="Annuler"
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        title="Rétablir"
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = defaultPlaceholder,
  className,
  minHeight = '200px',
  onUploadImage,
}: RichTextEditorProps) {
  const extensions = useMemo(
    () => [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: 'rounded-lg max-w-full h-auto' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    [placeholder]
  );

  const editor = useEditor({
    extensions,
    content: value || '',
    editorProps: {
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.indexOf('image') !== -1) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) return false;
            const reader = new FileReader();
            reader.onload = () => {
              const src = reader.result as string;
              view.dispatch(view.state.tr.insertText(''));
              const node = view.state.schema.nodes.image.create({ src });
              const transaction = view.state.tr.replaceSelectionWith(node);
              view.dispatch(transaction);
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  return (
    <div
      className={cn(
        'rounded-md border bg-background overflow-hidden prose prose-sm max-w-none dark:prose-invert',
        className
      )}
    >
      <Toolbar editor={editor} onUploadImage={onUploadImage} />
      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className="px-3 py-2 [&_.ProseMirror]:min-h-[inherit] [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:my-1 [&_.ProseMirror_ul]:my-2 [&_.ProseMirror_ol]:my-2 [&_.ProseMirror_h2]:mt-4 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_h3]:mb-1"
      />
    </div>
  );
}
