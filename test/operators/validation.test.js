import { describe, it, expect } from 'bun:test';
import { Observable } from '../../src/index.js';

describe('input validation', () => {
  describe('takeAndDispose', () => {
    it('throws on count = 0', () => {
      const obs = new Observable(0);
      expect(() => obs.takeAndDispose(0)).toThrow(RangeError);
    });

    it('throws on negative count', () => {
      const obs = new Observable(0);
      expect(() => obs.takeAndDispose(-1)).toThrow(RangeError);
    });

    it('throws on non-integer count', () => {
      const obs = new Observable(0);
      expect(() => obs.takeAndDispose(1.5)).toThrow(RangeError);
    });
  });

  describe('skipFirst', () => {
    it('throws on negative count', () => {
      const obs = new Observable(0);
      expect(() => obs.skipFirst(-1)).toThrow(RangeError);
    });

    it('allows count = 0', () => {
      const obs = new Observable(0);
      expect(() => obs.skipFirst(0)).not.toThrow();
    });

    it('throws on non-integer count', () => {
      const obs = new Observable(0);
      expect(() => obs.skipFirst(1.5)).toThrow(RangeError);
    });
  });

  describe('debounce', () => {
    it('throws on negative ms', () => {
      const obs = new Observable(0);
      expect(() => obs.debounce(-10)).toThrow(RangeError);
    });

    it('allows ms = 0', () => {
      const obs = new Observable(0);
      expect(() => obs.debounce(0)).not.toThrow();
    });
  });

  describe('debounceAndDispose', () => {
    it('throws on negative ms', () => {
      const obs = new Observable(0);
      expect(() => obs.debounceAndDispose(-10)).toThrow(RangeError);
    });

    it('allows ms = 0', () => {
      const obs = new Observable(0);
      expect(() => obs.debounceAndDispose(0)).not.toThrow();
    });
  });
});
