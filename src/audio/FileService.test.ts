import { describe, it, expect, vi } from 'vitest';
import { FileService } from './FileService';

function createMockFileHandle(name: string): FileSystemFileHandle {
  return {
    kind: 'file',
    name,
    getFile: vi.fn().mockResolvedValue(new File([], name, { type: 'audio/mpeg' })),
    isSameEntry: vi.fn(),
  } as unknown as FileSystemFileHandle;
}

function createMockDirectoryHandle(files: Map<string, FileSystemFileHandle>): FileSystemDirectoryHandle {
  const entries = Array.from(files.entries());
  let index = 0;
  return {
    kind: 'directory',
    name: 'test-folder',
    values: vi.fn().mockReturnValue({
      next: () => {
        if (index < entries.length) return Promise.resolve({ value: entries[index++][1], done: false });
        return Promise.resolve({ value: undefined, done: true });
      },
      [Symbol.asyncIterator]() {
        return this;
      },
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

  it('skips .trashed- files in filterAudioFiles', () => {
    const mp3 = createMockFileHandle('song.mp3');
    const trashed = createMockFileHandle('.trashed-song.mp3');
    const result = fileService.filterAudioFiles([mp3, trashed]);
    expect(result).toHaveLength(1);
    expect(result.map(h => h.name)).toEqual(['song.mp3']);
  });

  it('scans directory for audio files sorted by name', async () => {
    const mp3 = createMockFileHandle('track10.mp3');
    const wav = createMockFileHandle('track2.wav');
    const txt = createMockFileHandle('notes.txt');
    const other = createMockFileHandle('track1.mp3');
    const dirHandle = createMockDirectoryHandle(
      new Map([
        ['track10.mp3', mp3],
        ['track2.wav', wav],
        ['notes.txt', txt],
        ['track1.mp3', other],
      ])
    );
    const result = await fileService.scanDirectory(dirHandle);
    expect(result).toHaveLength(3);
    expect(result.map(h => h.name)).toEqual(['track1.mp3', 'track2.wav', 'track10.mp3']);
  });

  it('skips .trashed- files when scanning directory', async () => {
    const mp3 = createMockFileHandle('song.mp3');
    const trashed = createMockFileHandle('.trashed-song.mp3');
    const dirHandle = createMockDirectoryHandle(
      new Map([
        ['song.mp3', mp3],
        ['.trashed-song.mp3', trashed],
      ])
    );
    const result = await fileService.scanDirectory(dirHandle);
    expect(result).toHaveLength(1);
    expect(result.map(h => h.name)).toEqual(['song.mp3']);
  });
});
