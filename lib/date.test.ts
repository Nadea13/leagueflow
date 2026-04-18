import { describe, it, expect } from 'vitest';
import { formatDate } from './date';

describe('formatDate', () => {
  const testDate = new Date('2024-04-17T12:00:00Z');

  describe('English (en) locale', () => {
    it('formats date correctly in default format', () => {
      const result = formatDate(testDate, 'd MMMM yyyy', 'en');
      expect(result).toBe('17 April 2024');
    });

    it('formats date with custom format string', () => {
      const result = formatDate(testDate, 'yyyy-MM-dd', 'en');
      expect(result).toBe('2024-04-17');
    });

    it('handles short month names', () => {
      const result = formatDate(testDate, 'd MMM yy', 'en');
      expect(result).toBe('17 Apr 24');
    });
  });

  describe('Thai (th) locale', () => {
    it('formats date in Buddhist Era (BE)', () => {
      const result = formatDate(testDate, 'd MMMM yyyy', 'th');
      // Thai Buddhist Year = Gregorian + 543 -> 2024 + 543 = 2567
      // Intl.DateTimeFormat output might vary slightly by environment but generally:
      expect(result).toContain('2567');
      expect(result).toContain('เมษายน');
    });

    it('formats date with weekday and month', () => {
      const result = formatDate(testDate, 'EEEE d MMMM yyyy', 'th');
      expect(result).toContain('พุธ');
      expect(result).toContain('2567');
    });

    it('handles time formatting', () => {
      const result = formatDate(testDate, 'd MMMM yyyy HH:mm', 'th');
      expect(result).toContain('19:00'); // 12:00 UTC + 7 (TH Time) = 19:00
    });
  });

  describe('Edge Cases', () => {
    it('returns empty string for null date', () => {
      expect(formatDate(null)).toBe('');
    });

    it('returns empty string for undefined date', () => {
      expect(formatDate(undefined)).toBe('');
    });

    it('returns empty string for invalid date string', () => {
      expect(formatDate('invalid-date')).toBe('');
    });
  });
});
