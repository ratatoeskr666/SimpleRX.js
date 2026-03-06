import { SignalNode } from './signal.js';

/**
 * A reactive value container that holds state and notifies subscribers on change.
 *
 * Observable is the primary source of reactivity. It stores a current value
 * accessible via `.value` and pushes updates to subscribers when `.set()` is
 * called. Subscribers receive the current value immediately upon subscribing
 * (BehaviorSubject semantics).
 *
 * Operators like `.map()` and `.filter()` return an Event (a derived stream
 * without stored state). Use `.asObservable()` on an Event to convert back.
 *
 * @example
 * const count = new Observable(0);
 * count.subscribe(v => console.log(v));  // logs 0 immediately
 * count.set(1);                          // logs 1
 */
export class Observable {
  /**
   * Create an Observable with an initial value.
   * @param {any} initialValue The starting value.
   * @param {SignalNode} [_node] Internal — used by operators to inject a pre-built node.
   */
  constructor(initialValue, _node) {
    this._node = _node || new SignalNode(initialValue, true);
  }

  /**
   * The current value of this Observable.
   * @type {any}
   */
  get value() {
    return this._node._value;
  }

  /**
   * Update the stored value and notify all subscribers and derived chains.
   * @param {any} newValue The new value to store and broadcast.
   */
  set(newValue) {
    this._node._value = newValue;
    this._node._notify(newValue);
  }

  /**
   * Subscribe to this Observable. The callback is invoked immediately with
   * the current value, then again each time the value changes.
   * @param {(value: any) => void} callback Function called with each value.
   * @returns {() => void} Dispose function to unsubscribe.
   */
  subscribe(callback) {
    return this._node.subscribe(callback);
  }
}
