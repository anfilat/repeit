import { describe, it, expect } from 'vitest';
import { PlaylistManager } from './PlaylistManager';
import type { Track } from '../types';

function createTrack(id: string): Track {
  return { id, name: `${id}.mp3`, duration: 180, handle: { kind: 'file', name: `${id}.mp3` } as FileSystemFileHandle };
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
});
