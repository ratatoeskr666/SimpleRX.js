import { describe, it, expect } from 'bun:test';
import { Observable } from '../src/index.js';

describe('Observable — raceEvent / combineEvent / waitForEvent', () => {
  describe('raceEvent on Observable', () => {
    it('first Observable emission wins', () => {
      const a = new Observable(0);
      const b = new Observable(0);
      const eventA = a.map(v => v);
      const eventB = b.map(v => v);
      const raced = eventA.raceEvent(eventB);
      const values = [];
      raced.subscribe(v => values.push(v));

      a.set(1);
      b.set(2);
      a.set(3);

      expect(values).toEqual([1, 3]);
    });
  });

  describe('combineEvent on Observable', () => {
    it('emits tuple once both sources fired', () => {
      const a = new Observable(0);
      const b = new Observable(0);
      const eventA = a.map(v => v);
      const eventB = b.map(v => v);
      const combined = eventA.combineEvent(eventB);
      const values = [];
      combined.subscribe(v => values.push(v));

      a.set(1);     // eventA has 1, eventB has nothing yet
      b.set(10);    // now both have emitted → [1, 10]
      a.set(2);     // update A → [2, 10]

      expect(values).toEqual([[1, 10], [2, 10]]);
    });
  });

  describe('waitForEvent on Observable', () => {
    it('buffers latest and emits on gate', () => {
      const source = new Observable(0);
      const gate = new Observable(0);
      const sourceEvent = source.map(v => v);
      const gateEvent = gate.map(v => v);
      const waiting = sourceEvent.waitForEvent(gateEvent);
      const values = [];
      waiting.subscribe(v => values.push(v));

      source.set(1);
      source.set(2);   // overwrites buffer
      gate.set(true);   // gate fires → emits 2

      expect(values).toEqual([2]);
    });
  });
});
