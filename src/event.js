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
    /** @internal Cleanup functions (detach from parent, clear timers, etc.) */
    this._disposers = [];
    /** @internal Upstream operator-created Events to cascade dispose to. */
    this._sources = [];
  }

  /**
   * Subscribe to future emissions of this Event.
   * The callback is NOT invoked immediately — only when a value is pushed
   * through the reactive chain.
   * @param {(value: any) => void} callback Function called on each emission.
   * @returns {() => void} Unsubscribe function — removes only this callback.
   */
  subscribe(callback) {
    return this._node.subscribe(callback);
  }

  /**
   * Tear down this Event and the entire upstream operator chain.
   * - Removes all subscribers and child nodes from this Event.
   * - Detaches this node from its parent (removes from _children / _subscribers).
   * - Recursively disposes upstream operator-created Events.
   * - Clears any pending timers (e.g. debounce).
   *
   * Does NOT dispose user-created Observables at the root of a chain.
   */
  dispose() {
    for (const fn of this._disposers) fn();
    this._disposers.length = 0;
    this._node._subscribers.clear();
    this._node._children.clear();
    for (const source of this._sources) source.dispose();
    this._sources.length = 0;
  }
}
