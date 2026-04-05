import { useState, useEffect, useRef } from 'react';

interface PlaylistMenuProps {
  onAddFiles: () => void;
  onSort: () => void;
  onClear: () => void;
  hasTracks: boolean;
}

export function PlaylistMenu({ onAddFiles, onSort, onClear, hasTracks }: PlaylistMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  const handleAction = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="p-2 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
        title="Playlist actions"
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="4" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="12" cy="8" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-2 bg-gray-800 rounded-lg shadow-lg shadow-black/50 py-1 min-w-[180px] z-50">
          <button
            onClick={() => handleAction(onAddFiles)}
            className="w-full text-left px-3 py-2 text-sm text-blue-400 hover:bg-white/5 transition-colors"
          >
            {'\uFF0B'} Add files
          </button>
          <button
            onClick={() => handleAction(onSort)}
            disabled={!hasTracks}
            className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            {'\u2195'} Sort
          </button>
          {hasTracks && (
            <button
              onClick={() => handleAction(onClear)}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors"
            >
              {'\uD83D\uDDD1'} Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
