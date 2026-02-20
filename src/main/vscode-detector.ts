import { execFile } from 'child_process'

export interface VSCodeWindow {
  id: string
  title: string
  workspace: string
  activeFile: string
}

function parseWindowTitle(title: string): { workspace: string; activeFile: string } {
  // VS Code titles use em-dash (—) as separator
  // Format: "<active_file> — <workspace> — <profile>" or "<workspace> — <profile>" or just "<workspace>"
  const parts = title.split(' \u2014 ')

  if (parts.length >= 3) {
    return { activeFile: parts[0].trim(), workspace: parts[1].trim() }
  } else if (parts.length === 2) {
    // Could be "workspace — profile" or "file — workspace"
    // If first part has a file extension, treat it as a file
    if (/\.\w+$/.test(parts[0].trim())) {
      return { activeFile: parts[0].trim(), workspace: parts[1].trim() }
    }
    return { activeFile: '', workspace: parts[0].trim() }
  } else {
    return { activeFile: '', workspace: title.trim() }
  }
}

function execPromise(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 5000 }, (error, stdout) => {
      if (error) reject(error)
      else resolve(stdout)
    })
  })
}

// ── macOS ──────────────────────────────────────────────────────────────

const DETECT_APPLESCRIPT = `
tell application "System Events"
  if exists (first process whose bundle identifier is "com.microsoft.VSCode") then
    tell (first process whose bundle identifier is "com.microsoft.VSCode")
      get name of every window
    end tell
  else
    return ""
  end if
end tell
`

async function detectMacOS(): Promise<VSCodeWindow[]> {
  const stdout = await execPromise('osascript', ['-e', DETECT_APPLESCRIPT])
  const raw = stdout.trim()
  if (!raw) return []

  // osascript returns comma-separated list: "title1, title2, title3"
  // But titles themselves can contain commas, and they use em-dash separators.
  // AppleScript joins with ", " — we split on ", " but need to be careful.
  // Since window titles use " — " as separator, a simple ", " split works
  // unless a filename contains ", " which is rare.
  return raw.split(', ').map((title, i) => {
    const { workspace, activeFile } = parseWindowTitle(title)
    return { id: `mac-${i}`, title, workspace, activeFile }
  })
}

function buildActivateScript(title: string): string {
  const escaped = title.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `
tell application "System Events"
  tell (first process whose bundle identifier is "com.microsoft.VSCode")
    repeat with w in every window
      if name of w is "${escaped}" then
        perform action "AXRaise" of w
        exit repeat
      end if
    end repeat
    set frontmost to true
  end tell
end tell
`
}

async function activateMacOS(title: string): Promise<void> {
  await execPromise('osascript', ['-e', buildActivateScript(title)])
}

// ── Windows ────────────────────────────────────────────────────────────

const DETECT_POWERSHELL = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;
public class WinEnum {
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] static extern int GetWindowTextLength(IntPtr hWnd);
    [DllImport("user32.dll")] static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    public static List<string> GetCodeWindows() {
        var result = new List<string>();
        var codePids = new HashSet<uint>();
        foreach (var p in System.Diagnostics.Process.GetProcessesByName("Code")) codePids.Add((uint)p.Id);
        EnumWindows((hWnd, lParam) => {
            if (!IsWindowVisible(hWnd)) return true;
            uint pid; GetWindowThreadProcessId(hWnd, out pid);
            if (!codePids.Contains(pid)) return true;
            int len = GetWindowTextLength(hWnd);
            if (len == 0) return true;
            var sb = new StringBuilder(len + 1);
            GetWindowText(hWnd, sb, sb.Capacity);
            string title = sb.ToString();
            if (title.Length > 0) result.Add(title);
            return true;
        }, IntPtr.Zero);
        return result;
    }
}
"@
[WinEnum]::GetCodeWindows() | ForEach-Object { $_ } | Out-String
`

async function detectWindows(): Promise<VSCodeWindow[]> {
  const stdout = await execPromise('powershell', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    DETECT_POWERSHELL
  ])
  const raw = stdout.trim()
  if (!raw) return []

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((title, i) => {
      const { workspace, activeFile } = parseWindowTitle(title)
      return { id: `win-${i}`, title, workspace, activeFile }
    })
}

const ACTIVATE_POWERSHELL_TEMPLATE = (title: string): string => {
  const escaped = title.replace(/'/g, "''")
  return `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class WinActivate {
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] static extern int GetWindowTextLength(IntPtr hWnd);
    [DllImport("user32.dll")] static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    public static void Activate(string target) {
        EnumWindows((hWnd, lParam) => {
            if (!IsWindowVisible(hWnd)) return true;
            int len = GetWindowTextLength(hWnd);
            if (len == 0) return true;
            var sb = new StringBuilder(len + 1);
            GetWindowText(hWnd, sb, sb.Capacity);
            if (sb.ToString() == target) { ShowWindow(hWnd, 9); SetForegroundWindow(hWnd); return false; }
            return true;
        }, IntPtr.Zero);
    }
}
"@
[WinActivate]::Activate('${escaped}')
`
}

async function activateWindows(title: string): Promise<void> {
  await execPromise('powershell', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    ACTIVATE_POWERSHELL_TEMPLATE(title)
  ])
}

// ── Public API ─────────────────────────────────────────────────────────

export async function getVSCodeWindows(): Promise<VSCodeWindow[]> {
  try {
    if (process.platform === 'darwin') return await detectMacOS()
    if (process.platform === 'win32') return await detectWindows()
    return []
  } catch {
    return []
  }
}

export async function activateVSCodeWindow(title: string): Promise<void> {
  try {
    if (process.platform === 'darwin') await activateMacOS(title)
    else if (process.platform === 'win32') await activateWindows(title)
  } catch {
    // silently fail — window may have closed
  }
}
