import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'

let mainWindow = null

function buildFilters(extensions) {
  if (!extensions || extensions.length === 0) {
    return [{ name: 'All Files', extensions: ['*'] }]
  }
  return [
    { name: extensions.map((e) => e.toUpperCase()).join(' / '), extensions },
    { name: 'All Files', extensions: ['*'] },
  ]
}

function send(command) {
  mainWindow?.webContents.send('menu:command', command)
}

function buildMenu() {
  const isMac = process.platform === 'darwin'
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => send('new') },
        { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: () => send('open') },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('save') },
        { type: 'separator' },
        {
          label: 'Export',
          submenu: [
            { label: 'Export as EDS', click: () => send('export-eds') },
            { label: 'Export as XDD', click: () => send('export-xdd') },
            { label: 'Export as CANopenNode', click: () => send('export-canopen-node') },
          ],
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // electron-vite injects ELECTRON_RENDERER_URL in dev; load the built file otherwise.
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ─── IPC: native file I/O ──────────────────────────────────────────────────

ipcMain.handle('dialog:openFile', async (_event, { extensions = [] } = {}) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: buildFilters(extensions),
  })
  if (canceled || filePaths.length === 0) return null
  const filePath = filePaths[0]
  const content = await readFile(filePath, 'utf8')
  return { name: basename(filePath), path: filePath, content }
})

ipcMain.handle(
  'file:write',
  async (_event, { path: targetPath, suggestedName, content, extensions = [] } = {}) => {
    let outPath = targetPath
    if (!outPath) {
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        defaultPath: suggestedName,
        filters: buildFilters(extensions),
      })
      if (canceled || !filePath) return null
      outPath = filePath
    }
    await writeFile(outPath, content, 'utf8')
    return { name: basename(outPath), path: outPath }
  },
)

// ─── App lifecycle ─────────────────────────────────────────────────────────

app.whenReady().then(() => {
  buildMenu()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
