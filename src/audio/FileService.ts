const AUDIO_EXTENSIONS = ['.mp3', '.wav'];

export class FileService {
  filterAudioFiles(handles: FileSystemFileHandle[]): FileSystemFileHandle[] {
    return handles.filter(h => AUDIO_EXTENSIONS.some(ext => h.name.toLowerCase().endsWith(ext)));
  }

  async requestPermission(handle: FileSystemFileHandle): Promise<boolean> {
    const opts = { mode: 'read' } as PermissionDescriptor;
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
    return audioHandles;
  }

  async decodeAudioFile(handle: FileSystemFileHandle, audioContext: AudioContext): Promise<AudioBuffer> {
    const file = await handle.getFile();
    const arrayBuffer = await file.arrayBuffer();
    return audioContext.decodeAudioData(arrayBuffer);
  }
}
