import { SignalNode } from './signal.js';
import { Event } from './event.js';
import { Observable } from './observable.js';

// ---------------------------------------------------------------------------
// Operator factories (internal)
// ---------------------------------------------------------------------------

/**
 * Creates a derived Event that transforms each value through `fn`.
 * @param {SignalNode} sourceNode The source signal node to derive from.
 * @param {(value: any) => any} fn Transformation function.
 * @returns {Event} A new Event emitting the transformed values.
 */
function mapOperator(sourceNode, fn) {
  const derived = new Event();
  derived._node._push = (value) => {
    derived._node._notify(fn(value));
  };
  sourceNode._addChild(derived._node);
  return derived;
}

/**
 * Creates a derived Event that only emits when `predicate` returns true.
 * Values that do not satisfy the predicate are silently dropped.
 * @param {SignalNode} sourceNode The source signal node.
 * @param {(value: any) => boolean} predicate Filter condition.
 * @returns {Event} A new Event emitting only matching values.
 */
function filterOperator(sourceNode, predicate) {
  const derived = new Event();
  derived._node._push = (value) => {
    if (predicate(value)) derived._node._notify(value);
  };
  sourceNode._addChild(derived._node);
  return derived;
}

/**
 * Creates a derived Event that runs a side-effect `fn` for each value
 * without altering it. The value passes through unchanged.
 * Equivalent to RxJS `tap`.
 * @param {SignalNode} sourceNode The source signal node.
 * @param {(value: any) => void} fn Side-effect function.
 * @returns {Event} A new Event emitting the same values.
 */
function executeOperator(sourceNode, fn) {
  const derived = new Event();
  derived._node._push = (value) => {
    fn(value);
    derived._node._notify(value);
  };
  sourceNode._addChild(derived._node);
  return derived;
}

/**
 * Converts an Event into an Observable with an initial value.
 * Future emissions from the Event update the Observable's stored value
 * and notify its subscribers.
 * @param {any} initialValue The starting value for the Observable.
 * @returns {Observable} A new Observable seeded with `initialValue`.
 */
function asObservableOperator(initialValue) {
  const obsNode = new SignalNode(initialValue, true);
  this._node._subscribeRaw((value) => {
    obsNode._value = value;
    obsNode._notify(value);
  });
  return new Observable(undefined, obsNode);
}

/**
 * Combines this Event with another Event in a race. The first source to
 * emit wins — all future emissions come only from the winner. The losing
 * source is permanently ignored.
 * @param {Event} otherEvent The competing Event.
 * @returns {Event} A new Event that emits values from whichever source fires first.
 */
function raceEventOperator(otherEvent) {
  const derived = new Event();
  let winner = null;
  const handler = (source) => (value) => {
    if (winner === null) winner = source;
    if (winner === source) derived._node._notify(value);
  };
  this._node._subscribeRaw(handler('a'));
  otherEvent._node._subscribeRaw(handler('b'));
  return derived;
}

/**
 * Combines this Event with another Event. Emits a `[valueA, valueB]` tuple
 * containing the latest value from each source. Only starts emitting once
 * both sources have emitted at least once (combineLatest semantics).
 * @param {Event} otherEvent The Event to combine with.
 * @returns {Event} A new Event emitting `[A, B]` tuples.
 */
function combineEventOperator(otherEvent) {
  const derived = new Event();
  let latestA, latestB, hasA = false, hasB = false;
  this._node._subscribeRaw((value) => {
    latestA = value;
    hasA = true;
    if (hasB) derived._node._notify([latestA, latestB]);
  });
  otherEvent._node._subscribeRaw((value) => {
    latestB = value;
    hasB = true;
    if (hasA) derived._node._notify([latestA, latestB]);
  });
  return derived;
}

// ---------------------------------------------------------------------------
// Attach operators to prototypes
// ---------------------------------------------------------------------------

/** Transform each emitted value. Returns a new Event. */
Event.prototype.map = function (fn) {
  return mapOperator(this._node, fn);
};

/** Filter emissions by predicate. Non-matching values are dropped. Returns a new Event. */
Event.prototype.filter = function (predicate) {
  return filterOperator(this._node, predicate);
};

/** Run a side-effect for each value without altering it. Returns a new Event. */
Event.prototype.execute = function (fn) {
  return executeOperator(this._node, fn);
};

/** Convert this Event into an Observable with an initial value. */
Event.prototype.asObservable = asObservableOperator;

/**
 * Race this Event against another. The first to emit wins; the loser is
 * permanently ignored. Returns a new Event.
 */
Event.prototype.raceEvent = raceEventOperator;

/**
 * Combine this Event with another. Emits [A, B] tuples once both have
 * emitted at least once. Returns a new Event.
 */
Event.prototype.combineEvent = combineEventOperator;

/** Transform each emitted value. Returns a new Event (not Observable). */
Observable.prototype.map = function (fn) {
  return mapOperator(this._node, fn);
};

/** Filter emissions by predicate. Non-matching values are dropped. Returns a new Event. */
Observable.prototype.filter = function (predicate) {
  return filterOperator(this._node, predicate);
};

/** Run a side-effect for each value without altering it. Returns a new Event. */
Observable.prototype.execute = function (fn) {
  return executeOperator(this._node, fn);
};
