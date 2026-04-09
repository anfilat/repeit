import { naturalCompare } from '../utils/naturalSort';

const AUDIO_EXTENSIONS = ['.mp3', '.wav'];

export class FileService {
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
    const file = await handle.getFile();
    return URL.createObjectURL(file);
  }

  async getAudioDuration(handle: FileSystemFileHandle): Promise<number> {
    const file = await handle.getFile();
    const url = URL.createObjectURL(file);
    return new Promise(resolve => {
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration || 0);
      });
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        resolve(0);
      });
      audio.src = url;
    });
  }
}
