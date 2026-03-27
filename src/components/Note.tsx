import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, Image as ImageIcon, Plus, X, Palette } from 'lucide-react';
import { useCallback, useRef, useEffect } from 'react';

function useDebounce(callback: Function, delay: number) {
  const timeoutRef = useRef<number | null>(null);
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
}

export default function Note({ note }: { note: any }) {
  const saveNote = useDebounce((updatedNote: any) => {
    if (window.ipcRenderer) {
      window.ipcRenderer.invoke('update-note', updatedNote);
    }
  }, 500);

  useEffect(() => {
    if (note.color) {
      const root = document.getElementById('root');
      if (root) root.style.background = note.color;
    }
  }, [note.color]);

  const handleColorChange = (color: string) => {
    const root = document.getElementById('root');
    if (root) root.style.background = color;
    saveNote({ ...note, color }); // this debounces automatically
  };

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
      saveNote({ ...note, text: editor.getHTML() });
    }
  });

  if (!editor) {
    return null;
  }

  return (
    <>
      <div className="drag-region">
        <div className="no-drag-region" style={{ position: 'absolute', top: 4, right: 8, zIndex: 999, display: 'flex', gap: '4px' }}>
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
      
      <EditorContent editor={editor} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }} />
      
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
          onClick={async () => {
            if (window.ipcRenderer) {
              const base64 = await window.ipcRenderer.invoke('select-image');
              if (base64) editor.chain().focus().setImage({ src: base64 }).run();
            } else {
              const url = window.prompt('Image URL:');
              if (url) editor.chain().focus().setImage({ src: url }).run();
            }
          }}
          title="Upload Image"
        >
          <ImageIcon />
        </button>
        <div className="toolbar-btn" style={{ position: 'relative', overflow: 'hidden' }} title="Change Color">
          <Palette size={16} />
          <input 
            type="color" 
            value={note.color || '#fdfd96'} 
            onChange={(e) => handleColorChange(e.target.value)}
            style={{ position: 'absolute', opacity: 0, top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}
          />
        </div>
      </div>
    </>
  );
}
