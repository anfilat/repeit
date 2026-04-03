import type { RepeatMode } from '../types';

interface PlayerControlsProps {
  isPlaying: boolean;
  repeat: RepeatMode;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onRepeat: () => void;
}

const repeatIcons: Record<RepeatMode, string> = {
  off: 'text-gray-500',
  all: 'text-blue-400',
  one: 'text-blue-400',
};

const repeatLabels: Record<RepeatMode, string> = {
  off: 'Repeat off',
  all: 'Repeat all',
  one: 'Repeat one',
};

export function PlayerControls({ isPlaying, repeat, onPlayPause, onNext, onPrev, onRepeat }: PlayerControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={onRepeat}
        className={`p-2 rounded hover:bg-white/10 transition-colors ${repeatIcons[repeat]}`}
        title={repeatLabels[repeat]}
      >
        {repeat === 'one' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            <text x="10" y="15" fontSize="7" fill="currentColor" stroke="none" textAnchor="middle">1</text>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        )}
      </button>

      <button
        onClick={onPrev}
        className="p-2 rounded hover:bg-white/10 transition-colors text-white"
        title="Previous"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="5" width="3" height="14" />
          <polygon points="21 5 10 12 21 19" />
        </svg>
      </button>

      <button
        onClick={onPlayPause}
        className="p-3 rounded-full bg-white text-black hover:bg-gray-200 transition-colors"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6 4 20 12 6 20" />
          </svg>
        )}
      </button>

      <button
        onClick={onNext}
        className="p-2 rounded hover:bg-white/10 transition-colors text-white"
        title="Next"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <rect x="18" y="5" width="3" height="14" />
          <polygon points="3 5 14 12 3 19" />
        </svg>
      </button>

      {/* Spacer to balance the repeat button */}
      <div className="w-9" />
    </div>
  );
}
