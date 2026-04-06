import { useState, useRef, useCallback, useEffect } from 'react';
import type { AudioState } from '../types';
import { AudioEngine } from '../audio/AudioEngine';

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);
  const rafRef = useRef<number>(0);
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  });

  const tick = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setAudioState({
      isPlaying: engine.isPlaying,
      currentTime: engine.currentTime,
      duration: engine.duration,
    });
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startTicking = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stopTicking = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
  }, []);

  const ctxRef = useRef<AudioContext | null>(null);
  const pendingBufferRef = useRef<AudioBuffer | null>(null);
  const pendingSeekRef = useRef<number | null>(null);

  // Ensure AudioContext is created on first user interaction (play)
  const ensureEngine = useCallback((): AudioEngine => {
    if (!engineRef.current) {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      engineRef.current = new AudioEngine(ctx);
      if (pendingBufferRef.current) {
        engineRef.current.loadBuffer(pendingBufferRef.current);
      }
      if (pendingSeekRef.current !== null) {
        engineRef.current.seek(pendingSeekRef.current);
        pendingSeekRef.current = null;
      }
    }
    if (ctxRef.current?.state === 'suspended') {
      ctxRef.current.resume();
    }
    return engineRef.current;
  }, []);

  const loadBuffer = useCallback(async (buffer: AudioBuffer) => {
    pendingBufferRef.current = buffer;
    pendingSeekRef.current = null;
    if (engineRef.current) {
      await engineRef.current.loadBuffer(buffer);
    }
    setAudioState({
      isPlaying: false,
      currentTime: 0,
      duration: buffer.duration,
    });
  }, []);

  const play = useCallback(async () => {
    const engine = ensureEngine();
    if (ctxRef.current?.state === 'suspended') {
      await ctxRef.current.resume();
    }
    engine.play();
    startTicking();
  }, [ensureEngine, startTicking]);

  const pause = useCallback(() => {
    engineRef.current?.pause();
    stopTicking();
    // One final state sync
    if (engineRef.current) {
      setAudioState({
        isPlaying: false,
        currentTime: engineRef.current.currentTime,
        duration: engineRef.current.duration,
      });
    }
  }, [stopTicking]);

  const seek = useCallback((time: number) => {
    const engine = engineRef.current;
    if (!engine) {
      pendingSeekRef.current = time;
      setAudioState(s => ({ ...s, currentTime: time }));
      return;
    }
    engine.seek(time);
    setAudioState({
      isPlaying: engine.isPlaying,
      currentTime: engine.currentTime,
      duration: engine.duration,
    });
  }, []);

  const syncState = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) {
      setAudioState(s => ({
        ...s,
        currentTime: pendingSeekRef.current ?? s.currentTime,
      }));
      return;
    }
    setAudioState({
      isPlaying: engine.isPlaying,
      currentTime: engine.currentTime,
      duration: engine.duration,
    });
  }, []);

  const stop = useCallback(() => {
    engineRef.current?.stop();
    stopTicking();
    if (engineRef.current) {
      setAudioState({
        isPlaying: false,
        currentTime: 0,
        duration: engineRef.current.duration,
      });
    }
  }, [stopTicking]);

  const setOnTrackEnd = useCallback((callback: (() => void) | null) => {
    if (engineRef.current) {
      engineRef.current.onTrackEnd = callback;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return {
    audioState,
    loadBuffer,
    play,
    pause,
    seek,
    syncState,
    stop,
    setOnTrackEnd,
    stream: engineRef.current?.stream ?? null,
  };
}
