import { describe, it, expect } from 'bun:test';
import { fromPromise } from '../../src/index.js';

describe('fromPromise', () => {
  it('returns { event, dispose }', () => {
    const { event, dispose } = fromPromise(Promise.resolve(42));
    expect(event).toBeDefined();
    expect(typeof dispose).toBe('function');
  });

  it('emits the resolved value', async () => {
    const { event } = fromPromise(Promise.resolve(42));
    const values = [];
    event.subscribe(v => values.push(v));

    // Wait for the microtask to resolve
    await new Promise(r => setTimeout(r, 10));
    expect(values).toEqual([42]);
  });

  it('does not emit if disposed before resolution', async () => {
    let resolvePromise;
    const promise = new Promise(r => { resolvePromise = r; });
    const { event, dispose } = fromPromise(promise);
    const values = [];
    event.subscribe(v => values.push(v));

    dispose();
    resolvePromise(99);

    await new Promise(r => setTimeout(r, 10));
    expect(values).toEqual([]);
  });

  it('does not emit on rejection', async () => {
    const { event } = fromPromise(Promise.reject(new Error('fail')));
    const values = [];
    event.subscribe(v => values.push(v));

    await new Promise(r => setTimeout(r, 10));
    expect(values).toEqual([]);
  });

  it('works in a chain with map', async () => {
    const { event } = fromPromise(Promise.resolve(5));
    const values = [];
    event.map(v => v * 10).subscribe(v => values.push(v));

    await new Promise(r => setTimeout(r, 10));
    expect(values).toEqual([50]);
  });
});
