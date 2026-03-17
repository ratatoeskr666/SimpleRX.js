import { describe, it, expect } from 'bun:test';
import { Event, Observable } from '../../src/index.js';

describe('Observable.execute', () => {
  it('should return an Event', () => {
    const o = new Observable(0);
    const tapped = o.execute(() => {});
    expect(tapped).toBeInstanceOf(Event);
  });

  it('should run the side-effect for each value', () => {
    const o = new Observable(0);
    const sideEffects = [];
    o.execute(v => sideEffects.push(v)).subscribe(() => {});
    o.set(1);
    o.set(2);
    expect(sideEffects).toEqual([1, 2]);
  });

  it('should pass the value through unchanged', () => {
    const o = new Observable(0);
    const received = [];
    o.execute(() => {}).subscribe(v => received.push(v));
    o.set(42);
    o.set(99);
    expect(received).toEqual([42, 99]);
  });

  it('should not fire immediately', () => {
    const o = new Observable(10);
    const sideEffects = [];
    o.execute(v => sideEffects.push(v)).subscribe(() => {});
    expect(sideEffects).toEqual([]);
  });
});

describe('Event.execute', () => {
  it('should run side-effect in a chain without altering values', () => {
    const o = new Observable(0);
    const sideEffects = [];
    const received = [];
    o.map(v => v * 2)
      .execute(v => sideEffects.push(v))
      .map(v => v + 1)
      .subscribe(v => received.push(v));
    o.set(3);
    o.set(5);
    expect(sideEffects).toEqual([6, 10]);
    expect(received).toEqual([7, 11]);
  });
});
