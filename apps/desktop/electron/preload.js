import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (opts) => ipcRenderer.invoke('dialog:openFile', opts),
  writeFile: (opts) => ipcRenderer.invoke('file:write', opts),
  // Clipboard (JSON object dictionary entries) under a custom format.
  clipboardWrite: (json) => ipcRenderer.invoke('clipboard:write', json),
  clipboardRead: () => ipcRenderer.invoke('clipboard:read'),
  // Native OS context menu; resolves to the chosen item id or null.
  showContextMenu: (items) => ipcRenderer.invoke('menu:context', items),
  // Subscribe to native-menu commands; returns an unsubscribe function.
  onMenuCommand: (callback) => {
    const listener = (_event, command) => callback(command)
    ipcRenderer.on('menu:command', listener)
    return () => ipcRenderer.removeListener('menu:command', listener)
  },
})
