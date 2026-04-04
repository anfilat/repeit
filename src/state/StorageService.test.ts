import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StorageService } from './StorageService';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('repeit-storage');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve();
    });
    service = new StorageService();
  });

  afterEach(() => {
    service.close();
  });

  it('saves and retrieves handles', async () => {
    const mockHandle = { kind: 'file', name: 'test.mp3' } as FileSystemFileHandle;
    await service.saveHandles('default', [mockHandle]);
    const handles = await service.loadHandles('default');
    expect(handles).toHaveLength(1);
    expect(handles[0].name).toBe('test.mp3');
  });

  it('returns empty array for nonexistent playlist', async () => {
    const handles = await service.loadHandles('nonexistent');
    expect(handles).toEqual([]);
  });

  it('overwrites existing playlist', async () => {
    const h1 = { kind: 'file', name: 'a.mp3' } as FileSystemFileHandle;
    const h2 = { kind: 'file', name: 'b.mp3' } as FileSystemFileHandle;
    await service.saveHandles('default', [h1]);
    await service.saveHandles('default', [h2]);
    const handles = await service.loadHandles('default');
    expect(handles).toHaveLength(1);
    expect(handles[0].name).toBe('b.mp3');
  });

  it('deletes a playlist', async () => {
    const handle = { kind: 'file', name: 'test.mp3' } as FileSystemFileHandle;
    await service.saveHandles('default', [handle]);
    await service.deletePlaylist('default');
    const handles = await service.loadHandles('default');
    expect(handles).toEqual([]);
  });

  it('lists saved playlist ids', async () => {
    const handle = { kind: 'file', name: 'test.mp3' } as FileSystemFileHandle;
    await service.saveHandles('pl1', [handle]);
    await service.saveHandles('pl2', [handle]);
    const ids = await service.listPlaylistIds();
    expect(ids).toContain('pl1');
    expect(ids).toContain('pl2');
  });
});
