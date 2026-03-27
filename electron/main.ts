import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog } from 'electron'
import { join, dirname } from 'path'
import { readFileSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import Database from 'better-sqlite3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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
      isAlwaysOnTop INTEGER DEFAULT 0,
      isDeleted INTEGER DEFAULT 0
    )
  `)
  try {
    db.exec(`ALTER TABLE notes ADD COLUMN isDeleted INTEGER DEFAULT 0`)
  } catch (e) {
    // Column already exists
  }
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
      preload: join(__dirname, 'preload.cjs'), // electron-vite compiles this
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  const distPath = join(__dirname, '../dist/index.html')
  const prodUrl = pathToFileURL(distPath).href + `#note/${note.id}`
  const url = isDev ? `${process.env.VITE_DEV_SERVER_URL}#note/${note.id}` : prodUrl
  
  noteWin.loadURL(url)

  noteWin.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Window Console] Level ${level}: ${message} (Line: ${line})`)
  })

  if (isDev) {
    noteWin.webContents.openDevTools({ mode: 'detach' })
  }

  noteWindows.set(note.id, noteWin)

  noteWin.on('closed', () => {
    noteWindows.delete(note.id)
  })
}

function loadAllNotes() {
  if (!db) return
  const notes = db.prepare('SELECT * FROM notes WHERE isDeleted = 0').all()
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
    isAlwaysOnTop: 0,
    isDeleted: 0
  }
  db!.prepare('INSERT INTO notes (id, text, x, y, width, height, color, isAlwaysOnTop, isDeleted) VALUES (@id, @text, @x, @y, @width, @height, @color, @isAlwaysOnTop, @isDeleted)').run(newNote)
  createNoteWindow(newNote)
}

// Trash Window Manager
let trashWin: BrowserWindow | null = null
function openTrashWindow() {
  if (trashWin) {
    trashWin.focus()
    return
  }
  trashWin = new BrowserWindow({
    width: 600, height: 500,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  })
  const distPath = join(__dirname, '../dist/index.html')
  const prodUrl = pathToFileURL(distPath).href + '#trash'
  const url = isDev ? `${process.env.VITE_DEV_SERVER_URL}#trash` : prodUrl
  trashWin.loadURL(url)
  
  if (isDev) {
    trashWin.webContents.openDevTools({ mode: 'detach' })
  }

  trashWin.on('closed', () => {
    trashWin = null
  })
}

function setupTray() {
  const iconBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAHhJREFUOE9jZKAQMKIpf+B//P9gA0hyDKgGoAk+HkRofhK+IQaAakCa/x/UgNPEKMMnzA1I8/+DmhFDEyI0g2sgYQ3QGpiGIMQGIBvBBwuh+f+hGkAG/0fTjOAZYh2AzUBC/mNDCDUD0hCEuAGj2YDU/CdG8wAzBQDTj0p0pU5E1gAAAABJRU5ErkJggg=='
  const icon = nativeImage.createFromDataURL(iconBase64)
  tray = new Tray(icon)
  const contextMenu = Menu.buildFromTemplate([
    { label: 'New Note', click: () => {
      // Use IPC logic to create a note, actually createDummyNote is fine if DB is empty,
      // but let's emulate what IPC create-note does to get staggering.
      const lastWin = Array.from(noteWindows.values()).pop()
      let x = 100, y = 100
      if (lastWin) {
        const [wx, wy] = lastWin.getPosition()
        x = wx + 30
        y = wy + 30
      }
      const id = Date.now().toString()
      const newNote = { id, text: '', x, y, width: 300, height: 300, color: '#fdfd96', isAlwaysOnTop: 0, isDeleted: 0 }
      db!.prepare('INSERT INTO notes (id, text, x, y, width, height, color, isAlwaysOnTop, isDeleted) VALUES (@id, @text, @x, @y, @width, @height, @color, @isAlwaysOnTop, @isDeleted)').run(newNote)
      createNoteWindow(newNote)
    } },
    { label: 'Trash Bin', click: () => {
      openTrashWindow()
    } },
    { label: 'Start with Windows', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin, click: (item) => {
      app.setLoginItemSettings({
        openAtLogin: item.checked,
        path: app.getPath('exe')
      })
    } },
    { type: 'separator' },
    { label: 'Quit', click: () => {
      app.quit()
    } }
  ])
  tray.setToolTip('Notee')
  tray.setContextMenu(contextMenu)
}

app.whenReady().then(() => {
  initDatabase()
  loadAllNotes()
  setupTray()
})

app.on('window-all-closed', () => {
  // Do nothing. Keep the app running in the background for the system tray.
})

// IPC Handlers
ipcMain.handle('get-note', (event, id) => {
  if (!db) return null
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(id)
})

ipcMain.handle('create-note', () => {
  const id = Date.now().toString()
  let x = 100, y = 100
  if (noteWindows.size > 0) {
    let maxX = 0, maxY = 0
    for (const win of noteWindows.values()) {
      const [wx, wy] = win.getPosition()
      if (wx > maxX) maxX = wx
      if (wy > maxY) maxY = wy
    }
    x = maxX + 30
    y = maxY + 30
  }
  
  const newNote = {
    id,
    text: '',
    x, y, width: 300, height: 300,
    color: '#fdfd96',
    isAlwaysOnTop: 0,
    isDeleted: 0
  }
  db!.prepare('INSERT INTO notes (id, text, x, y, width, height, color, isAlwaysOnTop, isDeleted) VALUES (@id, @text, @x, @y, @width, @height, @color, @isAlwaysOnTop, @isDeleted)').run(newNote)
  createNoteWindow(newNote)
  return newNote
})

ipcMain.handle('update-note', (event, note) => {
  if (!db) return
  // Prevent missing column errors during update
  db.prepare('UPDATE notes SET text=@text, x=@x, y=@y, width=@width, height=@height, color=@color, isAlwaysOnTop=@isAlwaysOnTop WHERE id=@id').run(note)
})

ipcMain.handle('delete-note', (event, id) => {
  if (!db) return
  db.prepare('UPDATE notes SET isDeleted=1 WHERE id=?').run(id)
  const win = noteWindows.get(id)
  if (win) win.close()
  
  // Refresh trash window if open
  if (trashWin) trashWin.webContents.send('trash-updated')
})

ipcMain.handle('get-deleted-notes', () => {
  if (!db) return []
  return db.prepare('SELECT * FROM notes WHERE isDeleted=1').all()
})

ipcMain.handle('restore-note', (event, id) => {
  if (!db) return
  db.prepare('UPDATE notes SET isDeleted=0 WHERE id=?').run(id)
  const note = db.prepare('SELECT * FROM notes WHERE id=?').get(id)
  if (note) createNoteWindow(note)
  if (trashWin) trashWin.webContents.send('trash-updated')
})

ipcMain.handle('hard-delete-note', (event, id) => {
  if (!db) return
  db.prepare('DELETE FROM notes WHERE id=?').run(id)
  if (trashWin) trashWin.webContents.send('trash-updated')
})

ipcMain.handle('select-image', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif', 'webp', 'jpeg'] }]
  })
  if (canceled || filePaths.length === 0) return null
  
  const buffer = readFileSync(filePaths[0])
  const ext = filePaths[0].split('.').pop()?.toLowerCase() || 'jpeg'
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg'
  
  return `data:${mimeType};base64,${buffer.toString('base64')}`
})
