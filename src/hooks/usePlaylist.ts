import { useState, useCallback, useRef } from 'react';
import type { Track, RepeatMode, PlaylistState } from '../types';
import { PlaylistManager } from '../state/PlaylistManager';
import { FileService } from '../audio/FileService';
import { StorageService } from '../state/StorageService';

export function usePlaylist() {
  const managerRef = useRef(new PlaylistManager());
  const fileServiceRef = useRef(new FileService());
  const storageServiceRef = useRef(new StorageService());

  const [state, setState] = useState<PlaylistState>(managerRef.current.state);

  const sync = useCallback(() => {
    setState({ ...managerRef.current.state });
  }, []);

  const addFiles = useCallback(
    async (handles: FileSystemFileHandle[]) => {
      const audioHandles = fileServiceRef.current.filterAudioFiles(handles);
      if (audioHandles.length === 0) return;

      const existingNames = new Set(managerRef.current.state.tracks.map(t => t.handle.name));
      const uniqueHandles = audioHandles.filter(h => !existingNames.has(h.name));
      if (uniqueHandles.length === 0) return;

      const ctx = new AudioContext();
      const newTracks: Track[] = await Promise.all(
        uniqueHandles.map(async handle => {
          let duration = 0;
          try {
            const buffer = await fileServiceRef.current.decodeAudioFile(handle, ctx);
            duration = buffer.duration;
          } catch {
            // skip duration if decode fails
          }
          return {
            id: crypto.randomUUID(),
            name: handle.name.replace(/\.[^.]+$/, ''),
            duration,
            handle,
          };
        })
      );
      ctx.close();

      const mgr = managerRef.current;
      const isFirstLoad = mgr.state.tracks.length === 0;
      mgr.state.tracks = [...mgr.state.tracks, ...newTracks];
      if (isFirstLoad && mgr.state.tracks.length > 0) {
        mgr.state.currentIndex = 0;
      }
      sync();
    },
    [sync]
  );

  const removeTrack = useCallback(
    (trackId: string) => {
      managerRef.current.removeTrack(trackId);
      sync();
    },
    [sync]
  );

  const reorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      managerRef.current.reorder(fromIndex, toIndex);
      sync();
    },
    [sync]
  );

  const next = useCallback((): Track | null => {
    const track = managerRef.current.next();
    sync();
    return track;
  }, [sync]);

  const prev = useCallback((): Track | null => {
    const track = managerRef.current.prev();
    sync();
    return track;
  }, [sync]);

  const setCurrentIndex = useCallback(
    (index: number) => {
      managerRef.current.setCurrentIndex(index);
      sync();
    },
    [sync]
  );

  const setRepeat = useCallback(
    (mode: RepeatMode) => {
      managerRef.current.setRepeat(mode);
      sync();
    },
    [sync]
  );

  const currentTrack = managerRef.current.currentTrack;
  const pendingHandlesRef = useRef<FileSystemFileHandle[]>([]);
  const [pendingHandlesCount, setPendingHandlesCount] = useState(0);
  const loadedRef = useRef(false);

  const savePlaylist = useCallback(async (playlistId: string) => {
    const handles = managerRef.current.state.tracks.map(t => t.handle);
    await storageServiceRef.current.saveHandles(playlistId, handles);
  }, []);

  const loadPlaylist = useCallback(
    async (playlistId: string) => {
      if (loadedRef.current) return;
      loadedRef.current = true;

      const handles = await storageServiceRef.current.loadHandles(playlistId);
      if (handles.length === 0) return;

      const granted: FileSystemFileHandle[] = [];
      const pending: FileSystemFileHandle[] = [];
      for (const handle of handles) {
        const ok = await fileServiceRef.current.checkPermission(handle);
        if (ok) granted.push(handle);
        else pending.push(handle);
      }
      if (granted.length > 0) {
        await addFiles(granted);
      }
      if (pending.length > 0) {
        pendingHandlesRef.current = pending;
        setPendingHandlesCount(pending.length);
      }
    },
    [addFiles]
  );

  const restorePlaylist = useCallback(
    async (playlistId: string) => {
      const handles = pendingHandlesRef.current;
      if (handles.length === 0) return;
      const granted: FileSystemFileHandle[] = [];
      for (const handle of handles) {
        const ok = await fileServiceRef.current.requestPermission(handle);
        if (ok) granted.push(handle);
      }
      if (granted.length > 0) {
        await addFiles(granted);
      }
      pendingHandlesRef.current = [];
      setPendingHandlesCount(0);
      // Re-save with all now-granted handles
      const allHandles = managerRef.current.state.tracks.map(t => t.handle);
      await storageServiceRef.current.saveHandles(playlistId, allHandles);
    },
    [addFiles]
  );

  return {
    state,
    currentTrack,
    addFiles,
    removeTrack,
    reorder,
    next,
    prev,
    setCurrentIndex,
    setRepeat,
    savePlaylist,
    loadPlaylist,
    restorePlaylist,
    pendingHandlesCount,
  };
}
