import { describe, it, expect } from 'vitest';
import { validateAmount, sanitizeNote } from '../validation';

describe('validation utils', () => {
  describe('validateAmount', () => {
    it('accepts positive numeric amounts', () => {
      const result = validateAmount(45.5);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedAmount).toBe(45.5);
    });

    it('rejects 0, negative amounts, and NaN', () => {
      expect(validateAmount(0).isValid).toBe(false);
      expect(validateAmount(-15).isValid).toBe(false);
      expect(validateAmount(NaN).isValid).toBe(false);
    });

    it('clamps to maximum allowed amount', () => {
      const huge = 100_000_001;
      const result = validateAmount(huge);
      expect(result.isValid).toBe(false);
      expect(result.sanitizedAmount).toBe(100_000_000);
    });

    it('rounds to 2 decimal places', () => {
      const result = validateAmount(12.3456);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedAmount).toBe(12.35);
    });
  });

  describe('sanitizeNote', () => {
    it('strips unsafe script tags and excess whitespace', () => {
      const raw = '  Coffee at Starbucks <script>alert("xss")</script>  ';
      const clean = sanitizeNote(raw);
      expect(clean).toBe('Coffee at Starbucks');
    });

    it('truncates notes longer than 140 characters', () => {
      const longNote = 'A'.repeat(300);
      const clean = sanitizeNote(longNote);
      expect(clean.length).toBe(140);
    });

    it('returns empty string for nullish or undefined notes', () => {
      expect(sanitizeNote(undefined)).toBe('');
      expect(sanitizeNote('')).toBe('');
    });
  });
});
