import { describe, it, expect, afterEach } from 'bun:test';
import { Observable, setOnError } from '../src/index.js';

describe('error boundary (setOnError)', () => {
  afterEach(() => {
    // Reset to default (re-throw) behavior
    setOnError((e) => { throw e; });
  });

  it('default behavior re-throws subscriber errors', () => {
    const obs = new Observable(0);
    // Observable subscribe fires immediately with current value (BehaviorSubject),
    // so the error is thrown at subscribe time
    expect(() => obs.subscribe(() => { throw new Error('boom'); })).toThrow('boom');
  });

  it('custom handler catches errors without breaking other subscribers', () => {
    const errors = [];
    setOnError((e) => errors.push(e));

    const obs = new Observable(0);
    const values = [];

    // These subscribe calls fire immediately (BehaviorSubject), but errors
    // are caught by setOnError — subscribe itself doesn't throw.
    obs.subscribe(() => { throw new Error('first'); });
    obs.subscribe(v => values.push(v));
    obs.subscribe(() => { throw new Error('second'); });

    // Clear errors from the immediate subscribe invocations
    errors.length = 0;
    values.length = 0;

    obs.set(42);

    // The good subscriber still received the value
    expect(values).toEqual([42]);
    // Both errors were caught during set()
    expect(errors.length).toBe(2);
    expect(errors[0].message).toBe('first');
    expect(errors[1].message).toBe('second');
  });

  it('catches errors in child node _push (operator chains)', () => {
    const errors = [];
    setOnError((e) => errors.push(e));

    const obs = new Observable(0);
    const goodValues = [];
    const badValues = [];

    // Two parallel chains on the same source
    obs.map(() => { throw new Error('map-boom'); }).subscribe(v => badValues.push(v));
    obs.map(v => v * 2).subscribe(v => goodValues.push(v));

    obs.set(5);

    expect(goodValues).toEqual([10]);
    expect(badValues).toEqual([]);
    expect(errors.length).toBe(1);
    expect(errors[0].message).toBe('map-boom');
  });
});
