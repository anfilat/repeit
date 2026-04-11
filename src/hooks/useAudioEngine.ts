import { useState, useRef, useCallback, useEffect } from 'react';
import type { AudioState } from '../types';
import { AudioEngine } from '../audio/AudioEngine';

export function useAudioEngine() {
  const engineRef = useRef(new AudioEngine());
  const rafRef = useRef<number>(0);
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  });

  const tick = useCallback(() => {
    const engine = engineRef.current;
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

  const pendingSeekRef = useRef<number | null>(null);

  const loadUrl = useCallback(async (url: string) => {
    pendingSeekRef.current = null;
    await engineRef.current.loadUrl(url);
    setAudioState({
      isPlaying: false,
      currentTime: 0,
      duration: engineRef.current.duration,
    });
  }, []);

  const setSrc = useCallback((url: string) => {
    engineRef.current.setSrc(url);
    setAudioState({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    });
  }, []);

  const waitForReady = useCallback(async () => {
    await engineRef.current.waitForReady();
    setAudioState({
      isPlaying: engineRef.current.isPlaying,
      currentTime: engineRef.current.currentTime,
      duration: engineRef.current.duration,
    });
  }, []);

  const play = useCallback(async () => {
    await engineRef.current.play();
    startTicking();
  }, [startTicking]);

  const pause = useCallback(() => {
    engineRef.current.pause();
    stopTicking();
    setAudioState({
      isPlaying: false,
      currentTime: engineRef.current.currentTime,
      duration: engineRef.current.duration,
    });
  }, [stopTicking]);

  const seek = useCallback((time: number) => {
    engineRef.current.seek(time);
    setAudioState({
      isPlaying: engineRef.current.isPlaying,
      currentTime: engineRef.current.currentTime,
      duration: engineRef.current.duration,
    });
  }, []);

  const syncState = useCallback(() => {
    const engine = engineRef.current;
    setAudioState({
      isPlaying: engine.isPlaying,
      currentTime: engine.currentTime,
      duration: engine.duration,
    });
  }, []);

  const stop = useCallback(() => {
    engineRef.current.stop();
    stopTicking();
    setAudioState({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    });
  }, [stopTicking]);

  const setOnTrackEnd = useCallback((callback: (() => void) | null) => {
    engineRef.current.onTrackEnd = callback;
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return {
    audioState,
    loadUrl,
    setSrc,
    waitForReady,
    play,
    pause,
    seek,
    syncState,
    stop,
    setOnTrackEnd,
  };
}
