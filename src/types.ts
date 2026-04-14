export interface Track {
  id: string;
  name: string;
  duration: number;
  fileId: string;
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

export interface FileMetadata {
  fileId: string;
  originalName: string;
  hash: string;
  size: number;
  duration: number;
}

export interface AddFileResult {
  fileId: string;
  duplicate: boolean;
  duration: number;
}

export interface LoadingState {
  isLoading: boolean;
  current: number;
  total: number;
}
