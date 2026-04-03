# Audio Player — Design Spec

## Context

Need a cross-platform audio file player that works on macOS, Android, and Linux. The app plays selected audio files sequentially with basic playback controls. Implemented as a PWA using React and Web Audio API.

## Tech Stack

- **Framework**: React + TypeScript
- **Build**: Vite
- **Audio**: Web Audio API (AudioContext, AudioBufferSourceNode, GainNode)
- **Drag-and-drop**: dnd-kit
- **Styling**: Tailwind CSS
- **PWA**: vite-plugin-pwa
- **File access**: File System Access API (Chrome/Edge only)
- **Persistence**: IndexedDB for FileSystemFileHandle storage

## Supported Formats

MP3, WAV

## File Selection

- **Individual files**: `showOpenFilePicker({ multiple: true, types: [{ accept: { 'audio/*': ['.mp3', '.wav'] } }] })`
- **Folder**: `showDirectoryPicker()` — scans folder for all .mp3/.wav files
- **Persistence**: FileSystemFileHandle saved to IndexedDB. On reopen, permission is requested and files are accessible again without re-selection.

## Audio Playback (Web Audio API)

### Audio Graph

```
AudioContext
  └── AudioBufferSourceNode (per track)
        ├── GainNode (volume)
        └── destination
```

### Playback Lifecycle

1. File handle → `getFile()` → `arrayBuffer()` → `audioContext.decodeAudioData()` → `AudioBuffer`
2. Create `AudioBufferSourceNode`, connect through `GainNode` to `destination`
3. `source.start(0, offset)` to play from position
4. Pause: stop source, save `audioContext.currentTime - startTime + offset`
5. Resume: create new sourceNode with saved offset
6. Seek: stop current sourceNode, create new one with target offset
7. Track end: `sourceNode.onended` → PlaylistManager determines next track

### Memory Management

- AudioBuffer is uncompressed (~10MB/min). Decode only current track + preload next.
- Release AudioBuffer when track is no longer current or next.

### Audio State

```ts
interface AudioState {
  isPlaying: boolean;
  currentTime: number;  // seconds
  duration: number;     // seconds
  volume: number;       // 0..1
}
```

## Playlist

### Data Model

```ts
interface Track {
  id: string;
  name: string;
  duration: number;
  handle: FileSystemFileHandle;
  audioBuffer?: AudioBuffer;  // loaded on demand
}

interface PlaylistState {
  tracks: Track[];
  currentIndex: number;
  repeat: 'off' | 'all' | 'one';
}
```

### Track Switching

- Next: `currentIndex + 1`
- Prev: `currentIndex - 1`
- Repeat off: reached end → stop
- Repeat all: reached end → restart from first track
- Repeat one: replay current track

### Drag-and-Drop

Tracks can be reordered via drag-and-drop using dnd-kit. `currentIndex` adjusts accordingly when tracks are moved.

## UI Components

```
App
├── FilePicker          — buttons: select files / select folder
├── Playlist            — scrollable list of tracks
│   └── PlaylistItem    — name, duration, delete button, drag handle
├── PlayerControls      — play/pause, next/prev, repeat toggle
├── ProgressBar         — current position, seek by click/drag
└── VolumeControl       — slider 0..1
```

## Project Structure

```
src/
├── components/
│   ├── App.tsx
│   ├── FilePicker.tsx
│   ├── Playlist.tsx
│   ├── PlaylistItem.tsx
│   ├── PlayerControls.tsx
│   ├── ProgressBar.tsx
│   └── VolumeControl.tsx
├── audio/
│   ├── AudioEngine.ts
│   └── FileService.ts
├── state/
│   ├── PlaylistManager.ts
│   └── StorageService.ts
├── hooks/
│   ├── useAudioEngine.ts
│   └── usePlaylist.ts
├── types.ts
├── main.tsx
└── index.css
```

## PWA

- `vite-plugin-pwa` with `registerType: 'autoUpdate'`
- Manifest: name "Repeit", standalone display mode
- Service Worker caches app shell (HTML/CSS/JS)
- Audio files NOT cached by SW — accessed via stored handles

## Browser Support

Chrome, Edge (macOS, Android, Linux, Windows). File System Access API is not supported in Firefox or Safari.

## Verification

1. Open app in Chrome/Edge
2. Select multiple MP3/WAV files → tracks appear in playlist
3. Play → audio plays, progress bar updates, can seek
4. Next/prev → switches tracks correctly
5. Repeat off → stops at last track; repeat all → loops; repeat one → replays
6. Drag tracks → order changes, playback continues correctly
7. Volume slider → changes volume in real-time
8. Close and reopen app → stored handles work, no re-selection needed
9. "Install" as PWA → opens standalone, works offline (app shell cached)
10. Test on Android Chrome → responsive layout, touch controls work
