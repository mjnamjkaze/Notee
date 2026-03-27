import { useEffect, useState } from 'react';
import Note from './components/Note';
import TrashWindow from './components/TrashWindow';

function App() {
  const [route, setRoute] = useState<string>('note');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteData, setNoteData] = useState<any>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#trash') {
      setRoute('trash');
      const root = document.getElementById('root');
      if (root) root.style.background = '#fff'; // Default background for trash window
      return;
    }

    const match = hash.match(/^#note\/(.+)$/);
    if (match) {
      setRoute('note');
      const id = match[1];
      setNoteId(id);
      
      if (window.ipcRenderer) {
        window.ipcRenderer.invoke('get-note', id).then((data: any) => {
          setNoteData(data);
        });
      }
    }
  }, []);

  if (route === 'trash') {
    return <TrashWindow />;
  }

  if (route === 'note') {
    if (!noteId || !noteData) return null;
    return <Note note={noteData} />;
  }

  return null;
}

export default App;
