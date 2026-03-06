import { describe, it, expect } from 'bun:test';
import { Event, Observable } from '../../src/index.js';

describe('Observable.map', () => {
  it('should return an Event, not an Observable', () => {
    const o = new Observable(5);
    const mapped = o.map(v => v * 2);
    expect(mapped).toBeInstanceOf(Event);
    expect(mapped).not.toBeInstanceOf(Observable);
  });

  it('should transform values from the source', () => {
    const o = new Observable(0);
    const received = [];
    o.map(v => v * 2).subscribe(v => received.push(v));
    o.set(3);
    o.set(5);
    expect(received).toEqual([6, 10]);
  });

  it('should not fire subscriber immediately (Event semantics)', () => {
    const o = new Observable(10);
    const received = [];
    o.map(v => v * 2).subscribe(v => received.push(v));
    expect(received).toEqual([]);
  });

  it('should support chained maps', () => {
    const o = new Observable(0);
    const received = [];
    o.map(v => v + 1).map(v => v * 10).subscribe(v => received.push(v));
    o.set(1);
    o.set(4);
    expect(received).toEqual([20, 50]);
  });
});

describe('Event.map', () => {
  it('should return an Event', () => {
    const o = new Observable(0);
    const event = o.map(v => v);
    const mapped = event.map(v => v * 2);
    expect(mapped).toBeInstanceOf(Event);
  });

  it('should transform values through the chain', () => {
    const o = new Observable(0);
    const received = [];
    o.map(v => v + 1).map(v => v * 3).subscribe(v => received.push(v));
    o.set(2);
    o.set(9);
    expect(received).toEqual([9, 30]);
  });
});

describe('Event.asObservable', () => {
  it('should convert an Event back to an Observable', () => {
    const o = new Observable(0);
    const event = o.map(v => v * 2);
    const obs = event.asObservable(0);
    expect(obs).toBeInstanceOf(Observable);
  });

  it('should have the provided initial value', () => {
    const o = new Observable(0);
    const obs = o.map(v => v * 2).asObservable(99);
    expect(obs.value).toBe(99);
  });

  it('should deliver initial value immediately on subscribe', () => {
    const o = new Observable(0);
    const obs = o.map(v => v * 2).asObservable(0);
    const received = [];
    obs.subscribe(v => received.push(v));
    expect(received).toEqual([0]);
  });

  it('should update when source changes', () => {
    const o = new Observable(0);
    const obs = o.map(v => v * 2).asObservable(0);
    const received = [];
    obs.subscribe(v => received.push(v));
    o.set(5);
    o.set(10);
    expect(received).toEqual([0, 10, 20]);
    expect(obs.value).toBe(20);
  });

  it('should support full chain: observable -> map -> asObservable -> map -> subscribe', () => {
    const source = new Observable(0);
    const derived = source.map(v => v + 1).asObservable(1);
    const received = [];
    derived.map(v => v * 10).subscribe(v => received.push(v));
    source.set(2);
    source.set(4);
    expect(received).toEqual([30, 50]);
  });
});
