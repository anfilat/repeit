import { useRef, useCallback } from 'react';

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
}

export function VolumeControl({ volume, onVolumeChange }: VolumeControlProps) {
  const barRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onVolumeChange(ratio);
  }, [onVolumeChange]);

  return (
    <div className="flex items-center gap-2">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-gray-400"
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        {volume > 0 && (
          volume > 0.5 ? (
            <>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </>
          ) : (
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          )
        )}
      </svg>
      <div
        ref={barRef}
        onClick={handleClick}
        className="w-24 h-1.5 bg-gray-700 rounded-full cursor-pointer relative group"
      >
        <div
          className="h-full bg-gray-400 rounded-full relative"
          style={{ width: `${volume * 100}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
}
