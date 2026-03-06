import { SignalNode } from './signal.js';
import { Event } from './event.js';
import { Observable } from './observable.js';

export function mapOperator(sourceNode, fn) {
  const derived = new Event();
  derived._node._push = (value) => {
    derived._node._notify(fn(value));
  };
  sourceNode._addChild(derived._node);
  return derived;
}

function asObservableOperator(initialValue) {
  const obsNode = new SignalNode(initialValue, true);
  this._node._subscribeRaw((value) => {
    obsNode._value = value;
    obsNode._notify(value);
  });
  const obs = new Observable(undefined, obsNode);
  return obs;
}

// Attach operators to prototypes
Event.prototype.map = function (fn) {
  return mapOperator(this._node, fn);
};

Event.prototype.asObservable = asObservableOperator;

Observable.prototype.map = function (fn) {
  return mapOperator(this._node, fn);
};
