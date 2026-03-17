import { describe, it, expect } from 'bun:test';
import { Event, Observable } from '../src/index.js';

describe('Event', () => {
  it('should not expose an emit method', () => {
    const e = new Event();
    expect(e.emit).toBeUndefined();
  });

  it('should not call subscriber immediately on subscribe', () => {
    const e = new Event();
    const received = [];
    e.subscribe(v => received.push(v));
    expect(received).toEqual([]);
  });

  it('should support dispose to stop receiving', () => {
    const o = new Observable(0);
    const mapped = o.map(v => v);
    const received = [];
    const dispose = mapped.subscribe(v => received.push(v));
    o.set(1);
    dispose();
    o.set(2);
    expect(received).toEqual([1]);
  });

  it('should support multiple subscribers', () => {
    const o = new Observable(0);
    const event = o.map(v => v);
    const a = [];
    const b = [];
    event.subscribe(v => a.push(v));
    event.subscribe(v => b.push(v));
    o.set(5);
    expect(a).toEqual([5]);
    expect(b).toEqual([5]);
  });
});
