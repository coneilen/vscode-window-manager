import { useEffect, useState } from 'react'

interface VSCodeWindow {
  id: string
  title: string
  workspace: string
  activeFile: string
}

function App(): JSX.Element {
  const [windows, setWindows] = useState<VSCodeWindow[]>([])

  useEffect(() => {
    // Fetch initial list
    window.api.getVSCodeWindows().then(setWindows)

    // Subscribe to push updates from main process
    const unsubscribe = window.api.onWindowsUpdated(setWindows)
    return unsubscribe
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
    </div>
  )
}

export default App
