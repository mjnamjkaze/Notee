import { app, BrowserWindow, ipcMain, Tray, Menu } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'

let db: Database.Database | null = null
let tray: Tray | null = null

const isDev = process.env.VITE_DEV_SERVER_URL !== undefined

function initDatabase() {
  const dbPath = join(app.getPath('userData'), 'notee.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      text TEXT,
      x INTEGER,
      y INTEGER,
      width INTEGER,
      height INTEGER,
      color TEXT,
      isAlwaysOnTop INTEGER DEFAULT 0
    )
  `)
}

const noteWindows: Map<string, BrowserWindow> = new Map()

function createNoteWindow(note: any) {
  const noteWin = new BrowserWindow({
    width: note.width || 300,
    height: note.height || 300,
    x: note.x,
    y: note.y,
    frame: false,
    transparent: true,
    alwaysOnTop: note.isAlwaysOnTop === 1,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.mjs'), // electron-vite compiles this
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  const url = isDev ? `${process.env.VITE_DEV_SERVER_URL}#note/${note.id}` : `file://${join(__dirname, '../dist/index.html')}#note/${note.id}`
  noteWin.loadURL(url)

  noteWindows.set(note.id, noteWin)

  noteWin.on('closed', () => {
    noteWindows.delete(note.id)
  })
}

function loadAllNotes() {
  if (!db) return
  const notes = db.prepare('SELECT * FROM notes').all()
  if (notes.length === 0) {
    // Create one default note if empty
    createDummyNote()
  } else {
    notes.forEach((note) => {
      createNoteWindow(note)
    })
  }
}

function createDummyNote() {
  const id = Date.now().toString()
  const newNote = {
    id,
    text: '',
    x: 100, y: 100, width: 300, height: 300,
    color: '#fdfd96', // yellow
    isAlwaysOnTop: 0
  }
  db!.prepare('INSERT INTO notes (id, text, x, y, width, height, color, isAlwaysOnTop) VALUES (@id, @text, @x, @y, @width, @height, @color, @isAlwaysOnTop)').run(newNote)
  createNoteWindow(newNote)
}

function setupTray() {
  // We'll add this later when we have an icon
}

app.whenReady().then(() => {
  initDatabase()
  loadAllNotes()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC Handlers
ipcMain.handle('get-note', (event, id) => {
  if (!db) return null
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(id)
})

ipcMain.handle('create-note', () => {
  const id = Date.now().toString()
  const newNote = {
    id,
    text: '',
    x: 100, y: 100, width: 300, height: 300,
    color: '#fdfd96',
    isAlwaysOnTop: 0
  }
  db!.prepare('INSERT INTO notes (id, text, x, y, width, height, color, isAlwaysOnTop) VALUES (@id, @text, @x, @y, @width, @height, @color, @isAlwaysOnTop)').run(newNote)
  createNoteWindow(newNote)
  return newNote
})

ipcMain.handle('update-note', (event, note) => {
  if (!db) return
  db.prepare('UPDATE notes SET text=@text, x=@x, y=@y, width=@width, height=@height, color=@color, isAlwaysOnTop=@isAlwaysOnTop WHERE id=@id').run(note)
})

ipcMain.handle('delete-note', (event, id) => {
  if (!db) return
  db.prepare('DELETE FROM notes WHERE id=?').run(id)
  const win = noteWindows.get(id)
  if (win) win.close()
})
