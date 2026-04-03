# Repeit — Project Overview

**Purpose:** Audio player PWA using Web Audio API + File System Access API. Chrome/Edge only.

**Tech Stack:**
- TypeScript (strict mode, ES2020 target)
- React 19 + JSX (react-jsx)
- Vite 7 (build tool with HMR)
- Tailwind CSS 4 (via @tailwindcss/vite plugin)
- Vitest 4 (testing, node environment by default)
- dnd-kit (drag-and-drop for playlist reordering)
- vite-plugin-pwa (PWA manifest + Workbox)
- fake-indexeddb (for IndexedDB tests)
- Testing Library (React, jest-dom, user-event)

**Architecture — Three Layers:**
1. **Services** (`src/audio/`, `src/state/`) — Pure logic classes, no React
   - `AudioEngine` — Web Audio API wrapper (play/pause/seek/stop/volume)
   - `FileService` — File System Access API (file/folder picking, audio decoding)
   - `PlaylistManager` — Mutable state: track list, current index, repeat mode
   - `StorageService` — IndexedDB persistence of FileSystemFileHandle objects
2. **Hooks** (`src/hooks/`) — React bridge layer
   - `usePlaylist` — Wraps PlaylistManager + FileService + StorageService
   - `useAudioEngine` — Wraps AudioEngine with lazy AudioContext creation
3. **Components** (`src/components/`) — UI with Tailwind CSS + dnd-kit

**Key Constraints:**
- AudioBuffer is uncompressed (~10MB/min). Only current track's buffer is loaded.
- AudioContext must be created from user gesture (Chrome autoplay policy).
- Browser target: Chrome/Edge only (File System Access API)
