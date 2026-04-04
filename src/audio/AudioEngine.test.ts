import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioEngine } from './AudioEngine';
import { createMockAudioContext } from './audioContextMock';

describe('AudioEngine', () => {
  let engine: AudioEngine;
  let mockCtx: AudioContext;
  let mockBuffer: AudioBuffer;

  beforeEach(() => {
    const mock = createMockAudioContext();
    mockCtx = mock.ctx;
    mockBuffer = mock.mockAudioBuffer;
    engine = new AudioEngine(mockCtx);
  });

  it('initializes with default state', () => {
    expect(engine.isPlaying).toBe(false);
    expect(engine.currentTime).toBe(0);
    expect(engine.duration).toBe(0);
    expect(engine.volume).toBe(1);
  });

  it('loads an AudioBuffer and reports duration', async () => {
    await engine.loadBuffer(mockBuffer);
    expect(engine.duration).toBe(mockBuffer.duration);
    expect(engine.isPlaying).toBe(false);
  });

  it('plays a loaded buffer', async () => {
    await engine.loadBuffer(mockBuffer);
    engine.play();
    expect(engine.isPlaying).toBe(true);
  });

  it('pauses and reports correct currentTime', async () => {
    await engine.loadBuffer(mockBuffer);
    engine.play();
    (mockCtx as any)._advanceTime(5000);
    engine.pause();
    expect(engine.isPlaying).toBe(false);
    expect(engine.currentTime).toBeCloseTo(5, 1);
  });

  it('resumes from paused position', async () => {
    await engine.loadBuffer(mockBuffer);
    engine.play();
    (mockCtx as any)._advanceTime(3000);
    engine.pause();
    engine.play();
    expect(engine.isPlaying).toBe(true);
  });

  it('seeks to a target position', async () => {
    await engine.loadBuffer(mockBuffer);
    engine.play();
    engine.seek(60);
    expect(engine.isPlaying).toBe(true);
  });

  it('stops playback completely', async () => {
    await engine.loadBuffer(mockBuffer);
    engine.play();
    engine.stop();
    expect(engine.isPlaying).toBe(false);
    expect(engine.currentTime).toBe(0);
  });

  it('sets volume on gain node', async () => {
    await engine.loadBuffer(mockBuffer);
    engine.setVolume(0.5);
    expect(engine.volume).toBe(0.5);
  });

  it('calls onTrackEnd callback when playback finishes', async () => {
    const onEnd = vi.fn();
    engine.onTrackEnd = onEnd;
    await engine.loadBuffer(mockBuffer);
    engine.play();
    const lastSource = (mockCtx as any).createBufferSource.mock.results.at(-1).value;
    lastSource.onended();
    expect(onEnd).toHaveBeenCalledOnce();
  });
});
