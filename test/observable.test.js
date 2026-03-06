import { describe, it, expect } from 'bun:test';
import { Observable } from '../src/index.js';

describe('Observable', () => {
  it('should store the initial value', () => {
    const o = new Observable(42);
    expect(o.value).toBe(42);
  });

  it('should call subscriber immediately with current value', () => {
    const o = new Observable(10);
    const received = [];
    o.subscribe(v => received.push(v));
    expect(received).toEqual([10]);
  });

  it('should notify subscribers on set', () => {
    const o = new Observable(0);
    const received = [];
    o.subscribe(v => received.push(v));
    o.set(1);
    o.set(2);
    expect(received).toEqual([0, 1, 2]);
  });

  it('should update .value on set', () => {
    const o = new Observable('a');
    o.set('b');
    expect(o.value).toBe('b');
  });

  it('should support multiple subscribers', () => {
    const o = new Observable(5);
    const a = [];
    const b = [];
    o.subscribe(v => a.push(v));
    o.subscribe(v => b.push(v));
    o.set(10);
    expect(a).toEqual([5, 10]);
    expect(b).toEqual([5, 10]);
  });

  it('should stop delivering after dispose', () => {
    const o = new Observable(0);
    const received = [];
    const dispose = o.subscribe(v => received.push(v));
    o.set(1);
    dispose();
    o.set(2);
    expect(received).toEqual([0, 1]);
  });

  it('should still notify when setting the same value', () => {
    const o = new Observable(1);
    const received = [];
    o.subscribe(v => received.push(v));
    o.set(1);
    expect(received).toEqual([1, 1]);
  });
});
