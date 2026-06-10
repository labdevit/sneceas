import { useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  Link2, Heading2, Heading3, Undo, Redo, Unlink,
  ImagePlus, Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  editorKey?: string | number;
  onUploadImage?: (file: File) => Promise<string>;
}

function ToolBtn({
  active, onClick, title, children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        'p-1 rounded transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}

export function WysiwygEditor({ value, onChange, placeholder, minHeight = '160px', onUploadImage }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder ?? 'Écrivez ici…' }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } }),
      Image.configure({ inline: false, allowBase64: false, HTMLAttributes: { class: 'max-w-full rounded my-2' } }),
    ],
    content: value || '',
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  function addLink() {
    const url = prompt('URL du lien :');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  }

  function insertImageUrl() {
    const url = prompt('URL de l\'image :');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onUploadImage) return;
    e.target.value = '';
    try {
      const url = await onUploadImage(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err: unknown) {
      alert('Échec upload image : ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  return (
    <div className="rounded-md border overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 px-2 py-1.5 border-b bg-muted/40 text-xs">
        <ToolBtn title="Annuler" onClick={() => editor.chain().focus().undo().run()}>
          <Undo className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Rétablir" onClick={() => editor.chain().focus().redo().run()}>
          <Redo className="w-3.5 h-3.5" />
        </ToolBtn>
        <span className="w-px bg-border mx-1 self-stretch" />

        <ToolBtn active={editor.isActive('heading', { level: 2 })} title="Titre 2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive('heading', { level: 3 })} title="Titre 3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="w-3.5 h-3.5" />
        </ToolBtn>
        <span className="w-px bg-border mx-1 self-stretch" />

        <ToolBtn active={editor.isActive('bold')} title="Gras"
          onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive('italic')} title="Italique"
          onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive('underline')} title="Souligné"
          onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive('strike')} title="Barré"
          onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolBtn>
        <span className="w-px bg-border mx-1 self-stretch" />

        <ToolBtn active={editor.isActive('bulletList')} title="Liste à puces"
          onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive('orderedList')} title="Liste numérotée"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolBtn>
        <span className="w-px bg-border mx-1 self-stretch" />

        <ToolBtn active={editor.isActive({ textAlign: 'left' })} title="Aligner à gauche"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: 'center' })} title="Centrer"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: 'right' })} title="Aligner à droite"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRight className="w-3.5 h-3.5" />
        </ToolBtn>
        <span className="w-px bg-border mx-1 self-stretch" />

        <ToolBtn active={editor.isActive('link')} title="Lien" onClick={addLink}>
          <Link2 className="w-3.5 h-3.5" />
        </ToolBtn>
        {editor.isActive('link') && (
          <ToolBtn title="Supprimer le lien"
            onClick={() => editor.chain().focus().unsetLink().run()}>
            <Unlink className="w-3.5 h-3.5" />
          </ToolBtn>
        )}
        <span className="w-px bg-border mx-1 self-stretch" />

        {/* Image — URL */}
        <ToolBtn title="Insérer une image par URL" onClick={insertImageUrl}>
          <ImagePlus className="w-3.5 h-3.5" />
        </ToolBtn>

        {/* Image — Upload (only shown when onUploadImage is provided) */}
        {onUploadImage && (
          <>
            <ToolBtn title="Téléverser une image depuis l'ordinateur"
              onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-3.5 h-3.5" />
            </ToolBtn>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </>
        )}
      </div>

      {/* Content */}
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none px-3 py-2 focus:outline-none [&_.tiptap]:outline-none [&_.tiptap_img]:max-w-full [&_.tiptap_img]:rounded [&_.tiptap_img]:my-2"
        style={{ minHeight }}
      />
    </div>
  );
}
