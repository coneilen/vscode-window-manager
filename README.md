# VS Code Window Manager

A small desktop utility that lists all open VS Code windows and lets you click to switch between them.

![Electron](https://img.shields.io/badge/Electron-33-47848F) ![React](https://img.shields.io/badge/React-18-61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)

## Features

- Lists all open VS Code windows with workspace name and active file
- Click any item to bring that window to the foreground
- Auto-refreshes every 3 seconds
- Dark theme matching VS Code aesthetic
- Supports macOS and Windows

## How It Works

| | Detection | Activation |
|---|---|---|
| **macOS** | AppleScript via System Events, targeting VS Code by bundle identifier | `AXRaise` action + `set frontmost` |
| **Windows** | PowerShell `EnumWindows` Win32 API filtering by `Code.exe` processes | `SetForegroundWindow` Win32 API |

Window titles are parsed to extract the workspace name and active file from VS Code's `<file> — <workspace> — <profile>` format.

## Getting Started

```bash
npm install
npm run dev
```

> **macOS note:** On first run, macOS will prompt for Accessibility permission (System Settings > Privacy & Security > Accessibility). This is required for window detection via System Events.

## Build

```bash
npm run build
```

## Tech Stack

- [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/)
- [React](https://react.dev/) + TypeScript
- No native npm dependencies — uses `child_process` with OS-native commands
