import { describe, it, expect } from 'bun:test';
import { fromEvent } from '../../src/index.js';

/** Minimal EventTarget stub for testing without a DOM. */
class FakeTarget {
  constructor() { this._listeners = {}; }
  addEventListener(name, fn) {
    (this._listeners[name] ||= []).push(fn);
  }
  removeEventListener(name, fn) {
    const list = this._listeners[name];
    if (list) this._listeners[name] = list.filter(f => f !== fn);
  }
  emit(name, data) {
    for (const fn of (this._listeners[name] || [])) fn(data);
  }
}

describe('fromEvent', () => {
  it('returns { event, dispose }', () => {
    const target = new FakeTarget();
    const { event, dispose } = fromEvent(target, 'click');
    expect(event).toBeDefined();
    expect(typeof dispose).toBe('function');
    dispose();
  });

  it('emits when the target fires', () => {
    const target = new FakeTarget();
    const { event, dispose } = fromEvent(target, 'click');
    const values = [];
    event.subscribe(v => values.push(v));

    target.emit('click', { x: 10 });
    target.emit('click', { x: 20 });

    expect(values).toEqual([{ x: 10 }, { x: 20 }]);
    dispose();
  });

  it('stops listening after dispose', () => {
    const target = new FakeTarget();
    const { event, dispose } = fromEvent(target, 'click');
    const values = [];
    event.subscribe(v => values.push(v));

    target.emit('click', 1);
    dispose();
    target.emit('click', 2);

    expect(values).toEqual([1]);
  });

  it('works in a chain', () => {
    const target = new FakeTarget();
    const { event, dispose } = fromEvent(target, 'input');
    const values = [];
    event.map(e => e.value).filter(v => v.length > 0).subscribe(v => values.push(v));

    target.emit('input', { value: '' });
    target.emit('input', { value: 'hi' });

    expect(values).toEqual(['hi']);
    dispose();
  });
});
