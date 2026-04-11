import { useState, useEffect, useCallback, useRef } from 'react';
import { usePlaylist } from '../hooks/usePlaylist';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { useMediaSession } from '../hooks/useMediaSession';
import { Playlist } from './Playlist';
import { PlayerControls } from './PlayerControls';
import { PlaylistMenu } from './PlaylistMenu';
import { ProgressBar } from './ProgressBar';
import { FileService } from '../audio/FileService';
import type { Track, RepeatMode } from '../types';

const STORAGE_KEY = 'default-playlist';
const fileService = new FileService();

export function App() {
  const playlist = usePlaylist();
  const audio = useAudioEngine();
  const loadingRef = useRef(false);
  const loadIdRef = useRef(0);
  const initialMountRef = useRef(true);
  const lastSaveRef = useRef(0);
  const seekAfterLoadRef = useRef<number | null>(null);
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight);

  useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Load a track into the audio engine
  const loadAndPlay = useCallback(
    async (track: Track, autoPlay = false) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      const loadId = ++loadIdRef.current;
      try {
        // Try cached URL first (synchronous — preserves user gesture context)
        const cachedUrl = fileService.getCachedUrl(track.handle);
        if (cachedUrl) {
          // Synchronous: set src + try play before any await (for Media Session gesture)
          audio.setSrc(cachedUrl);
          if (autoPlay) {
            audio.play();
          }
          await audio.waitForReady();
        } else {
          // Fallback: async URL creation
          const url = await fileService.createObjectUrl(track.handle);
          if (loadId !== loadIdRef.current) return;
          await audio.loadUrl(url);
        }
        if (loadId !== loadIdRef.current) return;

        const seekTo = seekAfterLoadRef.current;
        if (seekTo !== null) {
          audio.seek(seekTo);
          seekAfterLoadRef.current = null;
          playlist.savePlaybackState(STORAGE_KEY, {
            currentIndex: playlist.state.currentIndex,
            position: seekTo,
          });
          if (!autoPlay) {
            audio.syncState();
          }
        }

        // Play after media is ready (handles auto-advance where sync play() may have failed)
        if (autoPlay) {
          audio.play();
        }
      } catch (err) {
        console.error('Failed to load track:', track.name, err);
      } finally {
        if (loadId === loadIdRef.current) {
          loadingRef.current = false;
        }
      }
    },
    [audio, playlist]
  );

  // Handle track end: advance to next track
  const handleTrackEnd = useCallback(() => {
    const nextTrack = playlist.autoAdvance();
    if (nextTrack) {
      loadAndPlay(nextTrack, true);
    }
  }, [playlist, loadAndPlay]);

  // Wire up onTrackEnd callback
  useEffect(() => {
    audio.setOnTrackEnd(handleTrackEnd);
  }, [audio, handleTrackEnd]);

  // Throttled save of playback state (~1s during playback)
  useEffect(() => {
    if (!audio.audioState.isPlaying) return;
    const now = Date.now();
    if (now - lastSaveRef.current < 1000) return;
    lastSaveRef.current = now;
    playlist.savePlaybackState(STORAGE_KEY, {
      currentIndex: playlist.state.currentIndex,
      position: audio.audioState.currentTime,
    });
  }, [audio.audioState, playlist.state.currentIndex, playlist]);

  // Save playlist handles when tracks change (skip initial mount to avoid
  // overwriting persisted data before loadPlaylist runs)
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    playlist.savePlaylist(STORAGE_KEY);
  }, [playlist.state.tracks, playlist]);

  // Load persisted playlist and restore playback state on mount
  useEffect(() => {
    const restore = async () => {
      try {
        await playlist.loadPlaylist(STORAGE_KEY);
        const saved = await playlist.loadPlaybackState(STORAGE_KEY);
        if (saved && saved.currentIndex >= 0) {
          const track = playlist.getTrack(saved.currentIndex);
          if (track) {
            seekAfterLoadRef.current = saved.position;
            playlist.setCurrentIndex(saved.currentIndex);
            loadAndPlay(track, false);
          }
        }
      } catch (err) {
        console.error('Failed to restore playback state:', err);
      }
    };
    restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSeek = useCallback(
    (time: number) => {
      audio.seek(time);
      playlist.savePlaybackState(STORAGE_KEY, {
        currentIndex: playlist.state.currentIndex,
        position: time,
      });
    },
    [audio, playlist]
  );

  const handlePlayPause = useCallback(() => {
    if (audio.audioState.isPlaying) {
      audio.pause();
      playlist.savePlaybackState(STORAGE_KEY, {
        currentIndex: playlist.state.currentIndex,
        position: audio.audioState.currentTime,
      });
    } else if (playlist.currentTrack) {
      if (audio.audioState.duration === 0) {
        loadAndPlay(playlist.currentTrack, true);
      } else {
        audio.play();
      }
    }
  }, [audio, playlist.currentTrack, playlist, loadAndPlay]);

  const handleNext = useCallback(() => {
    const track = playlist.next();
    if (track) {
      loadAndPlay(track, audio.audioState.isPlaying);
    } else {
      audio.stop();
    }
  }, [playlist, audio, loadAndPlay]);

  const handlePrev = useCallback(() => {
    const track = playlist.prev();
    if (track) {
      loadAndPlay(track, audio.audioState.isPlaying);
    }
  }, [playlist, audio, loadAndPlay]);

  const cycleRepeat = useCallback(() => {
    const order: RepeatMode[] = ['off', 'all', 'one'];
    const current = order.indexOf(playlist.state.repeat);
    playlist.setRepeat(order[(current + 1) % order.length]);
  }, [playlist]);

  const handleSelectTrack = useCallback(
    (index: number) => {
      playlist.setCurrentIndex(index);
      const track = playlist.state.tracks[index];
      if (track) {
        loadAndPlay(track, true);
      }
    },
    [playlist, loadAndPlay]
  );

  const handleAddFiles = useCallback(
    (handles: FileSystemFileHandle[]) => {
      playlist.addFiles(handles);
    },
    [playlist]
  );

  const handleRemoveTrack = useCallback(
    (trackId: string) => {
      const wasPlaying = playlist.state.tracks[playlist.state.currentIndex]?.id === trackId;
      playlist.removeTrack(trackId);
      if (wasPlaying) {
        audio.stop();
      }
    },
    [playlist, audio]
  );

  const handleRestore = useCallback(() => {
    playlist.restorePlaylist(STORAGE_KEY);
  }, [playlist]);

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      playlist.reorder(fromIndex, toIndex);
    },
    [playlist]
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index > 0) playlist.reorder(index, index - 1);
    },
    [playlist]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index < playlist.state.tracks.length - 1) playlist.reorder(index, index + 1);
    },
    [playlist]
  );

  const handleClearPlaylist = useCallback(() => {
    audio.stop();
    playlist.clearPlaylist();
  }, [audio, playlist]);

  const handleSort = useCallback(() => {
    playlist.sortTracks();
  }, [playlist]);

  // Media Session API: lock screen / notification controls
  useMediaSession({
    track: playlist.currentTrack ?? null,
    isPlaying: audio.audioState.isPlaying,
    duration: audio.audioState.duration,
    currentTime: audio.audioState.currentTime,
    onPlay: () => audio.play(),
    onPause: () => audio.pause(),
    onNext: handleNext,
    onPrevious: handlePrev,
    onSeek: handleSeek,
  });

  const handleSelectFiles = useCallback(async () => {
    try {
      const handles = await window.showOpenFilePicker({
        multiple: true,
        types: [{ accept: { 'audio/*': ['.mp3', '.wav'] } }],
      });
      if (handles.length > 0) handleAddFiles(handles);
    } catch {
      // user cancelled
    }
  }, [handleAddFiles]);

  const handleSelectFolder = useCallback(async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      playlist.addFolder(dirHandle);
    } catch {
      // user cancelled
    }
  }, [playlist]);

  return (
    <div className="flex flex-col overflow-hidden bg-gray-900 text-white" style={{ height: viewportHeight }}>
      {/* Restore access banner */}
      {playlist.pendingHandlesCount > 0 && (
        <div className="px-4 py-2 bg-yellow-900/50 border-b border-yellow-700/50 flex items-center justify-between">
          <span className="text-yellow-200 text-sm">{playlist.pendingHandlesCount} file(s) need access permission</span>
          <button
            onClick={handleRestore}
            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-sm font-medium transition-colors"
          >
            Restore access
          </button>
        </div>
      )}

      {/* Playlist */}
      <Playlist
        tracks={playlist.state.tracks}
        currentIndex={playlist.state.currentIndex}
        onSelectTrack={handleSelectTrack}
        onRemoveTrack={handleRemoveTrack}
        onReorder={handleReorder}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
      />

      {/* Player bar */}
      <footer className="border-t border-gray-800 px-4 py-3 flex flex-col gap-3">
        <ProgressBar
          currentTime={audio.audioState.currentTime}
          duration={audio.audioState.duration}
          onSeek={handleSeek}
        />
        <div className="flex items-center justify-between">
          {/* Left: repeat */}
          <div className="min-w-[60px]">
            <button
              onClick={cycleRepeat}
              className={`p-2 rounded hover:bg-white/10 transition-colors ${playlist.state.repeat === 'off' ? 'text-gray-500' : 'text-blue-400'}`}
              title={
                playlist.state.repeat === 'off'
                  ? 'Repeat off'
                  : playlist.state.repeat === 'all'
                    ? 'Repeat all'
                    : 'Repeat one'
              }
            >
              {playlist.state.repeat === 'one' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 0.5 17.5 2.5 15 4.5" />
                  <path d="M4 8V6a3.5 3.5 0 0 1 3.5-3.5H17" />
                  <polyline points="9 19.5 6.5 21.5 9 23.5" />
                  <path d="M20 16v2a3.5 3.5 0 0 1-3.5 3.5H7" />
                  <text
                    x="12"
                    y="15.5"
                    fontSize="9"
                    fill="currentColor"
                    stroke="none"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    1
                  </text>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
              )}
            </button>
          </div>

          {/* Center: player controls */}
          <PlayerControls
            isPlaying={audio.audioState.isPlaying}
            onPlayPause={handlePlayPause}
            onNext={handleNext}
            onPrev={handlePrev}
          />

          {/* Right: playlist actions menu */}
          <div className="min-w-[60px] flex justify-end">
            <PlaylistMenu
              onAddFiles={handleSelectFiles}
              onAddFolder={handleSelectFolder}
              onSort={handleSort}
              onClear={() => {
                if (confirm('Clear all tracks?')) handleClearPlaylist();
              }}
              hasTracks={playlist.state.tracks.length > 0}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
