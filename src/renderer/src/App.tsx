import { useEffect, useState } from 'react'

interface VSCodeWindow {
  id: string
  title: string
  workspace: string
  activeFile: string
}

type UpdateStatus = 'idle' | 'available' | 'downloading' | 'ready'

function App(): JSX.Element {
  const [windows, setWindows] = useState<VSCodeWindow[]>([])
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle')
  const [updateVersion, setUpdateVersion] = useState('')
  const [downloadPercent, setDownloadPercent] = useState(0)

  useEffect(() => {
    // Fetch initial list
    window.api.getVSCodeWindows().then(setWindows)

    // Subscribe to push updates from main process
    const unsubscribe = window.api.onWindowsUpdated(setWindows)
    return unsubscribe
  }, [])

  useEffect(() => {
    const unsub1 = window.api.onUpdateAvailable((version) => {
      setUpdateVersion(version)
      setUpdateStatus('available')
    })
    const unsub2 = window.api.onUpdateDownloadProgress((percent) => {
      setDownloadPercent(Math.round(percent))
      setUpdateStatus('downloading')
    })
    const unsub3 = window.api.onUpdateDownloaded(() => {
      setUpdateStatus('ready')
    })
    return () => {
      unsub1()
      unsub2()
      unsub3()
    }
  }, [])

  const handleClick = (win: VSCodeWindow): void => {
    window.api.activateVSCodeWindow(win.title)
  }

  return (
    <div className="container">
      <div className="drag-region" />
      <h1 className="title">VS Code Windows</h1>

      {windows.length === 0 ? (
        <div className="empty-state">
          <p>No VS Code windows detected</p>
          <p className="hint">Open a VS Code workspace to get started</p>
        </div>
      ) : (
        <ul className="window-list">
          {windows.map((win) => (
            <li key={win.id} className="window-item" onClick={() => handleClick(win)}>
              <span className="workspace">{win.workspace || 'Untitled'}</span>
              {win.activeFile && <span className="active-file">{win.activeFile}</span>}
            </li>
          ))}
        </ul>
      )}

      {updateStatus !== 'idle' && (
        <div className="update-banner">
          {updateStatus === 'available' && (
            <>
              Update v{updateVersion} available
              <button className="update-btn" onClick={() => window.api.downloadUpdate()}>
                Download
              </button>
            </>
          )}
          {updateStatus === 'downloading' && <>Downloading update... {downloadPercent}%</>}
          {updateStatus === 'ready' && (
            <>
              Update ready to install
              <button className="update-btn" onClick={() => window.api.installUpdate()}>
                Restart
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default App
