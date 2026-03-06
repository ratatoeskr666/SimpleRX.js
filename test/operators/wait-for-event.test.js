import { describe, it, expect } from 'bun:test';
import { Event, Observable, timer } from '../../src/index.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

describe('Event.waitForEvent', () => {
  it('should buffer source value and emit when gate fires', () => {
    const source = new Observable(0);
    const gate = new Observable(0);
    const sourceEvent = source.map(v => v);
    const gateEvent = gate.map(v => v);
    const received = [];

    sourceEvent.waitForEvent(gateEvent).subscribe(v => received.push(v));

    source.set(1);
    expect(received).toEqual([]);

    gate.set(99);  // gate fires — emit buffered value 1
    expect(received).toEqual([1]);
  });

  it('should only emit the latest value when source emits multiple times', () => {
    const source = new Observable(0);
    const gate = new Observable(0);
    const sourceEvent = source.map(v => v);
    const gateEvent = gate.map(v => v);
    const received = [];

    sourceEvent.waitForEvent(gateEvent).subscribe(v => received.push(v));

    source.set(1);
    source.set(2);
    source.set(3);
    gate.set(99);
    expect(received).toEqual([3]);
  });

  it('should not emit if gate fires with no buffered value', () => {
    const source = new Observable(0);
    const gate = new Observable(0);
    const sourceEvent = source.map(v => v);
    const gateEvent = gate.map(v => v);
    const received = [];

    sourceEvent.waitForEvent(gateEvent).subscribe(v => received.push(v));

    gate.set(99);  // no value buffered
    expect(received).toEqual([]);
  });

  it('should clear buffer after emission', () => {
    const source = new Observable(0);
    const gate = new Observable(0);
    const sourceEvent = source.map(v => v);
    const gateEvent = gate.map(v => v);
    const received = [];

    sourceEvent.waitForEvent(gateEvent).subscribe(v => received.push(v));

    source.set(1);
    gate.set(99);   // emits 1, buffer cleared
    gate.set(100);  // no buffer — nothing emitted
    expect(received).toEqual([1]);
  });

  it('should work across multiple buffer-gate cycles', () => {
    const source = new Observable(0);
    const gate = new Observable(0);
    const sourceEvent = source.map(v => v);
    const gateEvent = gate.map(v => v);
    const received = [];

    sourceEvent.waitForEvent(gateEvent).subscribe(v => received.push(v));

    source.set(10);
    gate.set(1);    // emits 10
    source.set(20);
    gate.set(2);    // emits 20
    source.set(30);
    source.set(40);
    gate.set(3);    // emits 40 (latest)
    expect(received).toEqual([10, 20, 40]);
  });

  it('should combine with timer to create a delay', async () => {
    const source = new Observable(0);
    const { event: timerEvent, dispose } = timer(30);
    const received = [];

    source.map(v => v).waitForEvent(timerEvent).subscribe(v => received.push(v));

    source.set(42);
    expect(received).toEqual([]);

    await delay(50);
    expect(received).toEqual([42]);
    dispose();
  });

  it('should support chaining after waitForEvent', () => {
    const source = new Observable(0);
    const gate = new Observable(0);
    const received = [];

    source.map(v => v)
      .waitForEvent(gate.map(v => v))
      .map(v => v * 10)
      .subscribe(v => received.push(v));

    source.set(5);
    gate.set(1);
    expect(received).toEqual([50]);
  });
});
