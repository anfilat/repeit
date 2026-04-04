import { useReducer, useRef, useCallback, useEffect, useMemo } from 'react';
import { AudioEngine } from '../audio/AudioEngine';
import { FileService } from '../audio/FileService';
import { StorageService } from '../state/StorageService';
import type { Track, RepeatMode, PlaylistState, AudioState } from '../types';

// ---------------------------------------------------------------------------
// Action types
// ---------------------------------------------------------------------------

type Action =
  | { type: 'SET_TRACKS'; tracks: Track[] }
  | { type: 'ADD_TRACKS'; tracks: Track[] }
  | { type: 'SET_CURRENT_INDEX'; index: number }
  | { type: 'SET_REPEAT'; mode: RepeatMode }
  | { type: 'REORDER'; from: number; to: number }
  | { type: 'REMOVE_TRACK'; trackId: string };

// ---------------------------------------------------------------------------
// Reducer -- manages PlaylistState immutably
// ---------------------------------------------------------------------------

const initialPlaylistState: PlaylistState = {
  tracks: [],
  currentIndex: -1,
  repeat: 'off',
};

function playlistReducer(state: PlaylistState, action: Action): PlaylistState {
  switch (action.type) {
    case 'SET_TRACKS': {
      const tracks = [...action.tracks];
      return {
        ...state,
        tracks,
        currentIndex: tracks.length > 0 ? 0 : -1,
      };
    }

    case 'ADD_TRACKS': {
      const isFirstLoad = state.tracks.length === 0;
      const tracks = [...state.tracks, ...action.tracks];
      return {
        ...state,
        tracks,
        currentIndex: isFirstLoad && tracks.length > 0 ? 0 : state.currentIndex,
      };
    }

    case 'SET_CURRENT_INDEX': {
      return {
        ...state,
        currentIndex: Math.max(0, Math.min(action.index, state.tracks.length - 1)),
      };
    }

    case 'SET_REPEAT':
      return { ...state, repeat: action.mode };

    case 'REORDER': {
      const tracks = [...state.tracks];
      const moved = tracks[action.from];
      tracks.splice(action.from, 1);
      tracks.splice(action.to, 0, moved);

      let ci = state.currentIndex;

      if (action.from === ci) {
        ci = action.to;
      } else if (action.from < ci && action.to >= ci) {
        ci = ci - 1;
      } else if (action.from > ci && action.to <= ci) {
        ci = ci + 1;
      }

      return { ...state, tracks, currentIndex: ci };
    }

    case 'REMOVE_TRACK': {
      const tracks = state.tracks.filter(t => t.id !== action.trackId);
      const removedIndex = state.tracks.findIndex(t => t.id === action.trackId);
      let ci = state.currentIndex;

      if (tracks.length === 0) {
        ci = -1;
      } else if (removedIndex !== -1 && removedIndex <= ci) {
        ci = Math.max(0, ci - 1);
      }

      return { ...state, tracks, currentIndex: ci };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Helpers: derive next/prev track index according to repeat mode
// ---------------------------------------------------------------------------

function getNextIndex(state: PlaylistState): number | null {
  const { tracks, currentIndex, repeat } = state;
  if (tracks.length === 0) return null;
  if (repeat === 'one') return currentIndex;
  const next = currentIndex + 1;
  if (next >= tracks.length) {
    return repeat === 'all' ? 0 : null;
  }
  return next;
}

function getPrevIndex(state: PlaylistState): number {
  return Math.max(0, state.currentIndex - 1);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAudioPlayer() {
  // -- Playlist state via useReducer ------------------------------------------
  const [playlist, dispatch] = useReducer(playlistReducer, initialPlaylistState);

  // Mutable ref to latest playlist so callbacks always see fresh state
  const playlistRef = useRef(playlist);
  playlistRef.current = playlist;

  // -- Service refs -----------------------------------------------------------
  const fileServiceRef = useRef(new FileService());
  const storageServiceRef = useRef(new StorageService());

  // -- AudioEngine refs -------------------------------------------------------
  const engineRef = useRef<AudioEngine | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  // Tick ref drives periodic AudioState sync during playback
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -- AudioState updates via forced render -----------------------------------
  const [, forceRender] = useReducer((x: number) => x + 1, 0);
  const audioStateRef = useRef<AudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
  });

  const syncState = useCallback(() => {
    const engine = engineRef.current;
    audioStateRef.current = {
      isPlaying: engine?.isPlaying ?? false,
      currentTime: engine?.currentTime ?? 0,
      duration: engine?.duration ?? 0,
      volume: engine?.volume ?? 1,
    };
    forceRender();
  }, []);

  const startTick = useCallback(() => {
    if (tickRef.current) return;
    tickRef.current = setInterval(syncState, 250);
  }, [syncState]);

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  // -- Engine factory ---------------------------------------------------------

  const getEngine = useCallback((): AudioEngine => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (!engineRef.current) {
      engineRef.current = new AudioEngine(ctxRef.current);
    }
    if ((ctxRef.current as { state?: string }).state === 'suspended') {
      ctxRef.current.resume();
    }
    return engineRef.current;
  }, []);

  // -- Cleanup on unmount -----------------------------------------------------

  useEffect(() => {
    return () => {
      stopTick();
      if (engineRef.current) {
        engineRef.current.onTrackEnd = null;
        engineRef.current.stop();
        engineRef.current = null;
      }
      if (ctxRef.current) {
        ctxRef.current.close();
        ctxRef.current = null;
      }
      storageServiceRef.current.close();
    };
  }, [stopTick]);

  // -- Derived: current track -------------------------------------------------

  const currentTrack: Track | undefined = useMemo(() => {
    const { currentIndex, tracks } = playlist;
    return currentIndex >= 0 && currentIndex < tracks.length ? tracks[currentIndex] : undefined;
  }, [playlist]);

  // ---------------------------------------------------------------------------
  // Playlist actions
  // ---------------------------------------------------------------------------

  const setTracks = useCallback((tracks: Track[]) => {
    dispatch({ type: 'SET_TRACKS', tracks });
  }, []);

  const setCurrentIndex = useCallback((index: number) => {
    dispatch({ type: 'SET_CURRENT_INDEX', index });
  }, []);

  const setRepeat = useCallback((mode: RepeatMode) => {
    dispatch({ type: 'SET_REPEAT', mode });
  }, []);

  const reorder = useCallback((from: number, to: number) => {
    dispatch({ type: 'REORDER', from, to });
  }, []);

  const removeTrack = useCallback((trackId: string) => {
    dispatch({ type: 'REMOVE_TRACK', trackId });
  }, []);

  // -- Navigation (next / prev) -----------------------------------------------

  const next = useCallback((): Track | null => {
    const nextIdx = getNextIndex(playlistRef.current);
    if (nextIdx === null) return null;
    dispatch({ type: 'SET_CURRENT_INDEX', index: nextIdx });
    return playlistRef.current.tracks[nextIdx] ?? null;
  }, []);

  const prev = useCallback((): Track | null => {
    const prevIdx = getPrevIndex(playlistRef.current);
    dispatch({ type: 'SET_CURRENT_INDEX', index: prevIdx });
    return playlistRef.current.tracks[prevIdx] ?? null;
  }, []);

  // -- File handling -----------------------------------------------------------

  const addFiles = useCallback(async (handles: FileSystemFileHandle[]) => {
    const audioHandles = fileServiceRef.current.filterAudioFiles(handles);
    if (audioHandles.length === 0) return;

    const ctx = new AudioContext();
    const newTracks: Track[] = await Promise.all(
      audioHandles.map(async handle => {
        let duration = 0;
        try {
          const buffer = await fileServiceRef.current.decodeAudioFile(handle, ctx);
          duration = buffer.duration;
        } catch {
          // skip duration when decode fails
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

    dispatch({ type: 'ADD_TRACKS', tracks: newTracks });
  }, []);

  // -- Storage -----------------------------------------------------------------

  const savePlaylist = useCallback(async (playlistId: string) => {
    const handles = playlistRef.current.tracks.map(t => t.handle);
    await storageServiceRef.current.saveHandles(playlistId, handles);
  }, []);

  const loadPlaylist = useCallback(
    async (playlistId: string) => {
      const handles = await storageServiceRef.current.loadHandles(playlistId);
      if (handles.length === 0) return;

      const granted: FileSystemFileHandle[] = [];
      for (const handle of handles) {
        const ok = await fileServiceRef.current.requestPermission(handle);
        if (ok) granted.push(handle);
      }
      if (granted.length > 0) {
        await addFiles(granted);
      }
    },
    [addFiles]
  );

  // ---------------------------------------------------------------------------
  // AudioEngine controls
  // ---------------------------------------------------------------------------

  const loadBuffer = useCallback(
    async (buffer: AudioBuffer) => {
      const engine = getEngine();
      await engine.loadBuffer(buffer);
      syncState();
    },
    [getEngine, syncState]
  );

  const play = useCallback(() => {
    const engine = getEngine();
    engine.play();
    syncState();
    startTick();
  }, [getEngine, syncState, startTick]);

  const pause = useCallback(() => {
    const engine = getEngine();
    engine.pause();
    stopTick();
    syncState();
  }, [getEngine, syncState, stopTick]);

  const seek = useCallback(
    (time: number) => {
      const engine = getEngine();
      engine.seek(time);
      syncState();
    },
    [getEngine, syncState]
  );

  const stop = useCallback(() => {
    const engine = getEngine();
    engine.stop();
    stopTick();
    syncState();
  }, [getEngine, syncState, stopTick]);

  const setVolume = useCallback(
    (value: number) => {
      const engine = getEngine();
      engine.setVolume(value);
      syncState();
    },
    [getEngine, syncState]
  );

  const setOnTrackEnd = useCallback((cb: (() => void) | null) => {
    if (engineRef.current) {
      engineRef.current.onTrackEnd = cb;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Return value
  // ---------------------------------------------------------------------------

  return {
    // Playlist state & actions
    playlist,
    currentTrack,
    setTracks,
    setCurrentIndex,
    setRepeat,
    reorder,
    removeTrack,
    next,
    prev,
    addFiles,
    savePlaylist,
    loadPlaylist,

    // Audio engine state & controls
    audioState: audioStateRef.current,
    loadBuffer,
    play,
    pause,
    seek,
    stop,
    setVolume,
    setOnTrackEnd,
  };
}
