const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('missionControl', {
  health: () => ipcRenderer.invoke('mission:health'),
  git: () => ipcRenderer.invoke('mission:git'),
  diagnostics: () => ipcRenderer.invoke('mission:diagnostics'),
  ping: () => ipcRenderer.invoke('mission:ping'),
  command: (command) => ipcRenderer.invoke('mission:command', command)
});
