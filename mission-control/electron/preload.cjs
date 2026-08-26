const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('missionControl', {
  health: () => ipcRenderer.invoke('mission:health'),
  git: () => ipcRenderer.invoke('mission:git'),
  diagnostics: () => ipcRenderer.invoke('mission:diagnostics'),
  ping: () => ipcRenderer.invoke('mission:ping'),
  command: (command) => ipcRenderer.invoke('mission:command', command),
  reports: {
    pdf: () => ipcRenderer.invoke('reports:pdf'),
  },
  contacts: {
    list: () => ipcRenderer.invoke('contacts:list'),
    add: (contact) => ipcRenderer.invoke('contacts:add', contact),
  },
  email: {
    send: (payload) => ipcRenderer.invoke('email:send', payload),
    inbox: (opts) => ipcRenderer.invoke('email:inbox', opts),
    scanData: (opts) => ipcRenderer.invoke('email:scan-data', opts),
  },
  layers: {
    list: () => ipcRenderer.invoke('layers:list'),
    set: (id, enabled) => ipcRenderer.invoke('layers:set', { id, enabled }),
    setAll: (enabled) => ipcRenderer.invoke('layers:set-all', enabled),
  },
  github: {
    hasToken: () => ipcRenderer.invoke('github:has-token'),
    setToken: (token) => ipcRenderer.invoke('github:set-token', token),
    workflows: () => ipcRenderer.invoke('github:workflows'),
    runs: (opts) => ipcRenderer.invoke('github:runs', opts),
    trigger: (workflowId, ref, inputs) =>
      ipcRenderer.invoke('github:trigger', { workflowId, ref, inputs }),
    cancel: (runId) => ipcRenderer.invoke('github:cancel', runId),
    rerun: (runId, failedOnly) => ipcRenderer.invoke('github:rerun', { runId, failedOnly }),
  },
  branding: {
    chooseLogo: () => ipcRenderer.invoke('branding:choose-logo'),
  },
});
