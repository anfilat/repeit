import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OpfsStorageService } from './OpfsStorageService';

// Mock Audio element for duration extraction — happy-dom doesn't fire real audio events
vi.stubGlobal(
  'Audio',
  class MockAudio {
    src = '';
    duration = 42;
    addEventListener(event: string, handler: () => void) {
      // Fire synchronously so tests don't hang
      if (event === 'loadedmetadata') handler();
    }
    removeEventListener() {}
    load() {}
  }
);

// Mock OPFS for file operation tests
function setupOpfsMock() {
  const files = new Map<string, File>();

  const dirHandle = {
    getFileHandle: vi.fn(async (name: string, options?: { create?: boolean }) => {
      if (options?.create) {
        files.set(name, new File([], name));
        return {
          getFile: async () => files.get(name)!,
          createWritable: async () => {
            let data = new Uint8Array();
            return {
              write: async (buffer: ArrayBuffer) => {
                data = new Uint8Array(buffer);
                files.set(name, new File([data], name));
              },
              close: async () => {},
            };
          },
        };
      }
      if (!files.has(name)) throw new Error('Not found');
      return {
        getFile: async () => files.get(name)!,
      };
    }),
    removeEntry: vi.fn(async (name: string) => {
      files.delete(name);
    }),
  };

  const rootHandle = {
    getDirectoryHandle: vi.fn(async (_name: string, _options?: { create?: boolean }) => dirHandle),
    removeEntry: vi.fn(async (_name: string) => {
      files.clear();
    }),
  };

  vi.stubGlobal('navigator', {
    ...navigator,
    storage: {
      getDirectory: vi.fn().mockResolvedValue(rootHandle),
    },
  });

  return { files, dirHandle, rootHandle };
}

function createMockFileHandle(name: string, content: string): FileSystemFileHandle {
  const file = new File([content], name, { type: 'audio/mpeg' });
  return {
    kind: 'file',
    name,
    getFile: vi.fn().mockResolvedValue(file),
  } as unknown as FileSystemFileHandle;
}

describe('OpfsStorageService', () => {
  let service: OpfsStorageService;

  beforeEach(async () => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('repeit-storage');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve();
    });
    service = new OpfsStorageService();
  });

  afterEach(() => {
    service.close();
    vi.restoreAllMocks();
  });

  describe('file metadata', () => {
    it('saves and retrieves file metadata', async () => {
      const meta = { fileId: 'abc', originalName: 'song.mp3', hash: 'sha256hex', size: 1024, duration: 180 };
      await service.saveFileMetadata(meta);
      const result = await service.getMetadata('abc');
      expect(result).toEqual(meta);
    });

    it('returns null for nonexistent file', async () => {
      const result = await service.getMetadata('nonexistent');
      expect(result).toBeNull();
    });

    it('finds metadata by hash', async () => {
      const meta = { fileId: 'abc', originalName: 'song.mp3', hash: 'hash123', size: 1024, duration: 180 };
      await service.saveFileMetadata(meta);
      const result = await service.getMetadataByHash('hash123');
      expect(result).toEqual(meta);
    });

    it('returns null for nonexistent hash', async () => {
      const result = await service.getMetadataByHash('nope');
      expect(result).toBeNull();
    });

    it('deletes file metadata', async () => {
      const meta = { fileId: 'abc', originalName: 'song.mp3', hash: 'hash123', size: 1024, duration: 180 };
      await service.saveFileMetadata(meta);
      await service.deleteFileMetadata('abc');
      const result = await service.getMetadata('abc');
      expect(result).toBeNull();
    });
  });

  describe('playlist', () => {
    it('saves and loads playlist file IDs', async () => {
      await service.savePlaylist(['id1', 'id2', 'id3']);
      const ids = await service.loadPlaylist();
      expect(ids).toEqual(['id1', 'id2', 'id3']);
    });

    it('returns empty array when no playlist saved', async () => {
      const ids = await service.loadPlaylist();
      expect(ids).toEqual([]);
    });

    it('overwrites existing playlist', async () => {
      await service.savePlaylist(['id1']);
      await service.savePlaylist(['id2']);
      const ids = await service.loadPlaylist();
      expect(ids).toEqual(['id2']);
    });
  });

  describe('playback state', () => {
    it('saves and retrieves playback state', async () => {
      await service.savePlaybackState({ currentIndex: 2, position: 45.5 });
      const state = await service.loadPlaybackState();
      expect(state).toEqual({ currentIndex: 2, position: 45.5 });
    });

    it('returns null when no playback state saved', async () => {
      const state = await service.loadPlaybackState();
      expect(state).toBeNull();
    });

    it('overwrites existing playback state', async () => {
      await service.savePlaybackState({ currentIndex: 0, position: 10 });
      await service.savePlaybackState({ currentIndex: 1, position: 20 });
      const state = await service.loadPlaybackState();
      expect(state).toEqual({ currentIndex: 1, position: 20 });
    });
  });

  describe('OPFS operations', () => {
    beforeEach(() => {
      setupOpfsMock();
    });

    it('addFile saves metadata and writes to OPFS', async () => {
      const handle = createMockFileHandle('song.mp3', 'audio data');

      const result = await service.addFile(handle);

      expect(result.duplicate).toBe(false);
      expect(result.fileId).toBeTruthy();
      expect(result.duration).toBeGreaterThanOrEqual(0);

      const meta = await service.getMetadata(result.fileId);
      expect(meta).toBeTruthy();
      expect(meta!.originalName).toBe('song.mp3');
      expect(meta!.hash).toBeTruthy();
    });

    it('addFile returns duplicate for same content', async () => {
      const handle1 = createMockFileHandle('song.mp3', 'same content');
      const handle2 = createMockFileHandle('copy.mp3', 'same content');

      const result1 = await service.addFile(handle1);
      const result2 = await service.addFile(handle2);

      expect(result1.duplicate).toBe(false);
      expect(result2.duplicate).toBe(true);
      expect(result2.fileId).toBe(result1.fileId);
    });

    it('addFile adds different files with different hashes', async () => {
      const handle1 = createMockFileHandle('song.mp3', 'content a');
      const handle2 = createMockFileHandle('other.wav', 'content b');

      const result1 = await service.addFile(handle1);
      const result2 = await service.addFile(handle2);

      expect(result1.duplicate).toBe(false);
      expect(result2.duplicate).toBe(false);
      expect(result1.fileId).not.toBe(result2.fileId);
    });

    it('clearAll removes metadata and playlist', async () => {
      const handle = createMockFileHandle('song.mp3', 'audio data');
      await service.addFile(handle);
      await service.savePlaylist(['some-id']);

      await service.clearAll();

      const ids = await service.loadPlaylist();
      expect(ids).toEqual([]);
    });

    it('removeFile deletes metadata', async () => {
      const handle = createMockFileHandle('song.mp3', 'audio data');
      const result = await service.addFile(handle);

      await service.removeFile(result.fileId);

      const meta = await service.getMetadata(result.fileId);
      expect(meta).toBeNull();
    });
  });
});
