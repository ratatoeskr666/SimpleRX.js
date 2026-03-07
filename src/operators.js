import { SignalNode } from './signal.js';
import { Event } from './event.js';
import { Observable } from './observable.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * If source is an operator-created Event, register it for cascade disposal.
 * Root Observables are NOT added — the user manages their lifecycle.
 */
function trackSource(derived, source) {
  if (source instanceof Event) derived._sources.push(source);
}

// ---------------------------------------------------------------------------
// _addChild pattern operators (map, filter, execute, debounce)
// ---------------------------------------------------------------------------

/**
 * Creates a derived Event that transforms each value through `fn`.
 */
function mapOperator(sourceNode, fn, source) {
  const derived = new Event();
  derived._node._push = (value) => {
    derived._node._notify(fn(value));
  };
  derived._disposers.push(sourceNode._addChild(derived._node));
  trackSource(derived, source);
  return derived;
}

/**
 * Creates a derived Event that only emits when `predicate` returns true.
 */
function filterOperator(sourceNode, predicate, source) {
  const derived = new Event();
  derived._node._push = (value) => {
    if (predicate(value)) derived._node._notify(value);
  };
  derived._disposers.push(sourceNode._addChild(derived._node));
  trackSource(derived, source);
  return derived;
}

/**
 * Creates a derived Event that runs a side-effect `fn` for each value
 * without altering it (like RxJS `tap`).
 */
function executeOperator(sourceNode, fn, source) {
  const derived = new Event();
  derived._node._push = (value) => {
    fn(value);
    derived._node._notify(value);
  };
  derived._disposers.push(sourceNode._addChild(derived._node));
  trackSource(derived, source);
  return derived;
}

/**
 * Creates a derived Event that delays emission until `ms` milliseconds of
 * silence have passed. Clears pending timeouts on dispose.
 */
function debounceOperator(sourceNode, ms, source) {
  const derived = new Event();
  let timerId = null;
  derived._node._push = (value) => {
    if (timerId !== null) clearTimeout(timerId);
    timerId = setTimeout(() => {
      timerId = null;
      derived._node._notify(value);
    }, ms);
  };
  derived._disposers.push(
    sourceNode._addChild(derived._node),
    () => { if (timerId !== null) { clearTimeout(timerId); timerId = null; } }
  );
  trackSource(derived, source);
  return derived;
}

// ---------------------------------------------------------------------------
// _subscribeRaw pattern operators (asObservable, raceEvent, combineEvent, waitForEvent)
// ---------------------------------------------------------------------------

/**
 * Converts an Event into an Observable with an initial value.
 * The returned Observable cascades dispose back to the source Event.
 */
function asObservableOperator(initialValue) {
  const obsNode = new SignalNode(initialValue, true);
  const disposeRaw = this._node._subscribeRaw((value) => {
    obsNode._value = value;
    obsNode._notify(value);
  });
  const obs = new Observable(undefined, obsNode);
  obs._disposers.push(disposeRaw);
  trackSource(obs, this);
  return obs;
}

/**
 * Race this Event against another. The first to emit wins; the loser is
 * permanently ignored.
 */
function raceEventOperator(otherEvent) {
  const derived = new Event();
  let winner = null;
  const handler = (source) => (value) => {
    if (winner === null) winner = source;
    if (winner === source) derived._node._notify(value);
  };
  derived._disposers.push(
    this._node._subscribeRaw(handler('a')),
    otherEvent._node._subscribeRaw(handler('b'))
  );
  trackSource(derived, this);
  trackSource(derived, otherEvent);
  return derived;
}

/**
 * Combine this Event with another. Emits [A, B] tuples once both have
 * emitted at least once (combineLatest semantics).
 */
function combineEventOperator(otherEvent) {
  const derived = new Event();
  let latestA, latestB, hasA = false, hasB = false;
  derived._disposers.push(
    this._node._subscribeRaw((value) => {
      latestA = value;
      hasA = true;
      if (hasB) derived._node._notify([latestA, latestB]);
    }),
    otherEvent._node._subscribeRaw((value) => {
      latestB = value;
      hasB = true;
      if (hasA) derived._node._notify([latestA, latestB]);
    })
  );
  trackSource(derived, this);
  trackSource(derived, otherEvent);
  return derived;
}

/**
 * Buffer the latest value and emit when `otherEvent` fires.
 * Combine with `timer` for a fixed delay: `event.waitForEvent(timer(500).event)`
 */
function waitForEventOperator(otherEvent) {
  const derived = new Event();
  let buffer = undefined;
  let hasBuffer = false;
  derived._disposers.push(
    this._node._subscribeRaw((value) => {
      buffer = value;
      hasBuffer = true;
    }),
    otherEvent._node._subscribeRaw(() => {
      if (hasBuffer) {
        const val = buffer;
        buffer = undefined;
        hasBuffer = false;
        derived._node._notify(val);
      }
    })
  );
  trackSource(derived, this);
  trackSource(derived, otherEvent);
  return derived;
}

/**
 * Takes the first `count` emissions, then auto-disposes the entire chain.
 * @param {SignalNode} sourceNode The source signal node.
 * @param {number} count Number of values to take before disposing.
 * @param {Event|Observable} source The source wrapper for disposal tracking.
 * @returns {Event} A new Event that emits at most `count` values.
 */
