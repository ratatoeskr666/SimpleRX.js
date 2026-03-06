import { SignalNode } from './signal.js';
import { createMappedObservable } from './operators.js';

export class Observable {
  constructor(initialValue) {
    this._node = new SignalNode(initialValue, true);
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

  map(fn) {
    return createMappedObservable(this._node, fn);
  }
}
