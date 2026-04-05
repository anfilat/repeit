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
