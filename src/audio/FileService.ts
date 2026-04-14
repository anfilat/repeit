import { naturalCompare } from '../utils/naturalSort';

const AUDIO_EXTENSIONS = ['.mp3', '.wav'];

export class FileService {
  filterAudioFiles(handles: FileSystemFileHandle[]): FileSystemFileHandle[] {
    return handles.filter(h => AUDIO_EXTENSIONS.some(ext => h.name.toLowerCase().endsWith(ext)));
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
}
