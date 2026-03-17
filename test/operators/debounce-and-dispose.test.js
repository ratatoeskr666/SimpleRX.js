import { describe, it, expect } from 'bun:test';
import { Event, Observable } from '../../src/index.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

describe('Observable.debounceAndDispose', () => {
  it('should return an Event', () => {
    const o = new Observable(0);
    const d = o.debounceAndDispose(50);
    expect(d).toBeInstanceOf(Event);
    d.dispose(); // cleanup
  });

  it('should debounce and emit the last value', async () => {
    const o = new Observable(0);
    const received = [];
    o.debounceAndDispose(30).subscribe(v => received.push(v));
    o.set(1);
    o.set(2);
    o.set(3);
    await delay(50);
    expect(received).toEqual([3]);
  });

  it('should auto-dispose after the single emission', async () => {
    const o = new Observable(0);
    const debounced = o.debounceAndDispose(30);
    debounced.subscribe(() => {});

    expect(o._node._children.size).toBe(1);
    o.set(1);
    await delay(50);
    expect(o._node._children.size).toBe(0); // auto-disposed
  });

  it('should not emit again after auto-dispose', async () => {
    const o = new Observable(0);
    const received = [];
    o.debounceAndDispose(30).subscribe(v => received.push(v));
    o.set(1);
    await delay(50); // emits 1, then disposes
    o.set(2);
    await delay(50);
    expect(received).toEqual([1]);
  });

  it('should clear pending timeout if manually disposed', async () => {
    const o = new Observable(0);
    const debounced = o.debounceAndDispose(30);
    const received = [];
    debounced.subscribe(v => received.push(v));
    o.set(1);
    debounced.dispose(); // manual dispose before timeout
    await delay(50);
    expect(received).toEqual([]);
  });
});

describe('Event.debounceAndDispose', () => {
  it('should work in a chain', async () => {
    const o = new Observable(0);
    const received = [];
    o.map(v => v * 2).debounceAndDispose(30).subscribe(v => received.push(v));
    o.set(1);
    o.set(2);
    await delay(50);
    expect(received).toEqual([4]); // last mapped value
  });
});
