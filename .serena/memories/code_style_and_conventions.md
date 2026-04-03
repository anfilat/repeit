# Code Style and Conventions

## TypeScript
- Strict mode enabled (`strict: true`)
- `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` enabled
- `verbatimModuleSyntax` — must use `import type` for type-only imports
- ES2020 target, ESNext modules, bundler module resolution
- React JSX transform (`jsx: "react-jsx"`)

## Code Style
- Classes use `private`/`public` modifiers, private fields prefixed with `_` when exposed via getter (e.g., `_isPlaying` → `get isPlaying()`)
- Services are plain classes with no framework dependencies
- Hooks bridge service state to React via `useState`
- Types defined in `src/types.ts` (Track, RepeatMode, PlaylistState, AudioState)
- Component files are PascalCase, service files are PascalCase

## Testing
- Vitest with `globals: true` (no need to import describe/it/expect)
- Node environment by default (not jsdom)
- `fake-indexeddb/auto` imported in `src/test-setup.ts`
- AudioContext mocked via `src/audio/__tests__/helpers/audioContextMock.ts` — provides `_advanceTime(ms)` for time simulation
- Test files colocated in `__tests__` directories

## File Structure
- `src/audio/` — AudioEngine, FileService
- `src/state/` — PlaylistManager, StorageService
- `src/hooks/` — usePlaylist, useAudioEngine, useAudioPlayer
- `src/components/` — React UI components (App, Playlist, PlayerControls, etc.)
- `src/types.ts` — Shared type definitions
