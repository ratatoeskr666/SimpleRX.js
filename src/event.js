import { SignalNode } from './signal.js';
import { createMappedEvent } from './operators.js';

export class Event {
  constructor() {
    this._node = new SignalNode(undefined, false);
  }

  emit(value) {
    this._node._notify(value);
  }

  subscribe(callback) {
    return this._node.subscribe(callback);
  }

  map(fn) {
    return createMappedEvent(this._node, fn);
  }
}
