/**
 * Internal reactive node that powers both Event and Observable.
 * Uses a push-based notification model with a two-tier system:
 * direct subscribers (callbacks) and child nodes (for operator chaining).
 * @internal Not part of the public API.
 */
export class SignalNode {
  constructor(initialValue, hasValue) {
    this._value = initialValue;
    this._hasValue = hasValue;
    this._subscribers = new Set();
    this._children = new Set();
  }

  /**
   * Push a value to all direct subscribers, then propagate to all child nodes.
   * Iterates over a snapshot to safely handle re-entrant subscribe/unsubscribe.
   */
  _notify(value) {
    for (const cb of [...this._subscribers]) cb(value);
    for (const child of [...this._children]) child._push(value);
  }

  /**
   * Default push handler: stores the value and notifies.
   * Operators override this method on derived nodes to apply transformations.
   */
  _push(value) {
    this._value = value;
    this._notify(value);
  }

  /**
   * Subscribe to this node. If the node holds a value (_hasValue),
   * the callback is invoked immediately with the current value.
   * @returns {() => void} Dispose function to remove the subscription.
   */
  subscribe(callback) {
    this._subscribers.add(callback);
    if (this._hasValue) callback(this._value);
    return () => { this._subscribers.delete(callback); };
  }

  /**
   * Subscribe without immediate invocation. Used internally by operators
   * to wire up chains without triggering the replay behavior.
   * @returns {() => void} Dispose function to remove the subscription.
   */
  _subscribeRaw(callback) {
    this._subscribers.add(callback);
    return () => { this._subscribers.delete(callback); };
  }

  /**
   * Register a child node that will receive pushes when this node notifies.
   * @returns {() => void} Dispose function to remove the child.
   */
  _addChild(child) {
    this._children.add(child);
    return () => { this._children.delete(child); };
  }
}
