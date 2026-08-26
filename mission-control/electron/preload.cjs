const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('missionControl', {
  health: () => ipcRenderer.invoke('mission:health'),
  git: () => ipcRenderer.invoke('mission:git'),
  diagnostics: () => ipcRenderer.invoke('mission:diagnostics'),
  ping: () => ipcRenderer.invoke('mission:ping'),
  command: (command) => ipcRenderer.invoke('mission:command', command),
  reports: { pdf: () => ipcRenderer.invoke('reports:pdf') },
  contacts: { list: () => ipcRenderer.invoke('contacts:list'), add: (contact) => ipcRenderer.invoke('contacts:add', contact) },
  email: { send: (payload) => ipcRenderer.invoke('email:send', payload), inbox: (limit=25) => ipcRenderer.invoke('email:inbox', limit), scanData: (limit=50) => ipcRenderer.invoke('email:scan-data', limit) },
  branding: { chooseLogo: () => ipcRenderer.invoke('branding:choose-logo') }
});
