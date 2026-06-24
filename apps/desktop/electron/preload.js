import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (opts) => ipcRenderer.invoke('dialog:openFile', opts),
  writeFile: (opts) => ipcRenderer.invoke('file:write', opts),
  // Subscribe to native-menu commands; returns an unsubscribe function.
  onMenuCommand: (callback) => {
    const listener = (_event, command) => callback(command)
    ipcRenderer.on('menu:command', listener)
    return () => ipcRenderer.removeListener('menu:command', listener)
  },
})
