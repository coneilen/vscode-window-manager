import { app, shell, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import { getVSCodeWindows, activateVSCodeWindow } from './vscode-detector'

let mainWindow: BrowserWindow | null = null
let refreshInterval: ReturnType<typeof setInterval> | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 360,
    height: 500,
    minWidth: 280,
    minHeight: 300,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 12, y: 12 },
    backgroundColor: '#1e1e1e',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Remove the application menu
  Menu.setApplicationMenu(null)

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ── IPC Handlers ───────────────────────────────────────────────────────

function setupIPC(): void {
  ipcMain.handle('get-vscode-windows', async () => {
    return await getVSCodeWindows()
  })

  ipcMain.handle('activate-vscode-window', async (_event, title: string) => {
    await activateVSCodeWindow(title)
  })
}

// ── Refresh Loop ───────────────────────────────────────────────────────

function startRefreshLoop(): void {
  const push = async (): Promise<void> => {
    try {
      if (!mainWindow || mainWindow.isDestroyed()) return
      const windows = await getVSCodeWindows()
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('windows-updated', windows)
      }
    } catch {
      // Window may have been destroyed mid-push
    }
  }

  // Initial push after a short delay
  setTimeout(push, 500)
  refreshInterval = setInterval(push, 3000)
}

// ── Auto Updater ──────────────────────────────────────────────────────

function setupAutoUpdater(): void {
  if (is.dev) return

  autoUpdater.autoDownload = false

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-available', info.version)
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update-download-progress', progress.percent)
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update-downloaded')
  })

  autoUpdater.on('error', () => {
    // Silently ignore update errors
  })

  ipcMain.handle('download-update', () => autoUpdater.downloadUpdate())
  ipcMain.handle('install-update', () => autoUpdater.quitAndInstall())

  // Check 3s after launch, then every 4 hours
  setTimeout(() => autoUpdater.checkForUpdates(), 3000)
  setInterval(() => autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000)
}

// ── App Lifecycle ──────────────────────────────────────────────────────

app.whenReady().then(() => {
  setupIPC()
  createWindow()
  startRefreshLoop()
  setupAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (refreshInterval) clearInterval(refreshInterval)
  if (process.platform !== 'darwin') app.quit()
})
