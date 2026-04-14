interface PlayerControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export function PlayerControls({ isPlaying, onPlayPause, onNext, onPrev }: PlayerControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={onPrev}
        className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-700"
        title="Previous"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="5" width="3" height="14" />
          <polygon points="21 5 10 12 21 19" />
        </svg>
      </button>

      <button
        onClick={onPlayPause}
        className="p-3 rounded-full bg-gray-900 text-white hover:bg-gray-700 transition-colors"
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

      <button onClick={onNext} className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-700" title="Next">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <rect x="18" y="5" width="3" height="14" />
          <polygon points="3 5 14 12 3 19" />
        </svg>
      </button>
    </div>
  );
}
