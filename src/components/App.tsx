import { useEffect, useCallback, useRef } from 'react';
import { usePlaylist } from '../hooks/usePlaylist';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { FilePicker } from './FilePicker';
import { Playlist } from './Playlist';
import { PlayerControls } from './PlayerControls';
import { ProgressBar } from './ProgressBar';
import { VolumeControl } from './VolumeControl';
import { FileService } from '../audio/FileService';
import type { Track, RepeatMode } from '../types';

const STORAGE_KEY = 'default-playlist';
const fileService = new FileService();

export function App() {
  const playlist = usePlaylist();
  const audio = useAudioEngine();
  const loadingRef = useRef(false);

  // Load a track into the audio engine
  const loadAndPlay = useCallback(async (track: Track, autoPlay = false) => {
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
  }, [audio]);

  // Handle track end: advance to next track
  const handleTrackEnd = useCallback(() => {
    const nextTrack = playlist.next();
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
    if (
      playlist.state.currentIndex !== prevIndexRef.current &&
      playlist.currentTrack
    ) {
      prevIndexRef.current = playlist.state.currentIndex;
      loadAndPlay(playlist.currentTrack);
    }
  }, [playlist.state.currentIndex, playlist.currentTrack, loadAndPlay]);

  // Save playlist handles when tracks change
  useEffect(() => {
    if (playlist.state.tracks.length > 0) {
      playlist.savePlaylist(STORAGE_KEY);
    }
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

  const handleSelectTrack = useCallback((index: number) => {
    playlist.setCurrentIndex(index);
    const track = playlist.state.tracks[index];
    if (track) {
      loadAndPlay(track);
    }
  }, [playlist, loadAndPlay]);

  const handleAddFiles = useCallback((handles: FileSystemFileHandle[]) => {
    playlist.addFiles(handles);
  }, [playlist]);

  const handleAddFolder = useCallback((dirHandle: FileSystemDirectoryHandle) => {
    playlist.addFolder(dirHandle);
  }, [playlist]);

  const handleRemoveTrack = useCallback((trackId: string) => {
    const wasPlaying = playlist.state.tracks[playlist.state.currentIndex]?.id === trackId;
    playlist.removeTrack(trackId);
    if (wasPlaying) {
      audio.stop();
    }
  }, [playlist, audio]);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    playlist.reorder(fromIndex, toIndex);
  }, [playlist]);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h1 className="text-lg font-bold tracking-wide">Repeit</h1>
        <FilePicker onFiles={handleAddFiles} onFolder={handleAddFolder} />
      </header>

      {/* Playlist */}
      <Playlist
        tracks={playlist.state.tracks}
        currentIndex={playlist.state.currentIndex}
        onSelectTrack={handleSelectTrack}
        onRemoveTrack={handleRemoveTrack}
        onReorder={handleReorder}
      />

      {/* Player bar */}
      <footer className="border-t border-gray-800 px-4 py-3 flex flex-col gap-3">
        <ProgressBar
          currentTime={audio.audioState.currentTime}
          duration={audio.audioState.duration}
          onSeek={audio.seek}
        />
        <div className="flex items-center justify-between">
          <VolumeControl
            volume={audio.audioState.volume}
            onVolumeChange={audio.setVolume}
          />
          <PlayerControls
            isPlaying={audio.audioState.isPlaying}
            repeat={playlist.state.repeat}
            onPlayPause={handlePlayPause}
            onNext={handleNext}
            onPrev={handlePrev}
            onRepeat={cycleRepeat}
          />
          <div className="w-32" /> {/* Balance spacer */}
        </div>
      </footer>
    </div>
  );
}
