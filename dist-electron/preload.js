import { contextBridge, ipcRenderer } from "electron";
//#region electron/preload.ts
contextBridge.exposeInMainWorld("ipcRenderer", {
	invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
	on: (channel, listener) => {
		ipcRenderer.on(channel, (event, ...args) => listener(...args));
	},
	send: (channel, ...args) => ipcRenderer.send(channel, ...args)
});
//#endregion
