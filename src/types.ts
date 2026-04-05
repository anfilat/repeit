export interface Track {
  id: string;
  name: string;
  duration: number;
  handle: FileSystemFileHandle;
  audioBuffer?: AudioBuffer;
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface PlaylistState {
  tracks: Track[];
  currentIndex: number;
  repeat: RepeatMode;
}

export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}
