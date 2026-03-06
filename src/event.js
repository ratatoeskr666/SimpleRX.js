import { SignalNode } from './signal.js';

export class Event {
  constructor(node) {
    this._node = node || new SignalNode(undefined, false);
  }

  subscribe(callback) {
    return this._node.subscribe(callback);
  }
}
