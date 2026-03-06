export class SignalNode {
  constructor(initialValue, hasValue) {
    this._value = initialValue;
    this._hasValue = hasValue;
    this._subscribers = new Set();
    this._children = new Set();
  }

  _notify(value) {
    for (const cb of this._subscribers) cb(value);
    for (const child of this._children) child._push(value);
  }

  _push(value) {
    this._value = value;
    this._notify(value);
  }

  subscribe(callback) {
    this._subscribers.add(callback);
    if (this._hasValue) callback(this._value);
    return () => { this._subscribers.delete(callback); };
  }

  _addChild(child) {
    this._children.add(child);
    return () => { this._children.delete(child); };
  }
}
