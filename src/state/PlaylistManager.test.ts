import { describe, it, expect } from 'vitest';
import { PlaylistManager } from './PlaylistManager';
import type { Track } from '../types';

function createTrack(id: string): Track {
  return { id, name: `${id}.mp3`, duration: 180, fileId: `file-${id}` };
}

function createTrackNamed(name: string): Track {
  return { id: name, name, duration: 180, fileId: `file-${name}` };
}

describe('PlaylistManager', () => {
  const tracks = [createTrack('a'), createTrack('b'), createTrack('c')];

  it('initializes with empty state', () => {
    const pm = new PlaylistManager();
    expect(pm.state.tracks).toEqual([]);
    expect(pm.state.currentIndex).toBe(-1);
    expect(pm.state.repeat).toBe('off');
  });

  it('sets tracks and resets index', () => {
    const pm = new PlaylistManager();
    pm.setTracks(tracks);
    expect(pm.state.tracks).toEqual(tracks);
    expect(pm.state.currentIndex).toBe(0);
  });

  it('returns current track', () => {
    const pm = new PlaylistManager();
    pm.setTracks(tracks);
    expect(pm.currentTrack).toEqual(tracks[0]);
  });

  it('returns undefined currentTrack when empty', () => {
    const pm = new PlaylistManager();
    expect(pm.currentTrack).toBeUndefined();
  });

  it('advances to next track', () => {
    const pm = new PlaylistManager();
    pm.setTracks(tracks);
    pm.next();
    expect(pm.state.currentIndex).toBe(1);
  });

  it('goes to previous track', () => {
    const pm = new PlaylistManager();
    pm.setTracks(tracks);
    pm.next();
    pm.prev();
    expect(pm.state.currentIndex).toBe(0);
  });

  it('next beyond last wraps to first', () => {
    const pm = new PlaylistManager();
    pm.setTracks(tracks);
    pm.next();
    pm.next();
    const result = pm.next();
    expect(result).toEqual(tracks[0]);
    expect(pm.state.currentIndex).toBe(0);
  });

  it('prev before first wraps to last', () => {
    const pm = new PlaylistManager();
    pm.setTracks(tracks);
    const result = pm.prev();
    expect(result).toEqual(tracks[2]);
    expect(pm.state.currentIndex).toBe(2);
  });

  it('setCurrentIndex clamps to valid range', () => {
    const pm = new PlaylistManager();
    pm.setTracks(tracks);
    pm.setCurrentIndex(5);
    expect(pm.state.currentIndex).toBe(2);
    pm.setCurrentIndex(-1);
    expect(pm.state.currentIndex).toBe(0);
  });

  it('reorders tracks and adjusts currentIndex', () => {
    const pm = new PlaylistManager();
    pm.setTracks(tracks);
    pm.reorder(0, 2);
    expect(pm.state.tracks.map(t => t.id)).toEqual(['b', 'c', 'a']);
    expect(pm.state.currentIndex).toBe(2);
  });

  it('removes a track and adjusts index', () => {
    const pm = new PlaylistManager();
    pm.setTracks(tracks);
    pm.setCurrentIndex(1);
    pm.removeTrack('a');
    expect(pm.state.tracks).toHaveLength(2);
    expect(pm.state.currentIndex).toBe(0);
  });

  describe('autoAdvance', () => {
    it('with repeat off returns null at end', () => {
      const pm = new PlaylistManager();
      pm.setTracks(tracks);
      pm.next();
      pm.next();
      expect(pm.autoAdvance()).toBeNull();
      expect(pm.state.currentIndex).toBe(2);
    });

    it('with repeat all wraps to first', () => {
      const pm = new PlaylistManager();
      pm.setTracks(tracks);
      pm.setRepeat('all');
      pm.next();
      pm.next();
      expect(pm.autoAdvance()).toEqual(tracks[0]);
      expect(pm.state.currentIndex).toBe(0);
    });

    it('with repeat one returns same track', () => {
      const pm = new PlaylistManager();
      pm.setTracks(tracks);
      pm.setRepeat('one');
      expect(pm.autoAdvance()).toEqual(tracks[0]);
      expect(pm.state.currentIndex).toBe(0);
    });
  });

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
});
