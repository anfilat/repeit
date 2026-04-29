import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioEngine } from './AudioEngine';

let mockAudio: {
  paused: boolean;
  currentTime: number;
  duration: number;
  src: string;
  readyState: number;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
  removeAttribute: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};
let mockListeners: Record<string, (() => void)[]>;

vi.stubGlobal(
  'Audio',
  class {
    paused = true;
    currentTime = 0;
    duration = NaN;
    src = '';
    readyState = 0;
    play = vi.fn(async () => {
      this.paused = false;
    });
    pause = vi.fn(() => {
      this.paused = true;
    });
    load = vi.fn();
    removeAttribute = vi.fn((attr: string) => {
      if (attr === 'src') this.src = '';
    });
    addEventListener = vi.fn((event: string, handler: () => void) => {
      mockListeners[event] = mockListeners[event] ?? [];
      mockListeners[event].push(handler);
    });
    removeEventListener = vi.fn((event: string, handler: () => void) => {
      mockListeners[event] = (mockListeners[event] ?? []).filter(h => h !== handler);
    });
    constructor() {
      mockAudio = this as unknown as typeof mockAudio;
    }
  }
);

describe('AudioEngine', () => {
  let engine: AudioEngine;

  beforeEach(() => {
    mockListeners = {};
    engine = new AudioEngine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default state', () => {
    expect(engine.isPlaying).toBe(false);
    expect(engine.currentTime).toBe(0);
    expect(engine.duration).toBe(0);
  });

  it('loads a URL and waits for canplay', async () => {
    const loadPromise = engine.loadUrl('blob:test');
    mockAudio.duration = 180;
    mockListeners['canplay'][0]();
    await loadPromise;
    expect(mockAudio.src).toBe('blob:test');
    expect(engine.duration).toBe(180);
    expect(engine.isPlaying).toBe(false);
  });

  it('plays after loading', async () => {
    mockAudio.duration = 120;
    const loadPromise = engine.loadUrl('blob:test');
    mockListeners['canplay'][0]();
    await loadPromise;

    await engine.play();
    expect(engine.isPlaying).toBe(true);
    expect(mockAudio.play).toHaveBeenCalled();
  });

  it('pauses and reports correct currentTime', async () => {
    mockAudio.duration = 120;
    const loadPromise = engine.loadUrl('blob:test');
    mockListeners['canplay'][0]();
    await loadPromise;

    await engine.play();
    mockAudio.currentTime = 5;
    engine.pause();
    expect(engine.isPlaying).toBe(false);
    expect(engine.currentTime).toBe(5);
  });

  it('seeks to a target position', async () => {
    mockAudio.duration = 120;
    const loadPromise = engine.loadUrl('blob:test');
    mockListeners['canplay'][0]();
    await loadPromise;

    await engine.play();
    engine.seek(60);
    expect(mockAudio.currentTime).toBe(60);
    expect(engine.isPlaying).toBe(true);
  });

  it('stops playback completely', async () => {
    mockAudio.duration = 120;
    const loadPromise = engine.loadUrl('blob:test');
    mockListeners['canplay'][0]();
    await loadPromise;

    await engine.play();
    engine.stop();
    expect(engine.isPlaying).toBe(false);
    expect(engine.currentTime).toBe(0);
  });

  it('swallows AbortError when play is interrupted by pause', async () => {
    mockAudio.play.mockRejectedValueOnce(new DOMException('aborted', 'AbortError'));
    await expect(engine.play()).resolves.toBeUndefined();
  });

  it('re-throws non-AbortError from play', async () => {
    mockAudio.play.mockRejectedValueOnce(new Error('other'));
    await expect(engine.play()).rejects.toThrow('other');
  });

  it('calls onTrackEnd callback when playback finishes', () => {
    const onEnd = vi.fn();
    engine.onTrackEnd = onEnd;

    const endedHandlers = mockListeners['ended'];
    expect(endedHandlers).toHaveLength(1);
    endedHandlers[0]();
    expect(onEnd).toHaveBeenCalledOnce();
  });
});
