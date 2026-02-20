import { contextBridge, ipcRenderer } from 'electron'

export interface VSCodeWindow {
  id: string
  title: string
  workspace: string
  activeFile: string
}

const api = {
  getVSCodeWindows: (): Promise<VSCodeWindow[]> => ipcRenderer.invoke('get-vscode-windows'),
  activateVSCodeWindow: (title: string): Promise<void> =>
    ipcRenderer.invoke('activate-vscode-window', title),
  onWindowsUpdated: (callback: (windows: VSCodeWindow[]) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, windows: VSCodeWindow[]): void =>
      callback(windows)
    ipcRenderer.on('windows-updated', handler)
    return () => ipcRenderer.removeListener('windows-updated', handler)
  },
  onUpdateAvailable: (callback: (version: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, version: string): void =>
      callback(version)
    ipcRenderer.on('update-available', handler)
    return () => ipcRenderer.removeListener('update-available', handler)
  },
  onUpdateDownloadProgress: (callback: (percent: number) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, percent: number): void =>
      callback(percent)
    ipcRenderer.on('update-download-progress', handler)
    return () => ipcRenderer.removeListener('update-download-progress', handler)
  },
  onUpdateDownloaded: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('update-downloaded', handler)
    return () => ipcRenderer.removeListener('update-downloaded', handler)
  },
  downloadUpdate: (): Promise<void> => ipcRenderer.invoke('download-update'),
  installUpdate: (): Promise<void> => ipcRenderer.invoke('install-update')
}

contextBridge.exposeInMainWorld('api', api)
