import { useState, useEffect, useRef, useCallback } from 'react';
import type { Track } from '../types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TrackMenu } from './TrackMenu';

function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(() => window.matchMedia('(pointer: coarse)').matches);
  useEffect(() => {
    const mql = window.matchMedia('(pointer: coarse)');
    const handler = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isTouch;
}

interface PlaylistItemProps {
  track: Track;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PlaylistItem({
  track,
  isActive,
  onSelect,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: PlaylistItemProps) {
  const isTouchDevice = useIsTouchDevice();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: track.id });

  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      scrollRef.current = node;
      setNodeRef(node);
    },
    [setNodeRef]
  );

  useEffect(() => {
    if (isActive) {
      scrollRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isActive]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={ref}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer group ${
        isActive ? 'bg-blue-600/10 text-blue-700' : 'hover:bg-gray-100'
      }`}
      onDoubleClick={onSelect}
    >
      {!isTouchDevice && (
        <button
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 px-1"
          {...attributes}
          {...listeners}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="3" cy="3" r="1.5" />
            <circle cx="9" cy="3" r="1.5" />
            <circle cx="3" cy="9" r="1.5" />
            <circle cx="9" cy="9" r="1.5" />
          </svg>
        </button>
      )}
      <span className="flex-1 truncate text-sm">{track.name}</span>
      <span className="text-xs text-gray-500">{formatDuration(track.duration)}</span>
      <TrackMenu
        onPlay={onSelect}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onDelete={onRemove}
        canMoveUp={!isFirst}
        canMoveDown={!isLast}
      />
    </div>
  );
}
