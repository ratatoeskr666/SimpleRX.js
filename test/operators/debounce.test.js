import { describe, it, expect } from 'bun:test';
import { Event, Observable } from '../../src/index.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

describe('Observable.debounce', () => {
  it('should return an Event', () => {
    const o = new Observable(0);
    const debounced = o.debounce(50);
    expect(debounced).toBeInstanceOf(Event);
  });

  it('should not emit immediately on source change', async () => {
    const o = new Observable(0);
    const received = [];
    o.debounce(30).subscribe(v => received.push(v));
    o.set(1);
    expect(received).toEqual([]);
    await delay(50);
    expect(received).toEqual([1]);
  });

  it('should only emit the last value in a burst', async () => {
    const o = new Observable(0);
    const received = [];
    o.debounce(30).subscribe(v => received.push(v));
    o.set(1);
    o.set(2);
    o.set(3);
    await delay(50);
    expect(received).toEqual([3]);
  });

  it('should reset the timer on each emission', async () => {
    const o = new Observable(0);
    const received = [];
    o.debounce(40).subscribe(v => received.push(v));
    o.set(1);
    await delay(20);
    o.set(2);  // resets the timer
    await delay(20);
    expect(received).toEqual([]);  // still waiting
    await delay(30);
    expect(received).toEqual([2]);
  });

  it('should emit separately for distinct bursts', async () => {
    const o = new Observable(0);
    const received = [];
    o.debounce(30).subscribe(v => received.push(v));
    o.set(1);
    await delay(50);
    o.set(2);
    await delay(50);
    expect(received).toEqual([1, 2]);
  });
});

describe('Event.debounce', () => {
  it('should debounce in a chain', async () => {
    const o = new Observable(0);
    const received = [];
    o.map(v => v * 2).debounce(30).subscribe(v => received.push(v));
    o.set(1);
    o.set(2);
    o.set(3);
    await delay(50);
    expect(received).toEqual([6]);
  });

  it('should support chaining after debounce', async () => {
    const o = new Observable(0);
    const received = [];
    o.debounce(30).map(v => v + 100).subscribe(v => received.push(v));
    o.set(5);
    await delay(50);
    expect(received).toEqual([105]);
  });
});
