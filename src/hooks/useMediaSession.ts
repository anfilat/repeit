import { useEffect, useRef } from 'react';
import type { Track } from '../types';

interface UseMediaSessionOptions {
  track: Track | null;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
}

export function useMediaSession({
  track,
  isPlaying,
  duration,
  currentTime,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSeek,
}: UseMediaSessionOptions): void {
  const supported = 'mediaSession' in navigator;

  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const onNextRef = useRef(onNext);
  const onPreviousRef = useRef(onPrevious);
  const onSeekRef = useRef(onSeek);

  onPlayRef.current = onPlay;
  onPauseRef.current = onPause;
  onNextRef.current = onNext;
  onPreviousRef.current = onPrevious;
  onSeekRef.current = onSeek;

  // Register action handlers once
  useEffect(() => {
    if (!supported) return;
    const ms = navigator.mediaSession;
    if (!ms) return;

    const actions: [MediaSessionAction, (details: MediaSessionActionDetails) => void][] = [
      ['play', () => onPlayRef.current()],
      ['pause', () => onPauseRef.current()],
      ['previoustrack', () => onPreviousRef.current()],
      ['nexttrack', () => onNextRef.current()],
      [
        'seekto',
        details => {
          if (details.seekTime !== undefined) onSeekRef.current(details.seekTime);
        },
      ],
    ];

    for (const [action, handler] of actions) {
      ms.setActionHandler(action, handler);
    }

    return () => {
      for (const [action] of actions) {
        ms.setActionHandler(action, null);
      }
    };
  }, [supported]);

  // Update metadata when track changes
  useEffect(() => {
    if (!supported) return;
    const ms = navigator.mediaSession;
    if (!ms) return;

    if (track) {
      ms.metadata = new MediaMetadata({ title: track.name });
    } else {
      ms.metadata = null;
    }
  }, [track, supported]);

  // Update playback state
  useEffect(() => {
    if (!supported) return;
    const ms = navigator.mediaSession;
    if (!ms) return;

    ms.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying, supported]);

  // Update position state for seek bar on lock screen (throttled)
  const lastPosUpdateRef = useRef(0);
  useEffect(() => {
    if (!supported) return;
    const ms = navigator.mediaSession;
    if (!ms || !duration) return;

    const now = Date.now();
    if (now - lastPosUpdateRef.current < 1000) return;
    lastPosUpdateRef.current = now;

    try {
      ms.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(currentTime, duration),
      });
    } catch {
      // Invalid state (e.g. position > duration), ignore
    }
  }, [duration, currentTime, supported]);
}
