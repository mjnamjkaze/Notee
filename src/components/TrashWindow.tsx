import { useEffect, useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';

export default function TrashWindow() {
  const [deletedNotes, setDeletedNotes] = useState<any[]>([]);

  const loadDeletedNotes = async () => {
    if (window.ipcRenderer) {
      const notes = await window.ipcRenderer.invoke('get-deleted-notes');
      setDeletedNotes(notes || []);
    }
  };

  useEffect(() => {
    loadDeletedNotes();
    if (window.ipcRenderer) {
      window.ipcRenderer.on('trash-updated', loadDeletedNotes);
    }
  }, []);

  const restoreNote = async (id: string) => {
    if (window.ipcRenderer) {
      await window.ipcRenderer.invoke('restore-note', id);
    }
  };

  const hardDeleteNote = async (id: string) => {
    if (window.confirm('Delete this note permanently?')) {
      if (window.ipcRenderer) {
        await window.ipcRenderer.invoke('hard-delete-note', id);
      }
    }
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
      <h2>Trash Bin</h2>
      {deletedNotes.length === 0 ? (
        <p>No deleted notes.</p>
      ) : (
        <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {deletedNotes.map(note => (
            <div key={note.id} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '12px', background: note.color || '#fdfd96', display: 'flex', flexDirection: 'column' }}>
              <div 
                style={{ height: '60px', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '10px', background: 'rgba(255,255,255,0.5)', padding: '5px', borderRadius: '4px' }}
                dangerouslySetInnerHTML={{ __html: note.text }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: 'auto' }}>
                <button 
                  onClick={() => restoreNote(note.id)} 
                  title="Restore"
                  style={{ cursor: 'pointer', padding: '4px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
                >
                  <RotateCcw size={14} /> Restore
                </button>
                <button 
                  onClick={() => hardDeleteNote(note.id)} 
                  title="Delete Permanently"
                  style={{ cursor: 'pointer', padding: '4px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
