import { describe, it, expect } from 'bun:test';
import { ticker, Event } from '../../src/index.js';

const delay = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

describe('ticker', () => {
  it('should return { event, dispose }', () => {
    const t = ticker(50);
    expect(t.event).toBeInstanceOf(Event);
    expect(typeof t.dispose).toBe('function');
    t.dispose();
  });

  it('should emit incrementing numbers starting at 0', async () => {
    const { event, dispose } = ticker(20);
    const received = [];
    event.subscribe(v => received.push(v));
    await delay(75); // 20, 40, 60 -> 3 ticks
    dispose();
    expect(received[0]).toBe(0);
    expect(received[1]).toBe(1);
    expect(received[2]).toBe(2);
    expect(received.length).toBeGreaterThanOrEqual(3);
  });

  it('should stop emitting after dispose', async () => {
    const { event, dispose } = ticker(20);
    const received = [];
    event.subscribe(v => received.push(v));
    await delay(55);
    dispose();
    const countAtDispose = received.length;
    await delay(50);
    expect(received.length).toBe(countAtDispose);
  });

  it('should deliver to multiple subscribers', async () => {
    const { event, dispose } = ticker(20);
    const a = [];
    const b = [];
    event.subscribe(v => a.push(v));
    event.subscribe(v => b.push(v));
    await delay(55);
    dispose();
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(2);
  });
});
