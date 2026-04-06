import { vi } from 'vitest';

export function createMockAudioContext() {
  let currentTime = 0;

  const mockAudioBuffer = {
    duration: 120,
    sampleRate: 44100,
    length: 44100 * 120,
    numberOfChannels: 2,
    getChannelData: vi.fn().mockReturnValue(new Float32Array(0)),
  } as unknown as AudioBuffer;

  const ctx = {
    createBufferSource: vi.fn(() => ({
      buffer: null as AudioBuffer | null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    })),
    createGain: vi.fn(() => ({
      gain: { value: 1, setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    createMediaStreamDestination: vi.fn(() => ({
      stream: new MediaStream(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    decodeAudioData: vi.fn().mockResolvedValue(mockAudioBuffer),
    destination: Symbol('destination'),
    get currentTime() {
      return currentTime;
    },
    sampleRate: 44100,
    state: 'running' as AudioContextState,
    close: vi.fn(),
    resume: vi.fn(),
    _advanceTime: (ms: number) => {
      currentTime += ms / 1000;
    },
  } as unknown as AudioContext;

  return { ctx, mockAudioBuffer };
}
