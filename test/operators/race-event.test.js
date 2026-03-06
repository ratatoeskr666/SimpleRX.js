import { describe, it, expect } from 'bun:test';
import { Event, Observable } from '../../src/index.js';

describe('Event.raceEvent', () => {
  it('should emit from whichever source fires first', () => {
    const a = new Observable(0);
    const b = new Observable(0);
    const eventA = a.map(v => v);
    const eventB = b.map(v => v);
    const received = [];

    eventA.raceEvent(eventB).subscribe(v => received.push(v));

    a.set(1); // a fires first — a wins
    b.set(2); // b is ignored
    a.set(3); // a still delivers
    expect(received).toEqual([1, 3]);
  });

  it('should let the second source win if it fires first', () => {
    const a = new Observable(0);
    const b = new Observable(0);
    const eventA = a.map(v => v);
    const eventB = b.map(v => v);
    const received = [];

    eventA.raceEvent(eventB).subscribe(v => received.push(v));

    b.set(10); // b fires first — b wins
    a.set(20); // a is ignored
    b.set(30); // b still delivers
    expect(received).toEqual([10, 30]);
  });

  it('should permanently ignore the loser', () => {
    const a = new Observable(0);
    const b = new Observable(0);
    const eventA = a.map(v => v);
    const eventB = b.map(v => v);
    const received = [];

    eventA.raceEvent(eventB).subscribe(v => received.push(v));

    a.set(1);
    b.set(2);
    b.set(3);
    a.set(4);
    expect(received).toEqual([1, 4]);
  });

  it('should support chaining after raceEvent', () => {
    const a = new Observable(0);
    const b = new Observable(0);
    const received = [];

    a.map(v => v).raceEvent(b.map(v => v))
      .map(v => v * 10)
      .subscribe(v => received.push(v));

    a.set(5);
    a.set(7);
    expect(received).toEqual([50, 70]);
  });
});
