import { useState, useCallback, useRef } from 'react';
import type { Track, RepeatMode, PlaylistState, LoadingState } from '../types';
import { PlaylistManager } from '../state/PlaylistManager';
import { FileService } from '../audio/FileService';
import { OpfsStorageService } from '../state/OpfsStorageService';
import { naturalCompare } from '../utils/naturalSort';

const REPEAT_STORAGE_KEY = 'repeit-repeat-mode';
const REPEAT_COUNT_STORAGE_KEY = 'repeit-repeat-count';

export function usePlaylist() {
  const managerRef = useRef(new PlaylistManager());
  const repeatRestoredRef = useRef(false);
  if (!repeatRestoredRef.current) {
    repeatRestoredRef.current = true;
    const saved = localStorage.getItem(REPEAT_STORAGE_KEY);
    if (saved === 'off' || saved === 'all' || saved === 'one' || saved === 'Nx') {
      managerRef.current.setRepeat(saved);
    }
    const savedCount = localStorage.getItem(REPEAT_COUNT_STORAGE_KEY);
    if (savedCount) {
      const count = parseInt(savedCount, 10);
      if (count > 0) managerRef.current.setRepeatCount(count);
    }
  }
  const fileServiceRef = useRef(new FileService());
  const storageRef = useRef(new OpfsStorageService());

  const [state, setState] = useState<PlaylistState>(managerRef.current.state);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    current: 0,
    total: 0,
  });

  const sync = useCallback(() => {
    setState({ ...managerRef.current.state });
  }, []);

  const addFiles = useCallback(
    async (handles: FileSystemFileHandle[], autoSelect = true) => {
      const audioHandles = fileServiceRef.current.filterAudioFiles(handles);
      if (audioHandles.length === 0) return;

      setLoadingState({ isLoading: true, current: 0, total: audioHandles.length });

      const mgr = managerRef.current;
      const isFirstLoad = mgr.state.tracks.length === 0;
      const newTracks: Track[] = [];

      for (let i = 0; i < audioHandles.length; i++) {
        try {
          const result = await storageRef.current.addFile(audioHandles[i]);
          if (!result.duplicate) {
            newTracks.push({
              id: crypto.randomUUID(),
              name: audioHandles[i].name.replace(/\.[^.]+$/, ''),
              duration: result.duration,
              fileId: result.fileId,
            });
          }
        } catch (err) {
          console.error('Failed to add file:', audioHandles[i].name, err);
        }
        setLoadingState({ isLoading: true, current: i + 1, total: audioHandles.length });
      }

      if (newTracks.length > 0) {
        mgr.state.tracks = [...mgr.state.tracks, ...newTracks];
        if (isFirstLoad && autoSelect && mgr.state.tracks.length > 0) {
          mgr.state.currentIndex = 0;
        }
        sync();
      }

      setLoadingState({ isLoading: false, current: 0, total: 0 });
    },
    [sync]
  );

  const addFolder = useCallback(
    async (dirHandle: FileSystemDirectoryHandle) => {
      const handles = await fileServiceRef.current.scanDirectory(dirHandle);
      await addFiles(handles);
    },
    [addFiles]
  );

  const clearPlaylist = useCallback(async () => {
    managerRef.current.clear();
    sync();
    await storageRef.current.clearAll();
  }, [sync]);

  const removeTrack = useCallback(
    async (trackId: string) => {
      const track = managerRef.current.state.tracks.find(t => t.id === trackId);
      managerRef.current.removeTrack(trackId);
      sync();
      if (track) {
        try {
          await storageRef.current.removeFile(track.fileId);
        } catch (err) {
          console.error('Failed to remove file:', err);
        }
      }
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

  const sortTracks = useCallback(() => {
    managerRef.current.sort((a, b) => naturalCompare(a.name, b.name));
    sync();
  }, [sync]);

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

  const autoAdvance = useCallback((): Track | null => {
    const track = managerRef.current.autoAdvance();
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
      localStorage.setItem(REPEAT_STORAGE_KEY, mode);
      sync();
    },
    [sync]
  );

  const setRepeatCount = useCallback(
    (count: number) => {
      managerRef.current.setRepeatCount(count);
      localStorage.setItem(REPEAT_COUNT_STORAGE_KEY, String(count));
      sync();
    },
    [sync]
  );

  const currentTrack = managerRef.current.currentTrack;
  const loadedRef = useRef(false);

  const savePlaybackState = useCallback(async (playbackState: { currentIndex: number; position: number }) => {
    await storageRef.current.savePlaybackState(playbackState);
  }, []);

  const loadPlaybackState = useCallback(async (): Promise<{
    currentIndex: number;
    position: number;
  } | null> => {
    return storageRef.current.loadPlaybackState();
  }, []);

  const savePlaylist = useCallback(async () => {
    const fileIds = managerRef.current.state.tracks.map(t => t.fileId);
    await storageRef.current.savePlaylist(fileIds);
  }, []);

  const loadPlaylist = useCallback(async (): Promise<{ missingFiles: string[] }> => {
    if (loadedRef.current) return { missingFiles: [] };
    loadedRef.current = true;

    const fileIds = await storageRef.current.loadPlaylist();
    if (fileIds.length === 0) return { missingFiles: [] };

    const tracks: Track[] = [];
    const missingFiles: string[] = [];

    for (const fileId of fileIds) {
      const meta = await storageRef.current.getMetadata(fileId);
      if (meta) {
        tracks.push({
          id: crypto.randomUUID(),
          name: meta.originalName.replace(/\.[^.]+$/, ''),
          duration: meta.duration,
          fileId: meta.fileId,
        });
      } else {
        missingFiles.push(fileId);
      }
    }

    if (tracks.length > 0) {
      const mgr = managerRef.current;
      mgr.state.tracks = tracks;
      mgr.state.currentIndex = 0;
      sync();

      // Pre-populate URL cache for Android track transitions
      await storageRef.current.preloadUrls(tracks.map(t => t.fileId));
    }

    return { missingFiles };
  }, [sync]);

  const getObjectUrl = useCallback(async (fileId: string): Promise<string> => {
    return storageRef.current.getObjectUrl(fileId);
  }, []);

  const getCachedUrl = useCallback((fileId: string): string | null => {
    return storageRef.current.getCachedUrl(fileId);
  }, []);

  const getTrack = useCallback((index: number): Track | undefined => {
    const { tracks } = managerRef.current.state;
    return index >= 0 && index < tracks.length ? tracks[index] : undefined;
  }, []);

  return {
    state,
    currentTrack,
    getTrack,
    addFiles,
    addFolder,
    clearPlaylist,
    removeTrack,
    reorder,
    sortTracks,
    next,
    prev,
    autoAdvance,
    setCurrentIndex,
    setRepeat,
    setRepeatCount,
    savePlaylist,
    savePlaybackState,
    loadPlaybackState,
    loadPlaylist,
    getObjectUrl,
    getCachedUrl,
    loadingState,
  };
}
