import { SignalNode } from './signal.js';

export class Observable {
  constructor(initialValue, _node) {
    this._node = _node || new SignalNode(initialValue, true);
  }

  get value() {
    return this._node._value;
  }

  set(newValue) {
    this._node._value = newValue;
    this._node._notify(newValue);
  }

  subscribe(callback) {
    return this._node.subscribe(callback);
  }
}
