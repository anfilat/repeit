import { useState, useEffect, useCallback, useRef } from 'react';
import { usePlaylist } from '../hooks/usePlaylist';
import { useAudioEngine } from '../hooks/useAudioEngine';
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
  const initialMountRef = useRef(true);
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
      try {
        const ctx = new AudioContext();
        const buffer = await fileService.decodeAudioFile(track.handle, ctx);
        ctx.close();
        await audio.loadBuffer(buffer);
        if (autoPlay) {
          audio.play();
        }
      } catch (err) {
        console.error('Failed to load track:', track.name, err);
      } finally {
        loadingRef.current = false;
      }
    },
    [audio]
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

  // When current track changes (from playlist navigation), load it
  const prevIndexRef = useRef(playlist.state.currentIndex);
  useEffect(() => {
    if (playlist.state.currentIndex !== prevIndexRef.current && playlist.currentTrack) {
      prevIndexRef.current = playlist.state.currentIndex;
      loadAndPlay(playlist.currentTrack);
    }
  }, [playlist.state.currentIndex, playlist.currentTrack, loadAndPlay]);

  // Save playlist handles when tracks change (skip initial mount to avoid
  // overwriting persisted data before loadPlaylist runs)
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    playlist.savePlaylist(STORAGE_KEY);
  }, [playlist.state.tracks, playlist]);

  // Load persisted playlist on mount
  useEffect(() => {
    playlist.loadPlaylist(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlayPause = useCallback(() => {
    if (audio.audioState.isPlaying) {
      audio.pause();
    } else if (playlist.currentTrack) {
      if (audio.audioState.duration === 0) {
        loadAndPlay(playlist.currentTrack, true);
      } else {
        audio.play();
      }
    }
  }, [audio, playlist.currentTrack, loadAndPlay]);

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
          onSeek={audio.seek}
        />
        <div className="flex items-center justify-between">
          {/* Left: track count */}
          <span className="text-xs text-gray-400 min-w-[60px]">
            {playlist.state.tracks.length} track{playlist.state.tracks.length !== 1 ? 's' : ''}
          </span>

          {/* Center: player controls */}
          <PlayerControls
            isPlaying={audio.audioState.isPlaying}
            repeat={playlist.state.repeat}
            onPlayPause={handlePlayPause}
            onNext={handleNext}
            onPrev={handlePrev}
            onRepeat={cycleRepeat}
          />

          {/* Right: playlist actions menu */}
          <div className="min-w-[60px] flex justify-end">
            <PlaylistMenu
              onAddFiles={handleSelectFiles}
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
