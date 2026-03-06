import { describe, it, expect } from 'bun:test';
import { Event } from '../src/index.js';

describe('Event', () => {
  it('should call subscribers when emitting a value', () => {
    const e = new Event();
    const received = [];
    e.subscribe(v => received.push(v));
    e.emit(1);
    e.emit(2);
    expect(received).toEqual([1, 2]);
  });

  it('should NOT call subscriber immediately on subscribe', () => {
    const e = new Event();
    const received = [];
    e.subscribe(v => received.push(v));
    expect(received).toEqual([]);
  });

  it('should support multiple subscribers', () => {
    const e = new Event();
    const a = [];
    const b = [];
    e.subscribe(v => a.push(v));
    e.subscribe(v => b.push(v));
    e.emit('hello');
    expect(a).toEqual(['hello']);
    expect(b).toEqual(['hello']);
  });

  it('should stop delivering after dispose', () => {
    const e = new Event();
    const received = [];
    const dispose = e.subscribe(v => received.push(v));
    e.emit(1);
    dispose();
    e.emit(2);
    expect(received).toEqual([1]);
  });

  it('should not throw when emitting with no subscribers', () => {
    const e = new Event();
    expect(() => e.emit('test')).not.toThrow();
  });
});
