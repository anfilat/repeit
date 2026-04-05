export class AudioEngine {
  private ctx: AudioContext;
  private sourceNode: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  private _isPlaying = false;
  private startContextTime = 0;
  private offset = 0;
  public onTrackEnd: (() => void) | null = null;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }
  get duration(): number {
    return this.buffer?.duration ?? 0;
  }
  get currentTime(): number {
    if (this._isPlaying) return this.offset + (this.ctx.currentTime - this.startContextTime);
    return this.offset;
  }

  async loadBuffer(buffer: AudioBuffer): Promise<void> {
    this.stop();
    this.buffer = buffer;
  }

  play(): void {
    if (!this.buffer || this._isPlaying) return;
    this._createSource(this.offset);
    this._isPlaying = true;
  }

  pause(): void {
    if (!this._isPlaying) return;
    this.offset = this.currentTime;
    this._stopSource();
    this._isPlaying = false;
  }

  seek(time: number): void {
    const wasPlaying = this._isPlaying;
    this._stopSource();
    this.offset = Math.max(0, Math.min(time, this.duration));
    this._isPlaying = false;
    if (wasPlaying) {
      this._createSource(this.offset);
      this._isPlaying = true;
    }
  }

  stop(): void {
    this._stopSource();
    this._isPlaying = false;
    this.offset = 0;
  }

  private _createSource(startOffset: number): void {
    if (!this.buffer) return;
    this.sourceNode = this.ctx.createBufferSource();
    this.sourceNode.buffer = this.buffer;
    this.sourceNode.connect(this.ctx.destination);
    this.sourceNode.onended = () => {
      if (this._isPlaying) {
        this._isPlaying = false;
        this.offset = 0;
        this.onTrackEnd?.();
      }
    };
    this.startContextTime = this.ctx.currentTime;
    this.sourceNode.start(0, startOffset);
  }

  private _stopSource(): void {
    if (this.sourceNode) {
      this.sourceNode.onended = null;
      try {
        this.sourceNode.stop();
      } catch {
        /* already stopped */
      }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
  }
}
