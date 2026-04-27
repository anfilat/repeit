import { useState, useEffect, useRef } from 'react';

interface PlaylistMenuProps {
  onAddFiles: () => void;
  onAddFolder: () => void;
  onSort: () => void;
  onShuffle: () => void;
  onClear: () => void;
  onSetRepeatCount: () => void;
  hasTracks: boolean;
}

export function PlaylistMenu({
  onAddFiles,
  onAddFolder,
  onSort,
  onShuffle,
  onClear,
  onSetRepeatCount,
  hasTracks,
}: PlaylistMenuProps) {
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
        className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
        title="Playlist actions"
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="4" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="12" cy="8" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-2 bg-white rounded-lg shadow-lg shadow-gray-300/50 py-1 min-w-[180px] z-50 border border-gray-200">
          <button
            onClick={() => handleAction(onAddFiles)}
            className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-gray-100 transition-colors"
          >
            <span className="inline-block w-5 text-center">{'\uFF0B'}</span> Add files
          </button>
          <button
            onClick={() => handleAction(onAddFolder)}
            className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-gray-100 transition-colors"
          >
            <span className="inline-block w-5 text-center">{'\uD83D\uDCC2'}</span> Add folder
          </button>
          <button
            onClick={() => handleAction(onSort)}
            disabled={!hasTracks}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <span className="inline-block w-5 text-center">{'\u2195'}</span> Sort
          </button>
          <button
            onClick={() => handleAction(onShuffle)}
            disabled={!hasTracks}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <span className="inline-block w-5 text-center">
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 4h3l3 4-3 4H2" />
                <path d="M14 4h-3L8 8l3 4h3" />
                <path d="M12 2l2 2-2 2" />
                <path d="M12 10l2 2-2 2" />
              </svg>
            </span>{' '}
            Shuffle
          </button>
          <button
            onClick={() => handleAction(onClear)}
            disabled={!hasTracks}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <span className="inline-block w-5 text-center">{'\uD83D\uDDD1'}</span> Clear all
          </button>
          <div className="border-t border-gray-200 my-1" />
          <button
            onClick={() => handleAction(onSetRepeatCount)}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <span className="inline-block w-5 text-center">{'\uD83D\uDD00'}</span> Repeat count
          </button>
        </div>
      )}
    </div>
  );
}
