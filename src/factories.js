import { Event } from './event.js';

// ---------------------------------------------------------------------------
// Factory functions that create root Events from time-based triggers
// ---------------------------------------------------------------------------

/**
 * Creates an Event that emits incrementing integers (0, 1, 2, …) at a
 * fixed interval. The underlying `setInterval` is shared across all
 * subscribers.
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
