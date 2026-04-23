import type { RepeatMode } from '../types';

interface RepeatButtonProps {
  repeat: RepeatMode;
  repeatCount: number;
  onClick: () => void;
}

export function RepeatButton({ repeat, repeatCount, onClick }: RepeatButtonProps) {
  const title =
    repeat === 'off'
      ? 'Repeat off'
      : repeat === 'all'
        ? 'Repeat all'
        : repeat === 'one'
          ? 'Repeat one'
          : `Repeat ${repeatCount}x`;

  return (
    <button
      onClick={onClick}
      className={`p-2 rounded hover:bg-gray-100 transition-colors ${repeat === 'off' ? 'text-gray-400' : 'text-blue-600'}`}
      title={title}
    >
      {repeat === 'one' ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 0.5 17.5 2.5 15 4.5" />
          <path d="M4 8V6a3.5 3.5 0 0 1 3.5-3.5H17" />
          <polyline points="9 19.5 6.5 21.5 9 23.5" />
          <path d="M20 16v2a3.5 3.5 0 0 1-3.5 3.5H7" />
          <text x="12" y="16" fontSize="10" fill="currentColor" stroke="none" textAnchor="middle">
            {'\u221E'}
          </text>
        </svg>
      ) : repeat === 'Nx' ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 0.5 17.5 2.5 15 4.5" />
          <path d="M4 8V6a3.5 3.5 0 0 1 3.5-3.5H17" />
          <polyline points="9 19.5 6.5 21.5 9 23.5" />
          <path d="M20 16v2a3.5 3.5 0 0 1-3.5 3.5H7" />
          <text
            x="12"
            y="15.5"
            fontSize={repeatCount >= 10 ? '7' : '9'}
            fill="currentColor"
            stroke="none"
            textAnchor="middle"
            fontWeight="bold"
          >
            {repeatCount}
          </text>
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
  );
}
