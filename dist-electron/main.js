import { BrowserWindow as e, Menu as t, Tray as n, app as r, dialog as i, ipcMain as a, nativeImage as o } from "electron";
import { dirname as s, join as c } from "path";
import { readFileSync as l } from "fs";
import { fileURLToPath as u, pathToFileURL as d } from "url";
import f from "better-sqlite3";
//#region electron/main.ts
var p = s(u(import.meta.url)), m = null, h = null, g = process.env.VITE_DEV_SERVER_URL !== void 0;
function _() {
	m = new f(c(r.getPath("userData"), "notee.db")), m.pragma("journal_mode = WAL"), m.exec("\n    CREATE TABLE IF NOT EXISTS notes (\n      id TEXT PRIMARY KEY,\n      text TEXT,\n      x INTEGER,\n      y INTEGER,\n      width INTEGER,\n      height INTEGER,\n      color TEXT,\n      isAlwaysOnTop INTEGER DEFAULT 0,\n      isDeleted INTEGER DEFAULT 0\n    )\n  ");
	try {
		m.exec("ALTER TABLE notes ADD COLUMN isDeleted INTEGER DEFAULT 0");
	} catch {}
}
var v = /* @__PURE__ */ new Map();
function y(t) {
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
			preload: c(p, "preload.cjs"),
			nodeIntegration: !1,
			contextIsolation: !0
		}
	}), r = d(c(p, "../dist/index.html")).href + `#note/${t.id}`, i = g ? `${process.env.VITE_DEV_SERVER_URL}#note/${t.id}` : r;
	n.loadURL(i), n.webContents.on("console-message", (e, t, n, r, i) => {
		console.log(`[Window Console] Level ${t}: ${n} (Line: ${r})`);
	}), g && n.webContents.openDevTools({ mode: "detach" }), v.set(t.id, n), n.on("closed", () => {
		v.delete(t.id);
	});
}
function b() {
	if (!m) return;
	let e = m.prepare("SELECT * FROM notes WHERE isDeleted = 0").all();
	e.length === 0 ? x() : e.forEach((e) => {
		y(e);
	});
}
function x() {
	let e = {
		id: Date.now().toString(),
		text: "",
		x: 100,
		y: 100,
		width: 300,
		height: 300,
		color: "#fdfd96",
		isAlwaysOnTop: 0,
		isDeleted: 0
	};
	m.prepare("INSERT INTO notes (id, text, x, y, width, height, color, isAlwaysOnTop, isDeleted) VALUES (@id, @text, @x, @y, @width, @height, @color, @isAlwaysOnTop, @isDeleted)").run(e), y(e);
}
var S = null;
function C() {
	if (S) {
		S.focus();
		return;
	}
	S = new e({
		width: 600,
		height: 500,
		autoHideMenuBar: !0,
		webPreferences: {
			preload: c(p, "preload.cjs"),
			nodeIntegration: !1,
			contextIsolation: !0
		}
	});
	let t = d(c(p, "../dist/index.html")).href + "#trash", n = g ? `${process.env.VITE_DEV_SERVER_URL}#trash` : t;
	S.loadURL(n), g && S.webContents.openDevTools({ mode: "detach" }), S.on("closed", () => {
		S = null;
	});
}
function w() {
	h = new n(o.createFromDataURL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAHhJREFUOE9jZKAQMKIpf+B//P9gA0hyDKgGoAk+HkRofhK+IQaAakCa/x/UgNPEKMMnzA1I8/+DmhFDEyI0g2sgYQ3QGpiGIMQGIBvBBwuh+f+hGkAG/0fTjOAZYh2AzUBC/mNDCDUD0hCEuAGj2YDU/CdG8wAzBQDTj0p0pU5E1gAAAABJRU5ErkJggg=="));
	let e = t.buildFromTemplate([
		{
			label: "New Note",
			click: () => {
				let e = Array.from(v.values()).pop(), t = 100, n = 100;
				if (e) {
					let [r, i] = e.getPosition();
					t = r + 30, n = i + 30;
				}
				let r = {
					id: Date.now().toString(),
					text: "",
					x: t,
					y: n,
					width: 300,
					height: 300,
					color: "#fdfd96",
					isAlwaysOnTop: 0,
					isDeleted: 0
				};
				m.prepare("INSERT INTO notes (id, text, x, y, width, height, color, isAlwaysOnTop, isDeleted) VALUES (@id, @text, @x, @y, @width, @height, @color, @isAlwaysOnTop, @isDeleted)").run(r), y(r);
			}
		},
		{
			label: "Trash Bin",
			click: () => {
				C();
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
	h.setToolTip("Notee"), h.setContextMenu(e);
}
r.whenReady().then(() => {
	_(), b(), w();
}), r.on("window-all-closed", () => {}), a.handle("get-note", (e, t) => m ? m.prepare("SELECT * FROM notes WHERE id = ?").get(t) : null), a.handle("create-note", () => {
	let e = Date.now().toString(), t = 100, n = 100;
	if (v.size > 0) {
		let e = 0, r = 0;
		for (let t of v.values()) {
			let [n, i] = t.getPosition();
			n > e && (e = n), i > r && (r = i);
		}
		t = e + 30, n = r + 30;
	}
	let r = {
		id: e,
		text: "",
		x: t,
		y: n,
		width: 300,
		height: 300,
		color: "#fdfd96",
		isAlwaysOnTop: 0,
		isDeleted: 0
	};
	return m.prepare("INSERT INTO notes (id, text, x, y, width, height, color, isAlwaysOnTop, isDeleted) VALUES (@id, @text, @x, @y, @width, @height, @color, @isAlwaysOnTop, @isDeleted)").run(r), y(r), r;
}), a.handle("update-note", (e, t) => {
	m && m.prepare("UPDATE notes SET text=@text, x=@x, y=@y, width=@width, height=@height, color=@color, isAlwaysOnTop=@isAlwaysOnTop WHERE id=@id").run(t);
}), a.handle("delete-note", (e, t) => {
	if (!m) return;
	m.prepare("UPDATE notes SET isDeleted=1 WHERE id=?").run(t);
	let n = v.get(t);
	n && n.close(), S && S.webContents.send("trash-updated");
}), a.handle("get-deleted-notes", () => m ? m.prepare("SELECT * FROM notes WHERE isDeleted=1").all() : []), a.handle("restore-note", (e, t) => {
	if (!m) return;
	m.prepare("UPDATE notes SET isDeleted=0 WHERE id=?").run(t);
	let n = m.prepare("SELECT * FROM notes WHERE id=?").get(t);
	n && y(n), S && S.webContents.send("trash-updated");
}), a.handle("hard-delete-note", (e, t) => {
	m && (m.prepare("DELETE FROM notes WHERE id=?").run(t), S && S.webContents.send("trash-updated"));
}), a.handle("select-image", async () => {
	let { canceled: e, filePaths: t } = await i.showOpenDialog({
		properties: ["openFile"],
		filters: [{
			name: "Images",
			extensions: [
				"jpg",
				"png",
				"gif",
				"webp",
				"jpeg"
			]
		}]
	});
	if (e || t.length === 0) return null;
	let n = l(t[0]), r = t[0].split(".").pop()?.toLowerCase() || "jpeg";
	return `data:${r === "png" ? "image/png" : r === "webp" ? "image/webp" : r === "gif" ? "image/gif" : "image/jpeg"};base64,${n.toString("base64")}`;
});
//#endregion
