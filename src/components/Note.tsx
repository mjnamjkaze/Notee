import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, Image as ImageIcon, Plus, X } from 'lucide-react';
import { useCallback, useRef } from 'react';

function useDebounce(callback: Function, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
}

export default function Note({ note }: { note: any }) {
  const saveNote = useDebounce((html: string) => {
    if (window.ipcRenderer) {
      window.ipcRenderer.invoke('update-note', {
        ...note,
        text: html
      });
    }
  }, 500);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image,
    ],
    content: note.text || '',
    editorProps: {
      attributes: {
        'data-placeholder': 'take a note...'
      }
    },
    onUpdate: ({ editor }) => {
      saveNote(editor.getHTML());
    }
  });

  if (!editor) {
    return null;
  }

  return (
    <>
      <div className="drag-region">
        <div style={{ position: 'absolute', top: 4, right: 8, zIndex: 999, WebkitAppRegion: 'no-drag' as any, display: 'flex', gap: '4px' }}>
          <button 
            onClick={() => window.ipcRenderer?.invoke('create-note')} 
            style={{background:'transparent', border:'none', cursor:'pointer', padding: '2px'}}
            title="New Note"
          >
            <Plus size={16} color="#666" />
          </button>
          <button 
            onClick={() => window.ipcRenderer?.invoke('delete-note', note.id)} 
            style={{background:'transparent', border:'none', cursor:'pointer', padding: '2px'}}
            title="Delete Note"
          >
            <X size={16} color="#666" />
          </button>
        </div>
      </div>
      
      <EditorContent editor={editor} />
      
      <div className="toolbar">
        <button 
          className={`toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold />
        </button>
        <button 
          className={`toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </button>
        <button 
          className={`toolbar-btn ${editor.isActive('underline') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon />
        </button>
        <button 
          className={`toolbar-btn ${editor.isActive('strike') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough />
        </button>
        <button 
          className={`toolbar-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List />
        </button>
        <button 
          className="toolbar-btn"
          onClick={() => {
            const url = window.prompt('Image URL:');
            if (url) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }}
        >
          <ImageIcon />
        </button>
      </div>
    </>
  );
}
