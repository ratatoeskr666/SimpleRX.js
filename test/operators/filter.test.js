import { describe, it, expect } from 'bun:test';
import { Event, Observable } from '../../src/index.js';

describe('Observable.filter', () => {
  it('should return an Event', () => {
    const o = new Observable(0);
    const filtered = o.filter(v => v > 0);
    expect(filtered).toBeInstanceOf(Event);
  });

  it('should only emit values that satisfy the predicate', () => {
    const o = new Observable(0);
    const received = [];
    o.filter(v => v % 2 === 0).subscribe(v => received.push(v));
    o.set(1);
    o.set(2);
    o.set(3);
    o.set(4);
    expect(received).toEqual([2, 4]);
  });

  it('should not fire subscriber immediately', () => {
    const o = new Observable(10);
    const received = [];
    o.filter(v => true).subscribe(v => received.push(v));
    expect(received).toEqual([]);
  });

  it('should drop all values when predicate always returns false', () => {
    const o = new Observable(0);
    const received = [];
    o.filter(() => false).subscribe(v => received.push(v));
    o.set(1);
    o.set(2);
    expect(received).toEqual([]);
  });
});

describe('Event.filter', () => {
  it('should filter values in a chain', () => {
    const o = new Observable(0);
    const received = [];
    o.map(v => v * 2).filter(v => v > 5).subscribe(v => received.push(v));
    o.set(1);  // mapped to 2, filtered out
    o.set(3);  // mapped to 6, passes
    o.set(2);  // mapped to 4, filtered out
    o.set(10); // mapped to 20, passes
    expect(received).toEqual([6, 20]);
  });

  it('should work with chained map after filter', () => {
    const o = new Observable(0);
    const received = [];
    o.map(v => v)
      .filter(v => v > 0)
      .map(v => v * 10)
      .subscribe(v => received.push(v));
    o.set(-1);
    o.set(3);
    o.set(0);
    o.set(5);
    expect(received).toEqual([30, 50]);
  });
});
