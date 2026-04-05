# Playlist Menu & Natural Sort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add natural sort for playlist tracks and consolidate playlist actions (add, sort, clear) into a single dropdown menu.

**Architecture:** New `naturalSort` utility with pure string comparison, `PlaylistManager.sort()` for state mutation, and a `PlaylistMenu` component following the existing `TrackMenu` pattern. TDD: tests first, then implementation.

**Tech Stack:** React, TypeScript, Vitest, Tailwind CSS

---

### Task 1: Natural sort utility — tests

**Files:**
- Create: `src/utils/naturalSort.test.ts`

- [ ] **Step 1: Write tests for naturalCompare**

```ts
import { describe, it, expect } from 'vitest';
import { naturalCompare } from './naturalSort';

describe('naturalCompare', () => {
  it('sorts numbers at end of name', () => {
    const input = ['Track 2', 'Track 100', 'Track 1'];
    const sorted = [...input].sort(naturalCompare);
    expect(sorted).toEqual(['Track 1', 'Track 2', 'Track 100']);
  });

  it('sorts numbers at beginning of name', () => {
    const input = ['2 Song', '100 Song', '1 Song'];
    const sorted = [...input].sort(naturalCompare);
    expect(sorted).toEqual(['1 Song', '2 Song', '100 Song']);
  });

  it('sorts with multiple numbers in name', () => {
    const input = ['Chapter 1 Part 10', 'Chapter 2 Part 1', 'Chapter 1 Part 2'];
    const sorted = [...input].sort(naturalCompare);
    expect(sorted).toEqual(['Chapter 1 Part 2', 'Chapter 1 Part 10', 'Chapter 2 Part 1']);
  });

  it('sorts pure text lexicographically', () => {
    const input = ['banana', 'apple', 'cherry'];
    const sorted = [...input].sort(naturalCompare);
    expect(sorted).toEqual(['apple', 'banana', 'cherry']);
  });

  it('returns 0 for equal strings', () => {
    expect(naturalCompare('Track 5', 'Track 5')).toBe(0);
  });

  it('sorts pure numbers', () => {
    const input = ['10', '2', '1'];
    const sorted = [...input].sort(naturalCompare);
    expect(sorted).toEqual(['1', '2', '10']);
  });

  it('treats leading zeros as equal numeric value', () => {
    expect(naturalCompare('Track 01', 'Track 1')).toBe(0);
    expect(naturalCompare('Track 001', 'Track 1')).toBe(0);
  });

  it('handles empty strings', () => {
    expect(naturalCompare('', '')).toBe(0);
    expect(naturalCompare('', 'a')).toBeLessThan(0);
    expect(naturalCompare('a', '')).toBeGreaterThan(0);
  });

  it('sorts files with dash separator', () => {
    const input = ['file-10', 'file-1', 'file-2'];
    const sorted = [...input].sort(naturalCompare);
    expect(sorted).toEqual(['file-1', 'file-2', 'file-10']);
  });

  it('is idempotent on already sorted input', () => {
    const input = ['Track 1', 'Track 2', 'Track 10'];
    const sorted = [...input].sort(naturalCompare);
    expect(sorted).toEqual(input);
  });

  it('sorts single element array', () => {
    const input = ['Solo'];
    const sorted = [...input].sort(naturalCompare);
    expect(sorted).toEqual(['Solo']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/naturalSort.test.ts`
Expected: FAIL — module `./naturalSort` not found

- [ ] **Step 3: Commit failing tests**

```bash
git add src/utils/naturalSort.test.ts
git commit -m "test: add naturalCompare test cases"
```

---

### Task 2: Natural sort utility — implementation

**Files:**
- Create: `src/utils/naturalSort.ts`

- [ ] **Step 1: Implement naturalCompare**

```ts
export function naturalCompare(a: string, b: string): number {
  const ax = a.split(/(\d+)/);
  const bx = b.split(/(\d+)/);

  for (let i = 0; i < Math.min(ax.length, bx.length); i++) {
    const aPart = ax[i];
    const bPart = bx[i];
    if (i % 2 === 0) {
      // Text segment — lexicographic
      const cmp = aPart.localeCompare(bPart);
      if (cmp !== 0) return cmp;
    } else {
      // Number segment — numeric
      const aNum = Number(aPart);
      const bNum = Number(bPart);
      if (aNum !== bNum) return aNum - bNum;
    }
  }
  return ax.length - bx.length;
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run src/utils/naturalSort.test.ts`
Expected: all PASS

- [ ] **Step 3: Commit**

```bash
git add src/utils/naturalSort.ts
git commit -m "feat: add naturalCompare utility"
```

---

### Task 3: PlaylistManager.sort() — tests

**Files:**
- Modify: `src/state/PlaylistManager.test.ts`

- [ ] **Step 1: Add sort tests to existing test file**

Append inside the `describe('PlaylistManager', ...)` block, after the existing `autoAdvance` describe:

