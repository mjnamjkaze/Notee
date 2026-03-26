import { useEffect, useState } from 'react';
import Note from './components/Note';

function App() {
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteData, setNoteData] = useState<any>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/^#note\/(.+)$/);
    if (match) {
      const id = match[1];
      setNoteId(id);
      
      if (window.ipcRenderer) {
        window.ipcRenderer.invoke('get-note', id).then((data: any) => {
          setNoteData(data);
        });
      }
    }
  }, []);

  if (!noteId || !noteData) return null;

  return <Note note={noteData} />
}

export default App;
