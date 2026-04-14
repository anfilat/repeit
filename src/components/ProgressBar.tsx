import { useRef, useCallback, useEffect, useState } from 'react';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ProgressBar({ currentTime, duration, onSeek }: ProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragTime, setDragTime] = useState<number | null>(null);

  const displayTime = dragging && dragTime !== null ? dragTime : currentTime;
  const progress = duration > 0 ? (displayTime / duration) * 100 : 0;

  const getTimeFromX = useCallback(
    (clientX: number) => {
      if (!barRef.current || duration === 0) return 0;
      const rect = barRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (duration === 0) return;
      onSeek(getTimeFromX(e.clientX));
    },
    [duration, onSeek, getTimeFromX]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);
      setDragTime(getTimeFromX(e.clientX));
    },
    [getTimeFromX]
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDragTime(getTimeFromX(e.clientX));
    };

    const handleMouseUp = (e: MouseEvent) => {
      const time = getTimeFromX(e.clientX);
      onSeek(time);
      setDragging(false);
      setDragTime(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, getTimeFromX, onSeek]);

  return (
    <div className="flex items-center gap-3 w-full">
      <span className="text-xs text-gray-500 w-10 text-right tabular-nums">{formatTime(displayTime)}</span>
      <div
        ref={barRef}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer relative"
      >
        <div className="h-full bg-blue-600 rounded-full relative" style={{ width: `${progress}%` }}>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-gray-900 rounded-full translate-x-1/2" />
        </div>
      </div>
      <span className="text-xs text-gray-500 w-10 tabular-nums">{formatTime(duration)}</span>
    </div>
  );
}
