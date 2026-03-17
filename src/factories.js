import { Event } from './event.js';

// ---------------------------------------------------------------------------
// Factory functions that create root Events from time-based triggers
// ---------------------------------------------------------------------------

/**
 * Creates an Event that emits incrementing integers (0, 1, 2, …) at a
 * fixed interval. The underlying `setInterval` is shared across all
 * subscribers.
 * Caution: the first value is not emitted immediately, but after the defined ms 
 *
 * @param {number} ms Interval in milliseconds between emissions.
 * @returns {{ event: Event<number>, dispose: () => void }}
 *   `event` — subscribe to receive ticks.
 *   `dispose` — call to stop the interval permanently.
 *
 * @example
 * const { event, dispose } = ticker(1000);
 * event.subscribe(n => console.log('tick', n));  // 0, 1, 2, …
 * dispose();  // stops the interval
 */
export function ticker(ms) {
  const event = new Event();
  let count = 0;
  const id = setInterval(() => {
    event._node._notify(count++);
  }, ms);
  const dispose = () => clearInterval(id);
  return { event, dispose };
}

/**
 * Creates an Event that emits a single `0` after a one-time delay,
 * then never emits again.
 *
 * @param {number} ms Delay in milliseconds before the emission.
 * @returns {{ event: Event<number>, dispose: () => void }}
 *   `event` — subscribe to receive the timer fire.
 *   `dispose` — call to cancel the timer before it fires.
 *
 * @example
 * const { event, dispose } = timer(500);
 * event.subscribe(() => console.log('fired!'));
 * // dispose() to cancel before it fires
 */
export function timer(ms) {
  const event = new Event();
  const id = setTimeout(() => {
    event._node._notify(0);
  }, ms);
  const dispose = () => clearTimeout(id);
  return { event, dispose };
}

// ---------------------------------------------------------------------------
// Merge / combination factories
// ---------------------------------------------------------------------------

/**
 * Merge multiple Events into a single Event that emits whenever any source emits.
 * Unlike `combineEvent` (which waits for all), `mergeEvents` forwards every
 * emission from every source immediately.
 *
 * @param {...Event} events Two or more Events to merge.
 * @returns {{ event: Event, dispose: () => void }}
 *
 * @example
 * const { event, dispose } = mergeEvents(click$, keydown$, scroll$);
 * event.subscribe(v => console.log(v));
 * dispose();
 */
export function mergeEvents(...events) {
  if (events.length < 2) {
    throw new RangeError('mergeEvents() requires at least 2 events');
  }
  const merged = new Event();
  const unsubs = events.map((src) =>
    src._node._subscribeRaw((value) => merged._node._notify(value))
  );
  const dispose = () => {
    for (const unsub of unsubs) unsub();
    merged._node._subscribers.clear();
    merged._node._children.clear();
  };
  return { event: merged, dispose };
}

// ---------------------------------------------------------------------------
// Bridging factories (Promise, DOM events)
// ---------------------------------------------------------------------------

/**
 * Create an Event from a Promise. Emits the resolved value once, or
 * never emits if the promise rejects.
 *
 * @param {Promise<T>} promise The promise to bridge.
 * @returns {{ event: Event<T>, dispose: () => void }}
 *
 * @example
 * const { event } = fromPromise(fetch('/api').then(r => r.json()));
 * event.subscribe(data => console.log(data));
 */
export function fromPromise(promise) {
  const event = new Event();
  let disposed = false;
  promise.then(
    (value) => { if (!disposed) event._node._notify(value); },
    () => {}  // Silently ignore rejections — the Event simply never emits.
  );
  const dispose = () => { disposed = true; };
  return { event, dispose };
}

/**
 * Create an Event from a DOM EventTarget (or any object with
 * `addEventListener` / `removeEventListener`).
 *
 * @param {EventTarget} target The target to listen on.
 * @param {string} eventName The event name (e.g. 'click', 'input').
 * @returns {{ event: Event, dispose: () => void }}
 *
 * @example
 * const { event, dispose } = fromEvent(document, 'click');
 * event.subscribe(e => console.log(e.clientX, e.clientY));
 * dispose();
 */
export function fromEvent(target, eventName) {
  const event = new Event();
  const handler = (e) => event._node._notify(e);
  target.addEventListener(eventName, handler);
  const dispose = () => {
    target.removeEventListener(eventName, handler);
    event._node._subscribers.clear();
    event._node._children.clear();
  };
  return { event, dispose };
}
