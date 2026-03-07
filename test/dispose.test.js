import { describe, it, expect } from 'bun:test';
import { Event, Observable, timer, ticker } from '../src/index.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// unsubscribe vs dispose — the two distinct mechanisms
// ---------------------------------------------------------------------------

describe('unsubscribe (from .subscribe())', () => {
  it('should only remove the callback, chain stays alive', () => {
    const o = new Observable(0);
    const mapped = o.map(v => v * 2);

    const received1 = [];
    const received2 = [];
    const unsub1 = mapped.subscribe(v => received1.push(v));
    mapped.subscribe(v => received2.push(v));

    o.set(1);
    unsub1(); // only removes cb1
    o.set(2);

    expect(received1).toEqual([2]);   // got 1, missed 2
    expect(received2).toEqual([2, 4]); // got both
  });
});

// ---------------------------------------------------------------------------
// Event.dispose — chain teardown
// ---------------------------------------------------------------------------

describe('Event.dispose', () => {
  it('should remove all subscribers', () => {
    const o = new Observable(0);
    const mapped = o.map(v => v);
    const received = [];
    mapped.subscribe(v => received.push(v));

    o.set(1);
    mapped.dispose();
    o.set(2);

    expect(received).toEqual([1]);
  });

  it('should detach from parent node (_addChild cleanup)', () => {
    const o = new Observable(0);
    const mapped = o.map(v => v);
    mapped.subscribe(() => {});

    expect(o._node._children.size).toBe(1);
    mapped.dispose();
    expect(o._node._children.size).toBe(0);
  });

  it('should cascade dispose through a chain of operators', () => {
    const o = new Observable(0);
    const step1 = o.map(v => v + 1);
    const step2 = step1.filter(v => v > 0);
    const step3 = step2.map(v => v * 10);

    const received = [];
    step3.subscribe(v => received.push(v));

    o.set(1);
    expect(received).toEqual([20]);

    // Dispose the tail — should cascade back through step2 → step1
    step3.dispose();
    o.set(2);
    expect(received).toEqual([20]); // no more values

    // Verify entire chain is detached
    expect(o._node._children.size).toBe(0);
    expect(step1._node._children.size).toBe(0);
    expect(step2._node._children.size).toBe(0);
  });

  it('should NOT dispose the root Observable', () => {
    const o = new Observable(0);
    const mapped = o.map(v => v);
    mapped.dispose();

    // Root Observable still works
    const received = [];
    o.subscribe(v => received.push(v));
    o.set(5);
    expect(received).toEqual([0, 5]);
  });
});

// ---------------------------------------------------------------------------
// dispose with _subscribeRaw operators (raceEvent, combineEvent, waitForEvent)
// ---------------------------------------------------------------------------

describe('dispose with raceEvent', () => {
  it('should detach from both sources', () => {
    const a = new Observable(0);
    const b = new Observable(0);
    const eventA = a.map(v => v);
    const eventB = b.map(v => v);
    const raced = eventA.raceEvent(eventB);

    const received = [];
    raced.subscribe(v => received.push(v));

    a.set(1);
    expect(received).toEqual([1]);

    raced.dispose();
    a.set(2);
    b.set(3);
    expect(received).toEqual([1]); // nothing more

    // Upstream events also disposed (cascade)
    expect(a._node._children.size).toBe(0);
    expect(b._node._children.size).toBe(0);
  });
});

describe('dispose with combineEvent', () => {
  it('should detach from both sources and cascade', () => {
    const a = new Observable(0);
    const b = new Observable(0);
    const eventA = a.map(v => v);
    const eventB = b.map(v => v);
    const combined = eventA.combineEvent(eventB);

    const received = [];
    combined.subscribe(v => received.push(v));

    a.set(1);
    b.set(2);
    expect(received).toEqual([[1, 2]]);

    combined.dispose();
    a.set(3);
    b.set(4);
    expect(received).toEqual([[1, 2]]);

    expect(a._node._children.size).toBe(0);
    expect(b._node._children.size).toBe(0);
  });
});

describe('dispose with waitForEvent', () => {
  it('should detach from both source and gate', () => {
    const source = new Observable(0);
    const gate = new Observable(0);
    const sourceEvent = source.map(v => v);
    const gateEvent = gate.map(v => v);
    const waiting = sourceEvent.waitForEvent(gateEvent);

    const received = [];
    waiting.subscribe(v => received.push(v));

    source.set(1);
    gate.set(99);
    expect(received).toEqual([1]);

    waiting.dispose();
    source.set(2);
    gate.set(100);
    expect(received).toEqual([1]);

    expect(source._node._children.size).toBe(0);
    expect(gate._node._children.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// dispose with asObservable
// ---------------------------------------------------------------------------

describe('dispose with asObservable', () => {
  it('should cascade from derived Observable back through Events', () => {
    const o = new Observable(0);
    const derived = o.map(v => v * 2).asObservable(0);

    const received = [];
    derived.subscribe(v => received.push(v));

    o.set(5);
    expect(received).toEqual([0, 10]);

    derived.dispose();
    o.set(10);
    expect(received).toEqual([0, 10]); // no more

    // Entire chain detached
    expect(o._node._children.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// dispose with debounce — clears pending timeouts
// ---------------------------------------------------------------------------

describe('dispose with debounce', () => {
  it('should clear pending timeout on dispose', async () => {
    const o = new Observable(0);
    const debounced = o.debounce(30);
    const received = [];
    debounced.subscribe(v => received.push(v));

    o.set(1); // starts debounce timer
    debounced.dispose(); // should clear the timer

    await delay(50);
    expect(received).toEqual([]); // timer was cleared, nothing emitted
  });

  it('should detach from source on dispose', () => {
    const o = new Observable(0);
    const debounced = o.debounce(30);
    debounced.subscribe(() => {});

    expect(o._node._children.size).toBe(1);
    debounced.dispose();
    expect(o._node._children.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Observable.dispose (root)
// ---------------------------------------------------------------------------

describe('Observable.dispose', () => {
  it('should clear all subscribers on a root Observable', () => {
    const o = new Observable(0);
    const received = [];
    o.subscribe(v => received.push(v));
    o.set(1);
    o.dispose();
    o.set(2);
    expect(received).toEqual([0, 1]);
  });

  it('should clear all child nodes on a root Observable', () => {
    const o = new Observable(0);
    o.map(v => v).subscribe(() => {});
    o.map(v => v).subscribe(() => {});
    expect(o._node._children.size).toBe(2);
    o.dispose();
    expect(o._node._children.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Double dispose is safe
// ---------------------------------------------------------------------------

describe('double dispose', () => {
  it('should not throw when disposing twice', () => {
    const o = new Observable(0);
    const mapped = o.map(v => v);
    mapped.subscribe(() => {});

    mapped.dispose();
    expect(() => mapped.dispose()).not.toThrow();
  });
});
