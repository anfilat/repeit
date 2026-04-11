export class AudioEngine {
  private audio: HTMLAudioElement;
  public onTrackEnd: (() => void) | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.addEventListener('ended', () => {
      this.onTrackEnd?.();
    });
  }

  get isPlaying(): boolean {
    return !this.audio.paused;
  }
  get duration(): number {
    return this.audio.duration || 0;
  }
  get currentTime(): number {
    return this.audio.currentTime;
  }

  setSrc(url: string): void {
    this.audio.src = url;
  }

  async waitForReady(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.audio.oncanplay = () => resolve();
      this.audio.onerror = () => reject(new Error('Failed to load audio'));
    });
  }

  async loadUrl(url: string): Promise<void> {
    this.setSrc(url);
    await this.waitForReady();
  }

  async play(): Promise<void> {
    await this.audio.play();
  }

  pause(): void {
    this.audio.pause();
  }

  seek(time: number): void {
    this.audio.currentTime = Math.max(0, Math.min(time, this.duration));
  }

  stop(): void {
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
  }
}
