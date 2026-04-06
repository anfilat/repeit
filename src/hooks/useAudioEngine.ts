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

  // Ensure AudioContext is created on first user interaction
  const ensureEngine = useCallback((): AudioEngine => {
    if (!engineRef.current) {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      engineRef.current = new AudioEngine(ctx);
    }
    if (ctxRef.current?.state === 'suspended') {
      ctxRef.current.resume();
    }
    return engineRef.current;
  }, []);

  const loadBuffer = useCallback(
    async (buffer: AudioBuffer) => {
      const engine = ensureEngine();
      await engine.loadBuffer(buffer);
      setAudioState({
        isPlaying: false,
        currentTime: 0,
        duration: engine.duration,
      });
    },
    [ensureEngine]
  );

  const play = useCallback(async () => {
    console.log('play');
    const engine = ensureEngine();
    if (ctxRef.current?.state === 'suspended') {
      await ctxRef.current.resume();
    }
    engine.play();
    startTicking();
  }, [ensureEngine, startTicking]);

  const pause = useCallback(() => {
    console.log('pause');
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
    if (!engine) return;
    engine.seek(time);
    setAudioState({
      isPlaying: engine.isPlaying,
      currentTime: engine.currentTime,
      duration: engine.duration,
    });
  }, []);

  const syncState = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
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
