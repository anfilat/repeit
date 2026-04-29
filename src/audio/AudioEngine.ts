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
    if (this.audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return;
    await new Promise<void>((resolve, reject) => {
      const onCanPlay = () => {
        this.audio.removeEventListener('error', onError);
        resolve();
      };
      const onError = () => {
        this.audio.removeEventListener('canplay', onCanPlay);
        reject(new Error('Failed to load audio'));
      };
      this.audio.addEventListener('canplay', onCanPlay);
      this.audio.addEventListener('error', onError);
    });
  }

  async loadUrl(url: string): Promise<void> {
    this.setSrc(url);
    await this.waitForReady();
  }

  async play(): Promise<void> {
    try {
      await this.audio.play();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      throw err;
    }
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
