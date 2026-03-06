import { describe, it, expect } from 'bun:test';
import { Event, Observable } from '../src/index.js';

describe('Event.map', () => {
  it('should transform emitted values', () => {
    const e = new Event();
    const received = [];
    e.map(v => v * 2).subscribe(v => received.push(v));
    e.emit(3);
    e.emit(5);
    expect(received).toEqual([6, 10]);
  });

  it('should support chained maps', () => {
    const e = new Event();
    const received = [];
    e.map(v => v + 1).map(v => v * 10).subscribe(v => received.push(v));
    e.emit(1);
    expect(received).toEqual([20]);
  });

  it('should not fire mapped subscriber immediately', () => {
    const e = new Event();
    const received = [];
    e.map(v => v).subscribe(v => received.push(v));
    expect(received).toEqual([]);
  });
});

describe('Observable.map', () => {
  it('should have correct initial derived value', () => {
    const o = new Observable(5);
    const mapped = o.map(v => v * 2);
    expect(mapped.value).toBe(10);
  });

  it('should fire subscriber immediately with derived value', () => {
    const o = new Observable(3);
    const received = [];
    o.map(v => v + 1).subscribe(v => received.push(v));
    expect(received).toEqual([4]);
  });

  it('should update when source updates', () => {
    const o = new Observable(1);
    const mapped = o.map(v => v * 10);
    const received = [];
    mapped.subscribe(v => received.push(v));
    o.set(2);
    o.set(3);
    expect(received).toEqual([10, 20, 30]);
    expect(mapped.value).toBe(30);
  });

  it('should support chained maps', () => {
    const o = new Observable(2);
    const received = [];
    o.map(v => v + 1).map(v => v * 2).subscribe(v => received.push(v));
    o.set(4);
    expect(received).toEqual([6, 10]);
  });

  it('should throw on set for derived observable', () => {
    const o = new Observable(1);
    const mapped = o.map(v => v);
    expect(() => mapped.set(5)).toThrow('Cannot set a derived Observable');
  });
});
