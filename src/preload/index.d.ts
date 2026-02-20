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
    }
  }
}
