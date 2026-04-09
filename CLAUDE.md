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

**Workflow:** After making code changes, run `npm run lint:fix` and `npm run format` to auto-fix issues. Pre-commit hook runs `lint + format:check + test` (check-only, no modifications).

## Architecture

Audio player PWA using HTMLAudioElement + File System Access API. Chrome/Edge only.

**Three-layer architecture:**

1. **Services** (`src/audio/`, `src/state/`) — Pure logic classes, no React:
   - `AudioEngine` — HTMLAudioElement wrapper. Handles play/pause/seek/stop via object URL loading. Manages object URL lifecycle (revocation).
   - `FileService` — File System Access API: file/folder picking, permission requests, audio duration extraction via `Audio` element.
   - `PlaylistManager` — Mutable state: track list, current index, repeat mode (off/all/one), reorder, remove.
   - `StorageService` — IndexedDB persistence of `FileSystemFileHandle` objects for session restoration.

2. **Hooks** (`src/hooks/`) — React bridge layer:
   - `usePlaylist` — Wraps PlaylistManager + FileService + StorageService. Handles file→Track conversion (extracts duration via `Audio` element). Syncs manager state to React via `useState`.
   - `useAudioEngine` — Wraps AudioEngine. Syncs playback state to React via `requestAnimationFrame` tick during playback.
   - `useMediaSession` — Integrates with the Media Session API for OS-level playback controls (lock screen, notification bar, keyboard media keys). Sets track metadata, playback state, and position state (throttled to 1s) for seek bar. Uses refs for action handlers to avoid re-registering on every render.

3. **Components** (`src/components/`) — UI with Tailwind CSS + dnd-kit for drag-and-drop reordering. `App.tsx` wires hooks together: auto-loads track on index change, auto-advances on track end, persists handles on track changes.

**Core types** in `src/types.ts`: `Track`, `RepeatMode` (`off`/`all`/`one`), `PlaylistState`, `AudioState`.

**Key constraint:** Audio playback requires user gesture to start (Chrome autoplay policy).

**Deployment:** `VITE_BASE` env var controls the base path (default `/repeit/`). Setting it to include `beta` switches to beta mode (separate PWA identity and cache).

## Testing

Vitest with `happy-dom` environment and `fake-indexeddb` for IndexedDB tests. Test config is in `vite.config.ts`. Tests use Vitest globals (`describe`, `it`, `expect`) — no imports needed. Test setup (`src/test-setup.ts`) imports `fake-indexeddb/auto` and `@testing-library/jest-dom`. AudioContext is mocked via `src/audio/audioContextMock.ts` — provides `_advanceTime(ms)` to simulate time progression.
