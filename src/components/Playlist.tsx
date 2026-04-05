import type { Track } from '../types';
import { PlaylistItem } from './PlaylistItem';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface PlaylistProps {
  tracks: Track[];
  currentIndex: number;
  onSelectTrack: (index: number) => void;
  onRemoveTrack: (trackId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onClear: () => void;
}

export function Playlist({ tracks, currentIndex, onSelectTrack, onRemoveTrack, onReorder, onClear }: PlaylistProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromIndex = tracks.findIndex(t => t.id === active.id);
    const toIndex = tracks.findIndex(t => t.id === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      onReorder(fromIndex, toIndex);
    }
  };

  if (tracks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        No tracks loaded. Select files to begin.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between px-3 py-1 border-b border-gray-800">
        <span className="text-xs text-gray-400">
          {tracks.length} track{tracks.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => {
            if (confirm('Clear all tracks?')) onClear();
          }}
          className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-0.5"
        >
          Clear all
        </button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tracks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1 p-2">
            {tracks.map((track, index) => (
              <PlaylistItem
                key={track.id}
                track={track}
                isActive={index === currentIndex}
                onSelect={() => onSelectTrack(index)}
                onRemove={() => onRemoveTrack(track.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
