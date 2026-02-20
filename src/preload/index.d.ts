export interface VSCodeWindow {
  id: string
  title: string
  workspace: string
  activeFile: string
}

declare global {
  interface Window {
    api: {
      getVSCodeWindows: () => Promise<VSCodeWindow[]>
      activateVSCodeWindow: (title: string) => Promise<void>
      onWindowsUpdated: (callback: (windows: VSCodeWindow[]) => void) => () => void
      onUpdateAvailable: (callback: (version: string) => void) => () => void
      onUpdateDownloadProgress: (callback: (percent: number) => void) => () => void
      onUpdateDownloaded: (callback: () => void) => () => void
      downloadUpdate: () => Promise<void>
      installUpdate: () => Promise<void>
    }
  }
}
