import { describe, it, expect, vi } from 'vitest';
import { FileService } from './FileService';

function createMockFileHandle(name: string): FileSystemFileHandle {
  const file = new File([], name, { type: 'audio/mpeg' });
  return {
    kind: 'file',
    name,
    getFile: vi.fn().mockResolvedValue(file),
    isSameEntry: vi.fn(),
    queryPermission: vi.fn().mockResolvedValue('granted'),
    requestPermission: vi.fn().mockResolvedValue('granted'),
  } as unknown as FileSystemFileHandle;
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

  it('creates an object URL from a file handle', async () => {
    const handle = createMockFileHandle('test.mp3');
    const url = await fileService.createObjectUrl(handle);
    expect(url).toMatch(/^blob:/);
  });
});
