import { describe, it, expect } from 'bun:test';
import { Event, Observable } from '../../src/index.js';

describe('Observable.takeAndDispose', () => {
  it('should return an Event', () => {
    const o = new Observable(0);
    expect(o.takeAndDispose(3)).toBeInstanceOf(Event);
  });

  it('should take exactly N values then stop', () => {
    const o = new Observable(0);
    const received = [];
    o.takeAndDispose(3).subscribe(v => received.push(v));
    o.set(1);
    o.set(2);
    o.set(3);
    o.set(4);
    o.set(5);
    expect(received).toEqual([1, 2, 3]);
  });

  it('should auto-dispose the chain after N emissions', () => {
    const o = new Observable(0);
    const taken = o.takeAndDispose(2);
    taken.subscribe(() => {});

    expect(o._node._children.size).toBe(1);
    o.set(1);
    o.set(2); // triggers dispose
    expect(o._node._children.size).toBe(0);
  });

  it('should work with count=1 (single-shot)', () => {
    const o = new Observable(0);
    const received = [];
    o.takeAndDispose(1).subscribe(v => received.push(v));
    o.set(42);
    o.set(99);
    expect(received).toEqual([42]);
  });
});

describe('Event.takeAndDispose', () => {
  it('should work in a chain', () => {
    const o = new Observable(0);
    const received = [];
    o.map(v => v * 2).takeAndDispose(2).subscribe(v => received.push(v));
    o.set(1);
    o.set(2);
    o.set(3);
    expect(received).toEqual([2, 4]);
  });

  it('should cascade dispose through the chain', () => {
    const o = new Observable(0);
    const mapped = o.map(v => v);
    const taken = mapped.takeAndDispose(1);
    taken.subscribe(() => {});

    o.set(1); // take 1 then dispose
    // Entire chain detached from source
    expect(o._node._children.size).toBe(0);
  });
});
