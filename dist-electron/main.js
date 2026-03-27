import { BrowserWindow, Menu, Tray, app, ipcMain, nativeImage } from "electron";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import Database from "better-sqlite3";
//#region electron/main.ts
var __dirname = dirname(fileURLToPath(import.meta.url));
var db = null;
var tray = null;
var isDev = process.env.VITE_DEV_SERVER_URL !== void 0;
function initDatabase() {
	db = new Database(join(app.getPath("userData"), "notee.db"));
	db.pragma("journal_mode = WAL");
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
  `);
}
var noteWindows = /* @__PURE__ */ new Map();
function createNoteWindow(note) {
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
			preload: join(__dirname, "preload.js"),
			nodeIntegration: false,
			contextIsolation: true
		}
	});
	const prodUrl = pathToFileURL(join(__dirname, "../dist/index.html")).href + `#note/${note.id}`;
	const url = isDev ? `${process.env.VITE_DEV_SERVER_URL}#note/${note.id}` : prodUrl;
	noteWin.loadURL(url);
	noteWin.webContents.on("console-message", (event, level, message, line, sourceId) => {
		console.log(`[Window Console] Level ${level}: ${message} (Line: ${line})`);
	});
	if (isDev) noteWin.webContents.openDevTools({ mode: "detach" });
	noteWindows.set(note.id, noteWin);
	noteWin.on("closed", () => {
		noteWindows.delete(note.id);
	});
}
function loadAllNotes() {
	if (!db) return;
	const notes = db.prepare("SELECT * FROM notes").all();
	if (notes.length === 0) createDummyNote();
	else notes.forEach((note) => {
		createNoteWindow(note);
	});
}
function createDummyNote() {
	const newNote = {
		id: Date.now().toString(),
		text: "",
		x: 100,
		y: 100,
		width: 300,
		height: 300,
		color: "#fdfd96",
		isAlwaysOnTop: 0
	};
	db.prepare("INSERT INTO notes (id, text, x, y, width, height, color, isAlwaysOnTop) VALUES (@id, @text, @x, @y, @width, @height, @color, @isAlwaysOnTop)").run(newNote);
	createNoteWindow(newNote);
}
function setupTray() {
	tray = new Tray(nativeImage.createFromDataURL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAHhJREFUOE9jZKAQMKIpf+B//P9gA0hyDKgGoAk+HkRofhK+IQaAakCa/x/UgNPEKMMnzA1I8/+DmhFDEyI0g2sgYQ3QGpiGIMQGIBvBBwuh+f+hGkAG/0fTjOAZYh2AzUBC/mNDCDUD0hCEuAGj2YDU/CdG8wAzBQDTj0p0pU5E1gAAAABJRU5ErkJggg=="));
	const contextMenu = Menu.buildFromTemplate([
		{
			label: "New Note",
			click: () => {
				createDummyNote();
			}
		},
		{
			label: "Start with Windows",
			type: "checkbox",
			checked: app.getLoginItemSettings().openAtLogin,
			click: (item) => {
				app.setLoginItemSettings({
					openAtLogin: item.checked,
					path: app.getPath("exe")
				});
			}
		},
		{ type: "separator" },
		{
			label: "Quit",
			click: () => {
				app.quit();
			}
		}
	]);
	tray.setToolTip("Notee");
	tray.setContextMenu(contextMenu);
}
app.whenReady().then(() => {
	initDatabase();
	loadAllNotes();
	setupTray();
});
app.on("window-all-closed", () => {});
ipcMain.handle("get-note", (event, id) => {
	if (!db) return null;
	return db.prepare("SELECT * FROM notes WHERE id = ?").get(id);
});
ipcMain.handle("create-note", () => {
	const newNote = {
		id: Date.now().toString(),
		text: "",
		x: 100,
		y: 100,
		width: 300,
		height: 300,
		color: "#fdfd96",
		isAlwaysOnTop: 0
	};
	db.prepare("INSERT INTO notes (id, text, x, y, width, height, color, isAlwaysOnTop) VALUES (@id, @text, @x, @y, @width, @height, @color, @isAlwaysOnTop)").run(newNote);
	createNoteWindow(newNote);
	return newNote;
});
ipcMain.handle("update-note", (event, note) => {
	if (!db) return;
	db.prepare("UPDATE notes SET text=@text, x=@x, y=@y, width=@width, height=@height, color=@color, isAlwaysOnTop=@isAlwaysOnTop WHERE id=@id").run(note);
});
ipcMain.handle("delete-note", (event, id) => {
	if (!db) return;
	db.prepare("DELETE FROM notes WHERE id=?").run(id);
	const win = noteWindows.get(id);
	if (win) win.close();
});
//#endregion
