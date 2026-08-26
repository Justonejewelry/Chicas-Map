const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('missionControl', {
  health: () => ipcRenderer.invoke('mission:health'),
  git: () => ipcRenderer.invoke('mission:git'),
  command: (command) => ipcRenderer.invoke('mission:command', command)
});
