import { describe, it, expect, spyOn } from 'bun:test';
import { Observable } from '../../src/index.js';

describe('debug', () => {
  it('returns an Event', () => {
    const obs = new Observable(0);
    const event = obs.debug('test');
    expect(event.constructor.name).toBe('Event');
  });

  it('passes values through unchanged', () => {
    const obs = new Observable(0);
    const values = [];
    obs.debug('test').subscribe(v => values.push(v));
    obs.set(1);
    obs.set(2);
    expect(values).toEqual([1, 2]);
  });

  it('logs each emission with the label', () => {
    const spy = spyOn(console, 'log');
    const obs = new Observable(0);
    obs.debug('source').subscribe(() => {});
    obs.set(42);
    expect(spy).toHaveBeenCalledWith('[source]', 42);
    spy.mockRestore();
  });

  it('uses default label when none provided', () => {
    const spy = spyOn(console, 'log');
    const obs = new Observable(0);
    obs.debug().subscribe(() => {});
    obs.set(99);
    expect(spy).toHaveBeenCalledWith('[debug]', 99);
    spy.mockRestore();
  });

  it('works in a chain', () => {
    const spy = spyOn(console, 'log');
    const obs = new Observable(0);
    const values = [];
    obs.debug('before')
      .map(v => v * 2)
      .debug('after')
      .subscribe(v => values.push(v));
    obs.set(5);
    expect(spy).toHaveBeenCalledWith('[before]', 5);
    expect(spy).toHaveBeenCalledWith('[after]', 10);
    expect(values).toEqual([10]);
    spy.mockRestore();
  });
});