```ts
function createTrackNamed(name: string): Track {
  return { id: name, name, duration: 180, handle: { kind: 'file', name: `${name}.mp3` } as FileSystemFileHandle };
}

describe('sort', () => {
  it('sorts tracks using comparator', () => {
    const pm = new PlaylistManager();
    const tracks = [createTrackNamed('Track 10'), createTrackNamed('Track 1'), createTrackNamed('Track 2')];
    pm.setTracks(tracks);
    pm.sort((a, b) => a.name.localeCompare(b.name));
    expect(pm.state.tracks.map(t => t.name)).toEqual(['Track 1', 'Track 10', 'Track 2']);
  });

  it('updates currentIndex to follow current track after sort', () => {
    const pm = new PlaylistManager();
    const tracks = [createTrackNamed('Track 10'), createTrackNamed('Track 1'), createTrackNamed('Track 2')];
    pm.setTracks(tracks);
    // currentIndex=0, which is "Track 10"
    expect(pm.state.tracks[pm.state.currentIndex].name).toBe('Track 10');
    pm.sort((a, b) => {
      const ax = a.name.split(/(\d+)/);
      const bx = b.name.split(/(\d+)/);
      for (let i = 0; i < Math.min(ax.length, bx.length); i++) {
        if (i % 2 === 0) {
          const cmp = ax[i].localeCompare(bx[i]);
          if (cmp !== 0) return cmp;
        } else {
          const diff = Number(ax[i]) - Number(bx[i]);
          if (diff !== 0) return diff;
        }
      }
      return ax.length - bx.length;
    });
    // After natural sort: [Track 1, Track 2, Track 10]
    // "Track 10" moved to index 2
    expect(pm.state.tracks.map(t => t.name)).toEqual(['Track 1', 'Track 2', 'Track 10']);
    expect(pm.state.currentIndex).toBe(2);
    expect(pm.state.tracks[pm.state.currentIndex].name).toBe('Track 10');
  });

  it('does not crash on empty playlist', () => {
    const pm = new PlaylistManager();
    pm.sort((a, b) => a.name.localeCompare(b.name));
    expect(pm.state.tracks).toEqual([]);
    expect(pm.state.currentIndex).toBe(-1);
  });

  it('does not crash on single track', () => {
    const pm = new PlaylistManager();
    pm.setTracks([createTrackNamed('Solo')]);
    pm.sort((a, b) => a.name.localeCompare(b.name));
    expect(pm.state.tracks.map(t => t.name)).toEqual(['Solo']);
    expect(pm.state.currentIndex).toBe(0);
  });
});
```

Note: The test uses an inline natural sort comparator so tests don't depend on the `naturalSort` module — `PlaylistManager.sort()` accepts any comparator.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/state/PlaylistManager.test.ts`
Expected: FAIL — `pm.sort is not a function`

- [ ] **Step 3: Commit failing tests**

```bash
git add src/state/PlaylistManager.test.ts
git commit -m "test: add PlaylistManager.sort() tests"
```

---

### Task 4: PlaylistManager.sort() — implementation

**Files:**
- Modify: `src/state/PlaylistManager.ts:55-69` (after `reorder` method)

- [ ] **Step 1: Add sort method to PlaylistManager**

Insert after the `reorder` method (after line 69):

```ts
sort(compareFn: (a: Track, b: Track) => number): void {
  const { tracks, currentIndex } = this.state;
  if (tracks.length <= 1) return;
  const currentId = currentIndex >= 0 ? tracks[currentIndex].id : undefined;
  tracks.sort(compareFn);
  if (currentId !== undefined) {
    this.state.currentIndex = tracks.findIndex(t => t.id === currentId);
  }
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run src/state/PlaylistManager.test.ts`
Expected: all PASS

- [ ] **Step 3: Commit**

```bash
git add src/state/PlaylistManager.ts
git commit -m "feat: add PlaylistManager.sort() method"
```

---

### Task 5: usePlaylist hook — add sort wrapper

**Files:**
- Modify: `src/hooks/usePlaylist.ts:71-77` (after `reorder` callback)

- [ ] **Step 1: Add import for naturalCompare**

At the top, add:

```ts
import { naturalCompare } from '../utils/naturalSort';
```

- [ ] **Step 2: Add sort callback after reorder**

Insert after the `reorder` callback:

```ts
const sortTracks = useCallback(() => {
  managerRef.current.sort((a, b) => naturalCompare(a.name, b.name));
  sync();
}, [sync]);
```

- [ ] **Step 3: Add sortTracks to return object**

Add `sortTracks` to the returned object (after `reorder`):

```ts
sortTracks,
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/usePlaylist.ts
git commit -m "feat: add sortTracks to usePlaylist hook"
```

---

### Task 6: PlaylistMenu component

**Files:**
- Create: `src/components/PlaylistMenu.tsx`

- [ ] **Step 1: Create PlaylistMenu component**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PlaylistMenu.tsx
git commit -m "feat: add PlaylistMenu dropdown component"
```

---

### Task 7: Wire PlaylistMenu into App

**Files:**
- Modify: `src/components/App.tsx:191-267` (footer section)

- [ ] **Step 1: Add import**

Add to imports at top:

```ts
import { PlaylistMenu } from './PlaylistMenu';
```

- [ ] **Step 2: Add handleSort callback**

After `handleClearPlaylist` (around line 177), add:

```ts
const handleSort = useCallback(() => {
  playlist.sortTracks();
}, [playlist]);
```

- [ ] **Step 3: Replace right-side buttons with PlaylistMenu**

Replace the `{/* Right: file actions */}` div (lines 240-266) with:

```tsx
{/* Right: playlist actions menu */}
<div className="min-w-[60px] flex justify-end">
  <PlaylistMenu
    onAddFiles={handleSelectFiles}
    onSort={handleSort}
    onClear={() => {
      if (confirm('Clear all tracks?')) handleClearPlaylist();
    }}
    hasTracks={playlist.state.tracks.length > 0}
  />
</div>
```

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: all PASS

- [ ] **Step 5: Run lint and format**

Run: `npm run lint:fix && npm run format`

- [ ] **Step 6: Commit**

```bash
git add src/components/App.tsx
git commit -m "feat: wire PlaylistMenu into footer, add sort action"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: all PASS

- [ ] **Step 2: Run lint check**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 3: Run format check**

Run: `npm run format:check`
Expected: no errors

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: successful build
