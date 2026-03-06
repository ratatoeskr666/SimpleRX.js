import { SignalNode } from './signal.js';

/**
 * A derived reactive stream that emits values but does not store them.
 *
 * Events are created by operators (e.g. `.map()`, `.filter()`) and cannot
 * be triggered manually. They serve as intermediate steps in a reactive
 * chain. To convert an Event back into a stateful Observable, use
 * `.asObservable(initialValue)`.
 *
 * @example
 * const source = new Observable(0);
 * source
 *   .map(v => v * 2)       // returns Event
 *   .filter(v => v > 5)    // returns Event
 *   .subscribe(v => console.log(v));
 */
export class Event {
  /** @internal */
  constructor(node) {
    this._node = node || new SignalNode(undefined, false);
  }

  /**
   * Subscribe to future emissions of this Event.
   * The callback is NOT invoked immediately — only when a value is pushed
   * through the reactive chain.
   * @param {(value: any) => void} callback Function called on each emission.
   * @returns {() => void} Dispose function to unsubscribe.
   */
  subscribe(callback) {
    return this._node.subscribe(callback);
  }
}
