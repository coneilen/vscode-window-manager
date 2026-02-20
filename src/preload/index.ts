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
  }
}

contextBridge.exposeInMainWorld('api', api)
