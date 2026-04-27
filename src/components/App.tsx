import { useState, useEffect, useCallback, useRef } from 'react';
import { usePlaylist } from '../hooks/usePlaylist';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { useMediaSession } from '../hooks/useMediaSession';
import { Playlist } from './Playlist';
import { PlayerControls } from './PlayerControls';
import { PlaylistMenu } from './PlaylistMenu';
import { ProgressBar } from './ProgressBar';
import { RepeatButton } from './RepeatButton';
import { RepeatCountModal } from './RepeatCountModal';
import type { Track, RepeatMode } from '../types';

export function App() {
  const playlist = usePlaylist();
  const audio = useAudioEngine();
  const userPausedRef = useRef(false);
  const loadingRef = useRef(false);
  const loadIdRef = useRef(0);
  const initialMountRef = useRef(true);
  const lastSaveRef = useRef(0);
  const seekAfterLoadRef = useRef<number | null>(null);
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight);
  const [missingFiles, setMissingFiles] = useState<string[]>([]);
  const [showRepeatCountModal, setShowRepeatCountModal] = useState(false);

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
        const cachedUrl = playlist.getCachedUrl(track.fileId);
        if (cachedUrl) {
          audio.setSrc(cachedUrl);
          if (autoPlay) {
            audio.play();
          }
          await audio.waitForReady();
        } else {
          const url = await playlist.getObjectUrl(track.fileId);
          if (loadId !== loadIdRef.current) return;
          await audio.loadUrl(url);
        }
        if (loadId !== loadIdRef.current) return;

        const seekTo = seekAfterLoadRef.current;
        if (seekTo !== null) {
          audio.seek(seekTo);
          seekAfterLoadRef.current = null;
          playlist.savePlaybackState({
            currentIndex: playlist.state.currentIndex,
            position: seekTo,
          });
          if (!autoPlay) {
            audio.syncState();
          }
        }

        if (autoPlay && !userPausedRef.current) {
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
    if (userPausedRef.current) return;
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
    playlist.savePlaybackState({
      currentIndex: playlist.state.currentIndex,
      position: audio.audioState.currentTime,
    });
  }, [audio.audioState, playlist.state.currentIndex, playlist]);

  // Save playlist when tracks change (skip initial mount)
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    playlist.savePlaylist();
  }, [playlist.state.tracks, playlist]);

  // Load persisted playlist and restore playback state on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const { missingFiles: missing } = await playlist.loadPlaylist();
        if (missing.length > 0) {
          setMissingFiles(missing);
        }
        const saved = await playlist.loadPlaybackState();
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
      playlist.savePlaybackState({
        currentIndex: playlist.state.currentIndex,
        position: time,
      });
    },
    [audio, playlist]
  );

  const handlePlayPause = useCallback(() => {
    if (audio.audioState.isPlaying) {
      userPausedRef.current = true;
      audio.pause();
      playlist.savePlaybackState({
        currentIndex: playlist.state.currentIndex,
        position: audio.audioState.currentTime,
      });
    } else if (playlist.currentTrack) {
      userPausedRef.current = false;
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
    const order: RepeatMode[] = ['off', 'all', 'one', 'Nx'];
    const current = order.indexOf(playlist.state.repeat);
    playlist.setRepeat(order[(current + 1) % order.length]);
  }, [playlist]);

  const handleSelectTrack = useCallback(
    (index: number) => {
      userPausedRef.current = false;
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
    async (trackId: string) => {
      const wasPlaying = playlist.state.tracks[playlist.state.currentIndex]?.id === trackId;
      await playlist.removeTrack(trackId);
      if (wasPlaying) {
        audio.stop();
      }
    },
    [playlist, audio]
  );

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

  const handleClearPlaylist = useCallback(async () => {
    audio.stop();
    await playlist.clearPlaylist();
  }, [audio, playlist]);

  const handleSort = useCallback(() => {
    playlist.sortTracks();
  }, [playlist]);

  const handleShuffle = useCallback(() => {
    playlist.shuffleTracks();
  }, [playlist]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, handleNext, handlePrev]);

  // Media Session API: lock screen / notification controls
  useMediaSession({
    track: playlist.currentTrack ?? null,
    isPlaying: audio.audioState.isPlaying,
    duration: audio.audioState.duration,
    currentTime: audio.audioState.currentTime,
    onPlay: () => {
      userPausedRef.current = false;
      audio.play();
    },
    onPause: () => {
      userPausedRef.current = true;
      audio.pause();
    },
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
    <div className="flex flex-col overflow-hidden bg-gray-50 text-gray-900" style={{ height: viewportHeight }}>
      {/* Loading overlay */}
      {playlist.loadingState.isLoading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 mx-4 min-w-[280px] shadow-lg">
            <p className="text-center mb-3 text-sm">
              Копирование файлов {playlist.loadingState.current}/{playlist.loadingState.total}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                style={{
                  width: `${playlist.loadingState.total > 0 ? (playlist.loadingState.current / playlist.loadingState.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Missing files modal */}
      {missingFiles.length > 0 && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 mx-4 min-w-[280px] max-w-[400px] shadow-lg">
            <h2 className="text-lg font-semibold mb-3">Файлы не найдены</h2>
            <p className="text-sm text-gray-600 mb-3">Следующие файлы отсутствуют:</p>
            <ul className="text-sm text-gray-500 mb-4 max-h-40 overflow-y-auto">
              {missingFiles.map(id => (
                <li key={id}>• {id}</li>
              ))}
            </ul>
            <div className="flex justify-end gap-3">
              <button
                onClick={async () => {
                  await handleClearPlaylist();
                  setMissingFiles([]);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors"
              >
                Очистить плейлист
              </button>
              <button
                onClick={() => setMissingFiles([])}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
              >
                ОК
              </button>
            </div>
          </div>
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
      <footer className="border-t border-gray-200 px-4 py-3 flex flex-col gap-3">
        <ProgressBar
          currentTime={audio.audioState.currentTime}
          duration={audio.audioState.duration}
          onSeek={handleSeek}
        />
        <div className="flex items-center justify-between">
          {/* Left: repeat */}
          <div className="min-w-[60px]">
            <RepeatButton
              repeat={playlist.state.repeat}
              repeatCount={playlist.state.repeatCount}
              onClick={cycleRepeat}
            />
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
              onShuffle={handleShuffle}
              onClear={() => {
                if (confirm('Clear all tracks?')) handleClearPlaylist();
              }}
              onSetRepeatCount={() => setShowRepeatCountModal(true)}
              hasTracks={playlist.state.tracks.length > 0}
            />
          </div>
        </div>
      </footer>

      {showRepeatCountModal && (
        <RepeatCountModal
          count={playlist.state.repeatCount}
          onConfirm={count => {
            playlist.setRepeatCount(count);
            setShowRepeatCountModal(false);
          }}
          onClose={() => setShowRepeatCountModal(false)}
        />
      )}
    </div>
  );
}
