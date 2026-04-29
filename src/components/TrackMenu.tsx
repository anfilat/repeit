import { useState, useRef } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';

interface TrackMenuProps {
  onPlay: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function TrackMenu({ onPlay, onMoveUp, onMoveDown, onDelete, canMoveUp, canMoveDown }: TrackMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setOpen(false));

  const handleAction = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={e => {
          e.stopPropagation();
          setOpen(v => !v);
        }}
        className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg shadow-gray-300/50 py-1 min-w-[180px] z-50 border border-gray-200">
          <button
            onClick={e => {
              e.stopPropagation();
              handleAction(onPlay);
            }}
            className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-gray-100 transition-colors"
          >
            {'\u25B6'} Play
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              handleAction(onMoveUp);
            }}
            disabled={!canMoveUp}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            {'\u25B2'} Move Up
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              handleAction(onMoveDown);
            }}
            disabled={!canMoveDown}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            {'\u25BC'} Move Down
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              handleAction(onDelete);
            }}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors"
          >
            {'\uD83D\uDDD1'} Delete
          </button>
        </div>
      )}
    </div>
  );
}
