const DB_NAME = 'repeit-storage';
const DB_VERSION = 2;
const STORE_NAME = 'playlists';
const PLAYBACK_STORE_NAME = 'playback-state';

export class StorageService {
  private db: IDBDatabase | null = null;

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
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(PLAYBACK_STORE_NAME)) {
          db.createObjectStore(PLAYBACK_STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveHandles(playlistId: string, handles: FileSystemFileHandle[]): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ id: playlistId, handles });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async loadHandles(playlistId: string): Promise<FileSystemFileHandle[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(playlistId);
      request.onsuccess = () => resolve(request.result?.handles ?? []);
      request.onerror = () => reject(request.error);
    });
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(playlistId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async listPlaylistIds(): Promise<string[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAllKeys();
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });
  }

  async savePlaybackState(playlistId: string, state: { currentIndex: number; position: number }): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PLAYBACK_STORE_NAME, 'readwrite');
      tx.objectStore(PLAYBACK_STORE_NAME).put({ id: playlistId, ...state });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async loadPlaybackState(playlistId: string): Promise<{ currentIndex: number; position: number } | null> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(PLAYBACK_STORE_NAME, 'readonly').objectStore(PLAYBACK_STORE_NAME).get(playlistId);
      request.onsuccess = () => {
        const result = request.result;
        if (!result) return resolve(null);
        resolve({ currentIndex: result.currentIndex, position: result.position });
      };
      request.onerror = () => reject(request.error);
    });
  }
}
