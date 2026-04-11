import { naturalCompare } from '../utils/naturalSort';

const AUDIO_EXTENSIONS = ['.mp3', '.wav'];

export class FileService {
  private urlCache = new Map<FileSystemFileHandle, string>();

  filterAudioFiles(handles: FileSystemFileHandle[]): FileSystemFileHandle[] {
    return handles.filter(h => AUDIO_EXTENSIONS.some(ext => h.name.toLowerCase().endsWith(ext)));
  }

  async checkPermission(handle: FileSystemFileHandle): Promise<boolean> {
    const perm = await (handle as any).queryPermission({ mode: 'read' });
    return perm === 'granted';
  }

  async requestPermission(handle: FileSystemFileHandle): Promise<boolean> {
    const opts = { mode: 'read' };
    if ((handle as any).queryPermission) {
      const perm = await (handle as any).queryPermission(opts);
      if (perm === 'granted') return true;
    }
    if ((handle as any).requestPermission) {
      const perm = await (handle as any).requestPermission(opts);
      return perm === 'granted';
    }
    return false;
  }

  async scanDirectory(dirHandle: FileSystemDirectoryHandle): Promise<FileSystemFileHandle[]> {
    const audioHandles: FileSystemFileHandle[] = [];
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemFileHandle;
        if (AUDIO_EXTENSIONS.some(ext => fileHandle.name.toLowerCase().endsWith(ext))) {
          audioHandles.push(fileHandle);
        }
      }
    }
    return audioHandles.sort((a, b) => naturalCompare(a.name, b.name));
  }

  async createObjectUrl(handle: FileSystemFileHandle): Promise<string> {
    const cached = this.urlCache.get(handle);
    if (cached) return cached;
    const file = await handle.getFile();
    const url = URL.createObjectURL(file);
    this.urlCache.set(handle, url);
    return url;
  }

  getCachedUrl(handle: FileSystemFileHandle): string | null {
    return this.urlCache.get(handle) ?? null;
  }

  revokeUrl(handle: FileSystemFileHandle): void {
    const url = this.urlCache.get(handle);
    if (url) {
      URL.revokeObjectURL(url);
      this.urlCache.delete(handle);
    }
  }

  async getAudioDuration(handle: FileSystemFileHandle): Promise<number> {
    const url = await this.createObjectUrl(handle);
    return new Promise(resolve => {
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration || 0);
      });
      audio.addEventListener('error', () => {
        resolve(0);
      });
      audio.src = url;
    });
  }
}
