import { describe, it, expect, vi } from 'vitest';
import { FileService } from '../FileService';

function createMockFileHandle(name: string): FileSystemFileHandle {
  const file = new File([], name, { type: 'audio/mpeg' });
  return {
    kind: 'file', name,
    getFile: vi.fn().mockResolvedValue(file),
    isSameEntry: vi.fn(),
    queryPermission: vi.fn().mockResolvedValue('granted'),
    requestPermission: vi.fn().mockResolvedValue('granted'),
  } as unknown as FileSystemFileHandle;
}

function createMockDirectoryHandle(files: Map<string, FileSystemFileHandle>): FileSystemDirectoryHandle {
  const entries = Array.from(files.entries());
  let index = 0;
  return {
    kind: 'directory', name: 'test-folder',
    values: vi.fn().mockReturnValue({
      next: () => {
        if (index < entries.length) return Promise.resolve({ value: entries[index++][1], done: false });
        return Promise.resolve({ value: undefined, done: true });
      },
      [Symbol.asyncIterator]() { return this; },
    }),
  } as unknown as FileSystemDirectoryHandle;
}

describe('FileService', () => {
  const fileService = new FileService();

  it('filters mp3 and wav files from handles', () => {
    const mp3 = createMockFileHandle('song.mp3');
    const wav = createMockFileHandle('song.wav');
    const txt = createMockFileHandle('readme.txt');
    const result = fileService.filterAudioFiles([mp3, wav, txt]);
    expect(result).toHaveLength(2);
    expect(result.map(h => h.name)).toEqual(['song.mp3', 'song.wav']);
  });

  it('requests permission and returns true if granted', async () => {
    const handle = createMockFileHandle('test.mp3');
    expect(await fileService.requestPermission(handle)).toBe(true);
  });

  it('scans directory for audio files', async () => {
    const mp3 = createMockFileHandle('track1.mp3');
    const wav = createMockFileHandle('track2.wav');
    const txt = createMockFileHandle('notes.txt');
    const dirHandle = createMockDirectoryHandle(new Map([['track1.mp3', mp3], ['track2.wav', wav], ['notes.txt', txt]]));
    const result = await fileService.scanDirectory(dirHandle);
    expect(result).toHaveLength(2);
    expect(result.map(h => h.name)).toContain('track1.mp3');
    expect(result.map(h => h.name)).toContain('track2.wav');
  });

  it('decodes a file handle to AudioBuffer', async () => {
    const mockBuffer = { duration: 180, sampleRate: 44100 } as AudioBuffer;
    const mockCtx = { decodeAudioData: vi.fn().mockResolvedValue(mockBuffer) } as unknown as AudioContext;
    const handle = createMockFileHandle('test.mp3');
    const result = await fileService.decodeAudioFile(handle, mockCtx);
    expect(result).toBe(mockBuffer);
  });
});
