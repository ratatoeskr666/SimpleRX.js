import { describe, it, expect } from 'bun:test';
import { Observable } from '../../src/index.js';

describe('distinctUntilChanged', () => {
  it('returns an Event', () => {
    const obs = new Observable(0);
    const event = obs.distinctUntilChanged();
    expect(event.constructor.name).toBe('Event');
  });

  it('suppresses consecutive duplicate values', () => {
    const obs = new Observable(0);
    const values = [];
    obs.distinctUntilChanged().subscribe(v => values.push(v));
    obs.set(1);
    obs.set(1);
    obs.set(2);
    obs.set(2);
    obs.set(3);
    expect(values).toEqual([1, 2, 3]);
  });

  it('allows non-consecutive duplicates', () => {
    const obs = new Observable(0);
    const values = [];
    obs.distinctUntilChanged().subscribe(v => values.push(v));
    obs.set(1);
    obs.set(2);
    obs.set(1);
    expect(values).toEqual([1, 2, 1]);
  });

  it('accepts a custom comparator', () => {
    const obs = new Observable({ id: 0 });
    const values = [];
    obs.distinctUntilChanged((a, b) => a.id === b.id)
      .subscribe(v => values.push(v));
    obs.set({ id: 1 });  // first emission: id 1 (no previous → emits)
    obs.set({ id: 1 });  // same id → suppressed
    obs.set({ id: 2 });  // different id → emits
    obs.set({ id: 2 });  // same id → suppressed
    expect(values).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('works on Event chains', () => {
    const obs = new Observable(0);
    const values = [];
    obs.map(v => Math.floor(v / 2))
      .distinctUntilChanged()
      .subscribe(v => values.push(v));
    obs.set(1); // floor(1/2) = 0 — same as initial push through map (floor(0/2)=0), suppressed
    obs.set(2); // floor(2/2) = 1
    obs.set(3); // floor(3/2) = 1, suppressed
    obs.set(4); // floor(4/2) = 2
    expect(values).toEqual([0, 1, 2]);
  });

  it('does not fire immediately (Event semantics)', () => {
    const obs = new Observable(5);
    const values = [];
    obs.distinctUntilChanged().subscribe(v => values.push(v));
    expect(values).toEqual([]);
  });
});
