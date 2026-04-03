import type { Track } from '../types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PlaylistItemProps {
  track: Track;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PlaylistItem({ track, isActive, onSelect, onRemove }: PlaylistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer group ${
        isActive ? 'bg-blue-600/20 text-blue-300' : 'hover:bg-white/5'
      }`}
      onClick={onSelect}
    >
      <button
        className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 px-1"
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
      <span className="flex-1 truncate text-sm">{track.name}</span>
      <span className="text-xs text-gray-400">{formatDuration(track.duration)}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="3" x2="11" y2="11" />
          <line x1="11" y1="3" x2="3" y2="11" />
        </svg>
      </button>
    </div>
  );
}
