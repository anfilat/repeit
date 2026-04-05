# Playlist Menu & Natural Sort

## Context

The player footer has two standalone buttons (Add files, Clear all) that take up space and will grow as more actions are added. A sort feature is needed to order tracks with correct numeric handling (e.g., "Track 2" before "Track 100"). Consolidating all playlist actions into a dropdown menu keeps the footer clean and scalable.

## Design

### 1. `PlaylistMenu` component (`src/components/PlaylistMenu.tsx`)

Custom dropdown following the existing `TrackMenu.tsx` pattern:
- `useState` for open/close, `useRef` + click-outside handler
- Opens **upward** (`bottom-full mb-2`) since it's in the footer
- Trigger: vertical three-dot icon button (⋯)
- Three menu items:
  - **Add files** — plus icon, calls `onAddFiles`
  - **Sort** — sort ascending/descending icon, calls `onSort`
  - **Clear all** — trash icon, red/danger style, only shown when tracks exist

### 2. Natural sort utility (`src/utils/naturalSort.ts`)

A `naturalCompare(a: string, b: string): number` function that:
- Splits strings into alternating text/number segments
- Compares text segments lexicographically, number segments numerically
- Returns standard comparator result (-1, 0, 1)

Also exports `createNaturalSortComparator(trackKey: 'name')` for use with `Track[]`.

### 3. `PlaylistManager.sort()` method

```ts
sort(compareFn: (a: Track, b: Track) => number): void
```

- Sorts `this.state.tracks` in-place using the provided comparator
- Updates `currentIndex` to track the current track's new position (find by `id`)

### 4. Wiring in `App.tsx`

- Replace the right-side `<div>` (add button + clear button) with `<PlaylistMenu>`
- Add `handleSort` callback: calls `playlist.sort()` with natural sort comparator
- Pass handlers to `PlaylistMenu`: `onAddFiles`, `onSort`, `onClear`, `hasTracks`

### 5. Hook updates (`usePlaylist.ts`)

Add a `sort` method that wraps `PlaylistManager.sort()` and calls `sync()`.

## Tests

### `src/utils/naturalSort.test.ts` — unit tests for `naturalCompare`

Test cases:

- **Numbers at the end**: `["Track 2", "Track 100", "Track 1"]` → `["Track 1", "Track 2", "Track 100"]`
- **Numbers at the beginning**: `["2 Song", "100 Song", "1 Song"]` → `["1 Song", "2 Song", "100 Song"]`
- **Multiple numbers in name**: `["Chapter 1 Part 10", "Chapter 2 Part 1", "Chapter 1 Part 2"]` → `["Chapter 1 Part 2", "Chapter 1 Part 10", "Chapter 2 Part 1"]`
- **No numbers at all**: `["banana", "apple", "cherry"]` → `["apple", "banana", "cherry"]`
- **Equal strings**: `"Track 5"` vs `"Track 5"` → `0`
- **Numbers only**: `["10", "2", "1"]` → `["1", "2", "10"]`
- **Mixed leading zeros**: `["Track 01", "Track 1", "Track 001"]` → all equal (numeric value 1)
- **Empty strings**: `""` vs `""` → `0`, `""` vs `"a"` → negative
- **Single element / already sorted**: verify idempotent
- **Equal text, different numbers**: `["file-1", "file-10", "file-2"]` → `["file-1", "file-2", "file-10"]`

### `src/state/PlaylistManager.test.ts` — add tests for `sort()`

Add to existing test file:

- **Sort updates track order** — create 3 tracks out of order, sort, verify order
- **Sort tracks current track index** — set currentIndex to a track, sort, verify currentIndex points to same track at new position
- **Sort empty playlist** — no crash
- **Sort single track** — no crash, index stays 0

## Files to modify

| File | Change |
|------|--------|
| `src/components/PlaylistMenu.tsx` | **New** — dropdown menu component |
| `src/utils/naturalSort.ts` | **New** — natural sort utility |
| `src/utils/naturalSort.test.ts` | **New** — natural sort tests |
| `src/state/PlaylistManager.ts` | Add `sort()` method |
| `src/state/PlaylistManager.test.ts` | Add sort tests |
| `src/hooks/usePlaylist.ts` | Add `sort()` wrapper |
| `src/components/App.tsx` | Replace buttons with `PlaylistMenu`, add sort handler |

## Verification

1. `npx vitest run src/utils/naturalSort.test.ts` — all sort utility tests pass
2. `npx vitest run src/state/PlaylistManager.test.ts` — all sort + existing tests pass
3. Add tracks with numeric names and verify sort orders them correctly in the UI
4. Verify the dropdown opens upward, closes on click-outside
5. Verify Add files works from the menu
6. Verify Clear all works from the menu (with confirmation)
7. Verify currently playing track follows its new position after sort
8. Run `npm run lint:fix && npm run format && npm test`
