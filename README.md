# Repeit

Audio player PWA. No uploads, no cloud — plays files directly from your device.

**[Open app →](https://anfilat.github.io/repeit/)**

Works on desktop and mobile right in the browser — no local setup needed.

## Features

- **Local playback** — audio files stay on your device, decoded in-browser
- **Playlist management** — add files, reorder by drag-and-drop, repeat modes (off / all / one)
- **Session persistence** — playlist restores on reload
- **PWA** — installable as a standalone app

## Install as App

The player works as a Progressive Web App and can be installed on mobile devices for a native-like experience:

**Android (Chrome):** Open the app → tap the three-dot menu → "Install app" or "Add to Home Screen". The app appears in the app drawer, supports media controls on the lock screen, and continues playing with the screen off.

**iOS (Edge):** Open the app in Edge → tap the share button → "Add to Home Screen". Note: Chrome on iOS does not support the File System Access API required for file picking.

## Browser Support

Chrome and Edge. These are the only browsers that support the File System Access API used for file picking.

## Storage

When you add files to the playlist, they are copied into the browser's private storage (OPFS). This means:

- The playlist survives page reloads and browser restarts without re-requesting permissions
- Original files on disk can be moved or deleted without affecting the playlist
- **Memory usage increases with the number and size of files** — on mobile devices with limited storage, adding many large files may be a concern
- Use "Clear all" to free up storage space
