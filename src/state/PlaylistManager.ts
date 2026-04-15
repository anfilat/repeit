import type { Track, RepeatMode, PlaylistState } from '../types';

export class PlaylistManager {
  public state: PlaylistState = { tracks: [], currentIndex: -1, repeat: 'off', repeatCount: 20 };
  private playCount = 0;

  get currentTrack(): Track | undefined {
    const { currentIndex, tracks } = this.state;
    return currentIndex >= 0 && currentIndex < tracks.length ? tracks[currentIndex] : undefined;
  }

  setTracks(tracks: Track[]): void {
    this.state.tracks = [...tracks];
    this.state.currentIndex = tracks.length > 0 ? 0 : -1;
  }

  setRepeat(mode: RepeatMode): void {
    this.state.repeat = mode;
    this.playCount = 0;
  }

  setRepeatCount(count: number): void {
    this.state.repeatCount = count;
    this.playCount = 0;
  }

  setCurrentIndex(index: number): void {
    this.state.currentIndex = Math.max(0, Math.min(index, this.state.tracks.length - 1));
    this.playCount = 0;
  }

  next(): Track | null {
    const { tracks } = this.state;
    if (tracks.length === 0) return null;
    const nextIndex = (this.state.currentIndex + 1) % tracks.length;
    this.state.currentIndex = nextIndex;
    return tracks[nextIndex];
  }

  prev(): Track | null {
    const { tracks, currentIndex } = this.state;
    if (tracks.length === 0) return null;
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    this.state.currentIndex = prevIndex;
    return tracks[prevIndex];
  }

  autoAdvance(): Track | null {
    const { tracks, currentIndex, repeat, repeatCount } = this.state;
    if (tracks.length === 0) return null;
    if (repeat === 'one') return tracks[currentIndex] ?? null;
    if (repeat === 'Nx') {
      this.playCount++;
      if (this.playCount < repeatCount) return tracks[currentIndex] ?? null;
      this.playCount = 0;
    }
    const nextIndex = currentIndex + 1;
    if (nextIndex >= tracks.length) {
      if (repeat === 'all' || repeat === 'Nx') {
        this.state.currentIndex = 0;
        return tracks[0];
      }
      return null;
    }
    this.state.currentIndex = nextIndex;
    return tracks[nextIndex];
  }

  reorder(fromIndex: number, toIndex: number): void {
    const { tracks, currentIndex } = this.state;
    const movedTrack = tracks[fromIndex];
    const isCurrentMoving = fromIndex === currentIndex;
    tracks.splice(fromIndex, 1);
    tracks.splice(toIndex, 0, movedTrack);
    if (isCurrentMoving) {
      this.state.currentIndex = toIndex;
    } else if (fromIndex < currentIndex && toIndex >= currentIndex) {
      this.state.currentIndex = currentIndex - 1;
    } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
      this.state.currentIndex = currentIndex + 1;
    }
  }

  clear(): void {
    this.state.tracks = [];
    this.state.currentIndex = -1;
  }

  removeTrack(trackId: string): void {
    const index = this.state.tracks.findIndex(t => t.id === trackId);
    if (index === -1) return;
    this.state.tracks.splice(index, 1);
    if (this.state.tracks.length === 0) {
      this.state.currentIndex = -1;
    } else if (index <= this.state.currentIndex) {
      this.state.currentIndex = Math.max(0, this.state.currentIndex - 1);
    }
  }

  sort(compareFn: (a: Track, b: Track) => number): void {
    const { tracks, currentIndex } = this.state;
    if (tracks.length <= 1) return;
    const currentId = currentIndex >= 0 ? tracks[currentIndex].id : undefined;
    tracks.sort(compareFn);
    if (currentId !== undefined) {
      this.state.currentIndex = tracks.findIndex(t => t.id === currentId);
    }
  }
}