function takeAndDisposeOperator(sourceNode, count, source) {
  const derived = new Event();
  let remaining = count;
  derived._node._push = (value) => {
    if (remaining > 0) {
      remaining--;
      derived._node._notify(value);
      if (remaining === 0) derived.dispose();
    }
  };
  derived._disposers.push(sourceNode._addChild(derived._node));
  trackSource(derived, source);
  return derived;
}

/**
 * Ignores the first `count` emissions, then passes everything through.
 * @param {SignalNode} sourceNode The source signal node.
 * @param {number} count Number of values to skip.
 * @param {Event|Observable} source The source wrapper for disposal tracking.
 * @returns {Event} A new Event that skips the first `count` values.
 */
function skipFirstOperator(sourceNode, count, source) {
  const derived = new Event();
  let remaining = count;
  derived._node._push = (value) => {
    if (remaining > 0) { remaining--; return; }
    derived._node._notify(value);
  };
  derived._disposers.push(sourceNode._addChild(derived._node));
  trackSource(derived, source);
  return derived;
}

/**
 * Like debounce, but auto-disposes the chain after the single debounced
 * emission. Useful for one-shot idle patterns.
 * @param {SignalNode} sourceNode The source signal node.
 * @param {number} ms Debounce window in milliseconds.
 * @param {Event|Observable} source The source wrapper for disposal tracking.
 * @returns {Event} A new Event that emits once after silence, then disposes.
 */
function debounceAndDisposeOperator(sourceNode, ms, source) {
  const derived = new Event();
  let timerId = null;
  derived._node._push = (value) => {
    if (timerId !== null) clearTimeout(timerId);
    timerId = setTimeout(() => {
      timerId = null;
      derived._node._notify(value);
      derived.dispose();
    }, ms);
  };
  derived._disposers.push(
    sourceNode._addChild(derived._node),
    () => { if (timerId !== null) { clearTimeout(timerId); timerId = null; } }
  );
  trackSource(derived, source);
  return derived;
}

// ---------------------------------------------------------------------------
// Attach operators to prototypes
// ---------------------------------------------------------------------------

/** Transform each emitted value. Returns a new Event. */
Event.prototype.map = function (fn) {
  return mapOperator(this._node, fn, this);
};

/** Filter emissions by predicate. Non-matching values are dropped. Returns a new Event. */
Event.prototype.filter = function (predicate) {
  return filterOperator(this._node, predicate, this);
};

/** Run a side-effect for each value without altering it. Returns a new Event. */
Event.prototype.execute = function (fn) {
  return executeOperator(this._node, fn, this);
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

/**
 * Debounce emissions — waits for `ms` milliseconds of silence before
 * emitting the most recent value. Returns a new Event.
 */
Event.prototype.debounce = function (ms) {
  return debounceOperator(this._node, ms, this);
};

/**
 * Wait for `otherEvent` to fire before emitting the latest buffered value.
 * Only the most recent value is kept. Returns a new Event.
 */
Event.prototype.waitForEvent = waitForEventOperator;

/**
 * Take the first `count` emissions, then auto-dispose the chain. Returns a new Event.
 */
Event.prototype.takeAndDispose = function (count) {
  return takeAndDisposeOperator(this._node, count, this);
};

/**
 * Skip the first `count` emissions, then pass everything through. Returns a new Event.
 */
Event.prototype.skipFirst = function (count) {
  return skipFirstOperator(this._node, count, this);
};

/**
 * Debounce emissions, emit once after silence, then auto-dispose. Returns a new Event.
 */
Event.prototype.debounceAndDispose = function (ms) {
  return debounceAndDisposeOperator(this._node, ms, this);
};

/** Transform each emitted value. Returns a new Event (not Observable). */
Observable.prototype.map = function (fn) {
  return mapOperator(this._node, fn, this);
};

/** Filter emissions by predicate. Non-matching values are dropped. Returns a new Event. */
Observable.prototype.filter = function (predicate) {
  return filterOperator(this._node, predicate, this);
};

/** Run a side-effect for each value without altering it. Returns a new Event. */
Observable.prototype.execute = function (fn) {
  return executeOperator(this._node, fn, this);
};

/**
 * Debounce emissions — waits for `ms` milliseconds of silence before
 * emitting the most recent value. Returns a new Event.
 */
Observable.prototype.debounce = function (ms) {
  return debounceOperator(this._node, ms, this);
};

/**
 * Take the first `count` emissions, then auto-dispose the chain. Returns a new Event.
 */
Observable.prototype.takeAndDispose = function (count) {
  return takeAndDisposeOperator(this._node, count, this);
};

/**
 * Skip the first `count` emissions, then pass everything through. Returns a new Event.
 */
Observable.prototype.skipFirst = function (count) {
  return skipFirstOperator(this._node, count, this);
};

/**
 * Debounce emissions, emit once after silence, then auto-dispose. Returns a new Event.
 */
Observable.prototype.debounceAndDispose = function (ms) {
  return debounceAndDisposeOperator(this._node, ms, this);
};
