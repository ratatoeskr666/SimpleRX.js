import { describe, it, expect } from 'bun:test';
import { Event, Observable } from '../../src/index.js';

describe('Observable.skipFirst', () => {
  it('should return an Event', () => {
    const o = new Observable(0);
    expect(o.skipFirst(1)).toBeInstanceOf(Event);
  });

  it('should skip the first N values', () => {
    const o = new Observable(0);
    const received = [];
    o.skipFirst(2).subscribe(v => received.push(v));
    o.set(1);
    o.set(2);
    o.set(3);
    o.set(4);
    expect(received).toEqual([3, 4]);
  });

  it('should pass everything with count=0', () => {
    const o = new Observable(0);
    const received = [];
    o.skipFirst(0).subscribe(v => received.push(v));
    o.set(1);
    o.set(2);
    expect(received).toEqual([1, 2]);
  });

  it('should skip all if fewer emissions than count', () => {
    const o = new Observable(0);
    const received = [];
    o.skipFirst(10).subscribe(v => received.push(v));
    o.set(1);
    o.set(2);
    expect(received).toEqual([]);
  });
});

describe('Event.skipFirst', () => {
  it('should work in a chain', () => {
    const o = new Observable(0);
    const received = [];
    o.map(v => v * 2).skipFirst(1).subscribe(v => received.push(v));
    o.set(1); // mapped to 2, skipped
    o.set(2); // mapped to 4, passes
    o.set(3); // mapped to 6, passes
    expect(received).toEqual([4, 6]);
  });

  it('should chain with other operators', () => {
    const o = new Observable(0);
    const received = [];
    o.skipFirst(1).map(v => v * 10).subscribe(v => received.push(v));
    o.set(1); // skipped
    o.set(2); // passes, mapped to 20
    expect(received).toEqual([20]);
  });
});
