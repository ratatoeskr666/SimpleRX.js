import { describe, it, expect } from 'bun:test';
import { Observable } from '../../src/index.js';

describe('firstValue / toPromise', () => {
  it('resolves with the next emitted value (Event)', async () => {
    const obs = new Observable(0);
    const event = obs.map(v => v * 10);
    const promise = event.firstValue();
    obs.set(5);
    expect(await promise).toBe(50);
  });

  it('resolves only once (unsubscribes after first emission)', async () => {
    const obs = new Observable(0);
    const event = obs.map(v => v);
    const promise = event.firstValue();
    obs.set(1);
    obs.set(2);
    expect(await promise).toBe(1);
  });

  it('toPromise is an alias for firstValue', () => {
    const obs = new Observable(0);
    const event = obs.map(v => v);
    expect(event.toPromise).toBe(event.firstValue);
  });

  it('works on Observable (waits for next set, not current value)', async () => {
    const obs = new Observable(42);
    const promise = obs.firstValue();
    obs.set(100);
    expect(await promise).toBe(100);
  });
});
