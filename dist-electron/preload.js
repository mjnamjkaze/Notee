import { contextBridge as e, ipcRenderer as t } from "electron";
//#region electron/preload.ts
e.exposeInMainWorld("ipcRenderer", {
	invoke: (e, ...n) => t.invoke(e, ...n),
	on: (e, n) => {
		t.on(e, (e, ...t) => n(...t));
	},
	send: (e, ...n) => t.send(e, ...n)
});
//#endregion
