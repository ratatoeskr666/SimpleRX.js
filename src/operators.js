import { Event } from './event.js';
import { Observable } from './observable.js';

export function createMappedEvent(sourceNode, fn) {
  const derived = new Event();
  derived._node._push = (value) => {
    derived._node._notify(fn(value));
  };
  sourceNode._addChild(derived._node);
  return derived;
}

export function createMappedObservable(sourceNode, fn) {
  const derived = new Observable(fn(sourceNode._value));
  derived._node._push = (value) => {
    const mapped = fn(value);
    derived._node._value = mapped;
    derived._node._notify(mapped);
  };
  derived.set = () => { throw new Error('Cannot set a derived Observable'); };
  sourceNode._addChild(derived._node);
  return derived;
}
