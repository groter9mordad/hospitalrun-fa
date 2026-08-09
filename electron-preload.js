const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('runcdxDesktop', {
  backup: {
    getLocation: () => ipcRenderer.invoke('runcdx:backup:location'),
    save: (contents) => ipcRenderer.invoke('runcdx:backup:save', contents),
    select: () => ipcRenderer.invoke('runcdx:backup:select'),
    openLocation: () => ipcRenderer.invoke('runcdx:backup:open-location'),
  },
  sync: {
    getConfiguration: () => ipcRenderer.invoke('runcdx:sync:get-configuration'),
    saveConfiguration: (configuration) =>
      ipcRenderer.invoke('runcdx:sync:save-configuration', configuration),
  },
  server: {
    install: () => ipcRenderer.invoke('runcdx:server:install'),
    importConnection: () => ipcRenderer.invoke('runcdx:server:import-connection'),
    exportConnection: () => ipcRenderer.invoke('runcdx:server:export-connection'),
  },
})
