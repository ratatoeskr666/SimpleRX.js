import { describe, it, expect } from 'bun:test';
import { timer, Event } from '../../src/index.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

describe('timer', () => {
  it('should return { event, dispose }', () => {
    const t = timer(50);
    expect(t.event).toBeInstanceOf(Event);
    expect(typeof t.dispose).toBe('function');
    t.dispose();
  });

  it('should emit once after the specified delay', async () => {
    const { event, dispose } = timer(30);
    const received = [];
    event.subscribe(v => received.push(v));
    expect(received).toEqual([]);
    await delay(50);
    expect(received).toEqual([0]);
    // Should not emit again
    await delay(50);
    expect(received).toEqual([0]);
    dispose();
  });

  it('should not emit if disposed before delay', async () => {
    const { event, dispose } = timer(50);
    const received = [];
    event.subscribe(v => received.push(v));
    dispose();
    await delay(80);
    expect(received).toEqual([]);
  });

  it('should not replay to late subscribers', async () => {
    const { event, dispose } = timer(20);
    await delay(40);
    const received = [];
    event.subscribe(v => received.push(v));
    await delay(30);
    expect(received).toEqual([]);
    dispose();
  });

  it('should work in a chain with map', async () => {
    const { event, dispose } = timer(20);
    const received = [];
    event.map(v => 'fired').subscribe(v => received.push(v));
    await delay(40);
    expect(received).toEqual(['fired']);
    dispose();
  });
});
