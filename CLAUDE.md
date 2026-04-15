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

Audio player PWA. Files are copied into OPFS (Origin Private File System) on add — survives reloads without re-requesting permissions. Uses HTMLAudioElement + File System Access API for file picking. Chrome/Edge only.

**Three-layer architecture:**

1. **Services** (`src/audio/`, `src/state/`) — Pure logic classes, no React:
   - `AudioEngine` — HTMLAudioElement wrapper. Methods: `setSrc`/`loadUrl`/`waitForReady`, `play`/`pause`/`seek`/`stop`. Fires `onTrackEnd` callback.
   - `FileService` — Filters audio files by extension (.mp3/.wav) and scans directories (File System Access API). Returns sorted `FileSystemFileHandle[]`.
   - `PlaylistManager` — Mutable state: track list, current index, repeat mode (off/all/one/Nx), repeat count (default 20), play counter for Nx mode, reorder, remove, sort.
   - `OpfsStorageService` — OPFS for audio file storage + IndexedDB for metadata/playlist/playback state. Hash-based deduplication (SHA-256). Manages object URL cache for playback. Key stores: `files` (file metadata), `playlist` (ordered file IDs), `playback-state` (current index + position).

2. **Hooks** (`src/hooks/`) — React bridge layer:
   - `usePlaylist` — Wraps PlaylistManager + FileService + OpfsStorageService. Handles file→Track conversion, loading progress state, playlist/playback persistence (repeat mode + repeat count to localStorage), object URL access. Syncs manager state to React via `useState`.
   - `useAudioEngine` — Wraps AudioEngine. Syncs playback state to React via `requestAnimationFrame` tick during playback. Two load paths: `setSrc`+`waitForReady` (cached URL) vs `loadUrl` (uncached).
   - `useMediaSession` — Integrates with the Media Session API for OS-level playback controls (lock screen, notification bar, keyboard media keys). Sets track metadata, playback state, and position state (throttled to 1s) for seek bar. Uses refs for action handlers to avoid re-registering on every render.

3. **Components** (`src/components/`) — UI with Tailwind CSS + dnd-kit for drag-and-drop reordering. `App.tsx` (in `src/components/`) wires hooks together: auto-loads track on index change, auto-advances on track end (Nx mode replays current track N times before advancing), throttled playback state save, playlist persistence on track changes, missing file detection on restore. `RepeatCountModal` opened from `PlaylistMenu` sets the Nx repeat count with presets and custom input.

**Core types** in `src/types.ts`: `Track` (has `fileId` referencing OPFS), `RepeatMode` (`off`/`all`/`one`/`Nx`), `PlaylistState` (includes `repeatCount`), `AudioState`, `FileMetadata`, `AddFileResult`, `LoadingState`.

**Key constraint:** Audio playback requires user gesture to start (Chrome autoplay policy).

**Deployment:** `VITE_BASE` env var controls the base path (default `/repeit/`). Setting it to include `beta` switches to beta mode (separate PWA identity and cache). GitHub Actions builds both main and beta (if branch exists), deploys combined output to GitHub Pages.

## Testing

Vitest with `happy-dom` environment and `fake-indexeddb` for IndexedDB tests. Test config is in `vite.config.ts`. Tests use Vitest globals (`describe`, `it`, `expect`) — no imports needed. Test setup (`src/test-setup.ts`) imports `fake-indexeddb/auto` and `@testing-library/jest-dom`.

**Mocking patterns:**
- `AudioEngine.test.ts` — Mocks `HTMLAudioElement` via `vi.stubGlobal('Audio', class {...})`, tracks event listeners manually.
- `OpfsStorageService.test.ts` — Uses real IndexedDB (fake-indexeddb). Mocks `Audio` for duration extraction and `navigator.storage.getDirectory` for OPFS operations.
- `FileService.test.ts` — Creates mock `FileSystemFileHandle`/`FileSystemDirectoryHandle` objects with `vi.fn()`.
