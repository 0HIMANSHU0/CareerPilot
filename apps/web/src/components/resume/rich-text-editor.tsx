'use client';

import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered, Redo2, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Tiptap editor for the professional summary. StarterKit includes undo/redo history.
export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const lastEmitted = useRef(value);
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: false, codeBlock: false, blockquote: false, horizontalRule: false, code: false, strike: false })],
    content: value,
    immediatelyRender: false,
    editorProps: { attributes: { class: 'prose-sm min-h-[140px] px-3 py-2 focus:outline-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5', 'data-testid': 'summary-editor' } },
    onUpdate: ({ editor }) => {
      lastEmitted.current = editor.getHTML();
      onChange(lastEmitted.current);
    },
  });

  // Only sync truly external changes (AI generation, version restore), never our own echoed edits.
  useEffect(() => {
    if (editor && value !== lastEmitted.current) {
      lastEmitted.current = value;
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  if (!editor) return <div className="h-[180px] rounded-md border" />;
  const tools = [
    { icon: Bold, run: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), id: 'bold' },
    { icon: Italic, run: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), id: 'italic' },
    { icon: List, run: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), id: 'bullets' },
    { icon: ListOrdered, run: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), id: 'numbers' },
    { icon: Undo2, run: () => editor.chain().focus().undo().run(), active: false, id: 'undo', disabled: !editor.can().undo() },
    { icon: Redo2, run: () => editor.chain().focus().redo().run(), active: false, id: 'redo', disabled: !editor.can().redo() },
  ];
  return (
    <div className="rounded-md border bg-background">
      <div className="flex gap-1 border-b p-1">
        {tools.map(({ icon: Icon, run, active, id, disabled }) => (
          <button key={id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={run} disabled={disabled} data-testid={`editor-${id}-button`} aria-label={id}
            className={cn('rounded p-1.5 transition-colors hover:bg-secondary disabled:opacity-30', active && 'bg-accent text-accent-foreground')}>
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
