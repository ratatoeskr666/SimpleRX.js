import { describe, it, expect } from 'bun:test';
import { Event, Observable } from '../../src/index.js';

describe('Event.combineEvent', () => {
  it('should not emit until both sources have emitted', () => {
    const a = new Observable(0);
    const b = new Observable(0);
    const eventA = a.map(v => v);
    const eventB = b.map(v => v);
    const received = [];

    eventA.combineEvent(eventB).subscribe(v => received.push(v));

    a.set(1); // only a has emitted — no output
    expect(received).toEqual([]);

    b.set(2); // both have emitted — emits [1, 2]
    expect(received).toEqual([[1, 2]]);
  });

  it('should re-emit with latest values when either source updates', () => {
    const a = new Observable(0);
    const b = new Observable(0);
    const eventA = a.map(v => v);
    const eventB = b.map(v => v);
    const received = [];

    eventA.combineEvent(eventB).subscribe(v => received.push(v));

    a.set(1);
    b.set(2);
    a.set(3);
    b.set(4);
    expect(received).toEqual([[1, 2], [3, 2], [3, 4]]);
  });

  it('should work when second source emits first', () => {
    const a = new Observable(0);
    const b = new Observable(0);
    const eventA = a.map(v => v);
    const eventB = b.map(v => v);
    const received = [];

    eventA.combineEvent(eventB).subscribe(v => received.push(v));

    b.set(10);
    expect(received).toEqual([]);

    a.set(20);
    expect(received).toEqual([[20, 10]]);
  });

  it('should support chaining after combineEvent', () => {
    const a = new Observable(0);
    const b = new Observable(0);
    const received = [];

    a.map(v => v).combineEvent(b.map(v => v))
      .map(([x, y]) => x + y)
      .subscribe(v => received.push(v));

    a.set(3);
    b.set(7);
    a.set(10);
    expect(received).toEqual([10, 17]);
  });

  it('should support combining events of different types', () => {
    const nums = new Observable(0);
    const strs = new Observable('');
    const received = [];

    nums.map(v => v).combineEvent(strs.map(v => v))
      .subscribe(v => received.push(v));

    nums.set(1);
    strs.set('hello');
    expect(received).toEqual([[1, 'hello']]);
  });
});
