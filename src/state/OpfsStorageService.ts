import type { FileMetadata, AddFileResult } from '../types';

const DB_NAME = 'repeit-storage';
const DB_VERSION = 3;
const FILES_STORE = 'files';
const PLAYLIST_STORE = 'playlist';
const PLAYBACK_STORE = 'playback-state';

async function computeHash(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function getAudioDurationFromUrl(url: string): Promise<number> {
  return new Promise(resolve => {
    const audio = new Audio();
    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('error', onError);
      audio.src = '';
      audio.load();
    };
    const onLoaded = () => {
      const duration = audio.duration || 0;
      cleanup();
      resolve(duration);
    };
    const onError = () => {
      cleanup();
      resolve(0);
    };
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('error', onError);
    audio.src = url;
  });
}

function getExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex >= 0 ? filename.slice(dotIndex) : '';
}

export class OpfsStorageService {
  private db: IDBDatabase | null = null;
  private opfsDir: FileSystemDirectoryHandle | null = null;
  private urlCache = new Map<string, string>();

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private async getDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          const store = db.createObjectStore(FILES_STORE, { keyPath: 'fileId' });
          store.createIndex('hash', 'hash', { unique: false });
        }
        if (!db.objectStoreNames.contains(PLAYLIST_STORE)) {
          db.createObjectStore(PLAYLIST_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(PLAYBACK_STORE)) {
          db.createObjectStore(PLAYBACK_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async getOpfsDir(): Promise<FileSystemDirectoryHandle> {
    if (this.opfsDir) return this.opfsDir;
    const root = await navigator.storage.getDirectory();
    this.opfsDir = await root.getDirectoryHandle('repeit', { create: true });
    return this.opfsDir;
  }

  // --- File metadata ---

  async saveFileMetadata(meta: FileMetadata): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FILES_STORE, 'readwrite');
      tx.objectStore(FILES_STORE).put(meta);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getMetadata(fileId: string): Promise<FileMetadata | null> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(FILES_STORE, 'readonly').objectStore(FILES_STORE).get(fileId);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async getMetadataByHash(hash: string): Promise<FileMetadata | null> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const store = db.transaction(FILES_STORE, 'readonly').objectStore(FILES_STORE);
      const index = store.index('hash');
      const request = index.get(hash);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFileMetadata(fileId: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FILES_STORE, 'readwrite');
      tx.objectStore(FILES_STORE).delete(fileId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- OPFS file operations ---

  async addFile(handle: FileSystemFileHandle): Promise<AddFileResult> {
    const file = await handle.getFile();
    const buffer = await file.arrayBuffer();
    const hash = await computeHash(buffer);

    // Check for duplicate
    const existing = await this.getMetadataByHash(hash);
    if (existing) {
      return { fileId: existing.fileId, duplicate: true, duration: existing.duration };
    }

    // Generate UUID and write to OPFS
    const fileId = crypto.randomUUID();
    const opfsName = fileId + getExtension(handle.name);

    const dir = await this.getOpfsDir();
    const fileHandle = await dir.getFileHandle(opfsName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(buffer);
    await writable.close();

    // Create object URL from OPFS file and cache it (needed for Android track transitions)
    const opfsFile = await fileHandle.getFile();
    const url = URL.createObjectURL(opfsFile);
    this.urlCache.set(fileId, url);

    // Get duration from cached URL
    const duration = await getAudioDurationFromUrl(url);

    // Save metadata
    await this.saveFileMetadata({
      fileId,
      originalName: handle.name,
      hash,
      size: file.size,
      duration,
    });

    return { fileId, duplicate: false, duration };
  }

  async removeFile(fileId: string): Promise<void> {
    const meta = await this.getMetadata(fileId);
    if (!meta) return;

    // Remove from OPFS
    try {
      const dir = await this.getOpfsDir();
      await dir.removeEntry(fileId + getExtension(meta.originalName));
    } catch {
      // File may already be gone
    }

    // Revoke URL if cached
    this.revokeUrl(fileId);

    // Remove metadata
    await this.deleteFileMetadata(fileId);
  }

  async clearAll(): Promise<void> {
    // Remove entire repeit/ directory from OPFS
    try {
      const root = await navigator.storage.getDirectory();
      await root.removeEntry('repeit', { recursive: true });
      this.opfsDir = null;
    } catch {
      // Directory may not exist
    }

    // Revoke all cached URLs
    for (const url of this.urlCache.values()) {
      URL.revokeObjectURL(url);
    }
    this.urlCache.clear();

    // Clear all IndexedDB stores
    const db = await this.getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([FILES_STORE, PLAYLIST_STORE, PLAYBACK_STORE], 'readwrite');
      tx.objectStore(FILES_STORE).clear();
      tx.objectStore(PLAYLIST_STORE).clear();
      tx.objectStore(PLAYBACK_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Object URL management ---

  async getObjectUrl(fileId: string): Promise<string> {
    const cached = this.urlCache.get(fileId);
    if (cached) return cached;

    const meta = await this.getMetadata(fileId);
    if (!meta) throw new Error(`File not found: ${fileId}`);

    const dir = await this.getOpfsDir();
    const fileHandle = await dir.getFileHandle(fileId + getExtension(meta.originalName));
    const file = await fileHandle.getFile();
    const url = URL.createObjectURL(file);
    this.urlCache.set(fileId, url);
    return url;
  }

  async preloadUrls(fileIds: string[]): Promise<void> {
    for (const fileId of fileIds) {
      if (!this.urlCache.has(fileId)) {
        try {
          await this.getObjectUrl(fileId);
        } catch {
          // Skip files that can't be loaded
        }
      }
    }
  }

  getCachedUrl(fileId: string): string | null {
    return this.urlCache.get(fileId) ?? null;
  }

  revokeUrl(fileId: string): void {
    const url = this.urlCache.get(fileId);
    if (url) {
      URL.revokeObjectURL(url);
      this.urlCache.delete(fileId);
    }
  }

  // --- Playlist (single) ---

  async savePlaylist(fileIds: string[]): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PLAYLIST_STORE, 'readwrite');
      tx.objectStore(PLAYLIST_STORE).put({ id: 'default', fileIds });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async loadPlaylist(): Promise<string[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(PLAYLIST_STORE, 'readonly').objectStore(PLAYLIST_STORE).get('default');
      request.onsuccess = () => resolve(request.result?.fileIds ?? []);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Playback state ---

  async savePlaybackState(state: { currentIndex: number; position: number }): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PLAYBACK_STORE, 'readwrite');
      tx.objectStore(PLAYBACK_STORE).put({ id: 'default', ...state });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async loadPlaybackState(): Promise<{ currentIndex: number; position: number } | null> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(PLAYBACK_STORE, 'readonly').objectStore(PLAYBACK_STORE).get('default');
      request.onsuccess = () => {
        const result = request.result;
        if (!result) return resolve(null);
        resolve({ currentIndex: result.currentIndex, position: result.position });
      };
      request.onerror = () => reject(request.error);
    });
  }
}
