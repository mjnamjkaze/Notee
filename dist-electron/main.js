import { BrowserWindow as e, Menu as t, Tray as n, app as r, ipcMain as i, nativeImage as a } from "electron";
import { dirname as o, join as s } from "path";
import { fileURLToPath as c } from "url";
import l from "better-sqlite3";
//#region electron/main.ts
var u = o(c(import.meta.url)), d = null, f = null, p = process.env.VITE_DEV_SERVER_URL !== void 0;
function m() {
	d = new l(s(r.getPath("userData"), "notee.db")), d.pragma("journal_mode = WAL"), d.exec("\n    CREATE TABLE IF NOT EXISTS notes (\n      id TEXT PRIMARY KEY,\n      text TEXT,\n      x INTEGER,\n      y INTEGER,\n      width INTEGER,\n      height INTEGER,\n      color TEXT,\n      isAlwaysOnTop INTEGER DEFAULT 0\n    )\n  ");
}
var h = /* @__PURE__ */ new Map();
function g(t) {
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
			preload: s(u, "preload.mjs"),
			nodeIntegration: !1,
			contextIsolation: !0
		}
	}), r = p ? `${process.env.VITE_DEV_SERVER_URL}#note/${t.id}` : `file://${s(u, "../dist/index.html")}#note/${t.id}`;
	n.loadURL(r), h.set(t.id, n), n.on("closed", () => {
		h.delete(t.id);
	});
}
function _() {
	if (!d) return;
	let e = d.prepare("SELECT * FROM notes").all();
	e.length === 0 ? v() : e.forEach((e) => {
		g(e);
	});
}
function v() {
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
	d.prepare("INSERT INTO notes (id, text, x, y, width, height, color, isAlwaysOnTop) VALUES (@id, @text, @x, @y, @width, @height, @color, @isAlwaysOnTop)").run(e), g(e);
}
function y() {
	f = new n(a.createEmpty());
	let e = t.buildFromTemplate([
		{
			label: "New Note",
			click: () => {
				v();
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
	f.setToolTip("Notee"), f.setContextMenu(e);
}
r.whenReady().then(() => {
	m(), _(), y();
}), r.on("window-all-closed", () => {}), i.handle("get-note", (e, t) => d ? d.prepare("SELECT * FROM notes WHERE id = ?").get(t) : null), i.handle("create-note", () => {
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
	return d.prepare("INSERT INTO notes (id, text, x, y, width, height, color, isAlwaysOnTop) VALUES (@id, @text, @x, @y, @width, @height, @color, @isAlwaysOnTop)").run(e), g(e), e;
}), i.handle("update-note", (e, t) => {
	d && d.prepare("UPDATE notes SET text=@text, x=@x, y=@y, width=@width, height=@height, color=@color, isAlwaysOnTop=@isAlwaysOnTop WHERE id=@id").run(t);
}), i.handle("delete-note", (e, t) => {
	if (!d) return;
	d.prepare("DELETE FROM notes WHERE id=?").run(t);
	let n = h.get(t);
	n && n.close();
});
//#endregion
