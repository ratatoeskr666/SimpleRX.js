import { describe, it, expect } from 'bun:test';
import { Observable, mergeEvents } from '../../src/index.js';

describe('mergeEvents', () => {
  it('returns { event, dispose }', () => {
    const a = new Observable(0);
    const b = new Observable(0);
    const result = mergeEvents(a.map(v => v), b.map(v => v));
    expect(result.event).toBeDefined();
    expect(typeof result.dispose).toBe('function');
    result.dispose();
  });

  it('emits from any source', () => {
    const a = new Observable(0);
    const b = new Observable(0);
    const eA = a.map(v => `a:${v}`);
    const eB = b.map(v => `b:${v}`);
    const { event, dispose } = mergeEvents(eA, eB);
    const values = [];
    event.subscribe(v => values.push(v));

    a.set(1);
    b.set(2);
    a.set(3);

    expect(values).toEqual(['a:1', 'b:2', 'a:3']);
    dispose();
  });

  it('supports 3+ events', () => {
    const a = new Observable(0);
    const b = new Observable(0);
    const c = new Observable(0);
    const { event, dispose } = mergeEvents(
      a.map(v => v), b.map(v => v), c.map(v => v)
    );
    const values = [];
    event.subscribe(v => values.push(v));

    a.set(1);
    b.set(2);
    c.set(3);

    expect(values).toEqual([1, 2, 3]);
    dispose();
  });

  it('stops emitting after dispose', () => {
    const a = new Observable(0);
    const b = new Observable(0);
    const { event, dispose } = mergeEvents(a.map(v => v), b.map(v => v));
    const values = [];
    event.subscribe(v => values.push(v));

    a.set(1);
    dispose();
    a.set(2);
    b.set(3);

    expect(values).toEqual([1]);
  });

  it('throws if fewer than 2 events provided', () => {
    const a = new Observable(0);
    expect(() => mergeEvents(a.map(v => v))).toThrow(RangeError);
    expect(() => mergeEvents()).toThrow(RangeError);
  });
});
