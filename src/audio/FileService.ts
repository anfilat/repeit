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

  async decodeAudioFile(handle: FileSystemFileHandle, audioContext: AudioContext): Promise<AudioBuffer> {
    const file = await handle.getFile();
    const arrayBuffer = await file.arrayBuffer();
    return audioContext.decodeAudioData(arrayBuffer);
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
