import { BrowserWindow as e, Menu as t, Tray as n, app as r, ipcMain as i, nativeImage as a } from "electron";
import { dirname as o, join as s } from "path";
import { fileURLToPath as c, pathToFileURL as l } from "url";
import u from "better-sqlite3";
//#region electron/main.ts
var d = o(c(import.meta.url)), f = null, p = null, m = process.env.VITE_DEV_SERVER_URL !== void 0;
function h() {
	f = new u(s(r.getPath("userData"), "notee.db")), f.pragma("journal_mode = WAL"), f.exec("\n    CREATE TABLE IF NOT EXISTS notes (\n      id TEXT PRIMARY KEY,\n      text TEXT,\n      x INTEGER,\n      y INTEGER,\n      width INTEGER,\n      height INTEGER,\n      color TEXT,\n      isAlwaysOnTop INTEGER DEFAULT 0\n    )\n  ");
}
var g = /* @__PURE__ */ new Map();
function _(t) {
	let n = new e({
		width: t.width || 300,
		height: t.height || 300,
		x: t.x,
		y: t.y,
		frame: !1,
		transparent: !0,
		alwaysOnTop: t.isAlwaysOnTop === 1,
		skipTaskbar: !0,
		webPreferences: {
			preload: s(d, "preload.js"),
			nodeIntegration: !1,
			contextIsolation: !0
		}
	}), r = l(s(d, "../dist/index.html")).href + `#note/${t.id}`, i = m ? `${process.env.VITE_DEV_SERVER_URL}#note/${t.id}` : r;
	n.loadURL(i), n.webContents.on("console-message", (e, t, n, r, i) => {
		console.log(`[Window Console] Level ${t}: ${n} (Line: ${r})`);
	}), m && n.webContents.openDevTools({ mode: "detach" }), g.set(t.id, n), n.on("closed", () => {
		g.delete(t.id);
	});
}
function v() {
	if (!f) return;
	let e = f.prepare("SELECT * FROM notes").all();
	e.length === 0 ? y() : e.forEach((e) => {
		_(e);
	});
}
function y() {
	let e = {
		id: Date.now().toString(),
		text: "",
		x: 100,
		y: 100,
		width: 300,
		height: 300,
		color: "#fdfd96",
		isAlwaysOnTop: 0
	};
	f.prepare("INSERT INTO notes (id, text, x, y, width, height, color, isAlwaysOnTop) VALUES (@id, @text, @x, @y, @width, @height, @color, @isAlwaysOnTop)").run(e), _(e);
}
function b() {
	p = new n(a.createFromDataURL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAHhJREFUOE9jZKAQMKIpf+B//P9gA0hyDKgGoAk+HkRofhK+IQaAakCa/x/UgNPEKMMnzA1I8/+DmhFDEyI0g2sgYQ3QGpiGIMQGIBvBBwuh+f+hGkAG/0fTjOAZYh2AzUBC/mNDCDUD0hCEuAGj2YDU/CdG8wAzBQDTj0p0pU5E1gAAAABJRU5ErkJggg=="));
	let e = t.buildFromTemplate([
		{
			label: "New Note",
			click: () => {
				y();
			}
		},
		{
			label: "Start with Windows",
			type: "checkbox",
			checked: r.getLoginItemSettings().openAtLogin,
			click: (e) => {
				r.setLoginItemSettings({
					openAtLogin: e.checked,
					path: r.getPath("exe")
				});
			}
		},
		{ type: "separator" },
		{
			label: "Quit",
			click: () => {
				r.quit();
			}
		}
	]);
	p.setToolTip("Notee"), p.setContextMenu(e);
}
r.whenReady().then(() => {
	h(), v(), b();
}), r.on("window-all-closed", () => {}), i.handle("get-note", (e, t) => f ? f.prepare("SELECT * FROM notes WHERE id = ?").get(t) : null), i.handle("create-note", () => {
	let e = {
		id: Date.now().toString(),
		text: "",
		x: 100,
		y: 100,
		width: 300,
		height: 300,
		color: "#fdfd96",
		isAlwaysOnTop: 0
	};
	return f.prepare("INSERT INTO notes (id, text, x, y, width, height, color, isAlwaysOnTop) VALUES (@id, @text, @x, @y, @width, @height, @color, @isAlwaysOnTop)").run(e), _(e), e;
}), i.handle("update-note", (e, t) => {
	f && f.prepare("UPDATE notes SET text=@text, x=@x, y=@y, width=@width, height=@height, color=@color, isAlwaysOnTop=@isAlwaysOnTop WHERE id=@id").run(t);
}), i.handle("delete-note", (e, t) => {
	if (!f) return;
	f.prepare("DELETE FROM notes WHERE id=?").run(t);
	let n = g.get(t);
	n && n.close();
});
//#endregion
