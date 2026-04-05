# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript check + Vite production build
npm test             # Run tests once (Vitest)
npm run test:watch   # Run tests in watch mode
npm run lint         # Run oxlint (check only)
npm run lint:fix     # Auto-fix oxlint issues
npm run format       # Format code with oxfmt --write
npm run format:check # Check formatting without modifying
npx vitest run src/audio/AudioEngine.test.ts  # Run a single test file
```

## Code Quality

**Tools:** oxlint (linter), oxfmt (formatter).

**Workflow:** Pre-commit hook runs `lint + format:check + test` (check-only, no modifications). Fix manually with `lint:fix` and `format` commands before committing.

## Architecture

Audio player PWA using Web Audio API + File System Access API. Chrome/Edge only.

**Three-layer architecture:**

1. **Services** (`src/audio/`, `src/state/`) — Pure logic classes, no React:
   - `AudioEngine` — Web Audio API wrapper (AudioContext → AudioBufferSourceNode → destination). Handles play/pause/seek/stop. Creates new sourceNode per play (Web Audio API requirement).
   - `FileService` — File System Access API: file/folder picking, permission requests, audio decoding via `audioContext.decodeAudioData()`.
   - `PlaylistManager` — Mutable state: track list, current index, repeat mode (off/all/one), reorder, remove.
   - `StorageService` — IndexedDB persistence of `FileSystemFileHandle` objects for session restoration.

2. **Hooks** (`src/hooks/`) — React bridge layer:
   - `usePlaylist` — Wraps PlaylistManager + FileService + StorageService. Handles file→Track conversion (decodes audio to extract duration). Syncs manager state to React via `useState`.
   - `useAudioEngine` — Wraps AudioEngine with lazy AudioContext creation. Syncs playback state to React via `requestAnimationFrame` tick during playback.

3. **Components** (`src/components/`) — UI with Tailwind CSS + dnd-kit for drag-and-drop reordering. `App.tsx` wires hooks together: auto-loads track on index change, auto-advances on track end, persists handles on track changes.

**Key constraint:** AudioBuffer is uncompressed (~10MB/min). Only current track's buffer is loaded. AudioContext must be created from user gesture (Chrome autoplay policy).

## Testing

Vitest with `happy-dom` environment and `fake-indexeddb` for IndexedDB tests. AudioContext is mocked via `src/audio/audioContextMock.ts` — provides `_advanceTime(ms)` to simulate time progression.
