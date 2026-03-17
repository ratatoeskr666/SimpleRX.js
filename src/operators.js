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
// _addChild pattern operators (map, filter, execute, debounce, etc.)
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
  if (typeof ms !== 'number' || ms < 0) {
    throw new RangeError(`debounce(ms) requires ms >= 0, got ${ms}`);
  }
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

/**
 * Creates a derived Event that only emits when the value differs from
 * the previous emission (by reference equality, or a custom comparator).
 */
function distinctUntilChangedOperator(sourceNode, comparator, source) {
  const derived = new Event();
  let lastValue;
  let hasLast = false;
  const isEqual = comparator || ((a, b) => a === b);
  derived._node._push = (value) => {
    if (hasLast && isEqual(lastValue, value)) return;
    lastValue = value;
    hasLast = true;
    derived._node._notify(value);
  };
  derived._disposers.push(sourceNode._addChild(derived._node));
  trackSource(derived, source);
  return derived;
}

/**
 * Creates a derived Event that logs each emission with a label,
 * then passes the value through unchanged.
 */
function debugOperator(sourceNode, label, source) {
  const derived = new Event();
  derived._node._push = (value) => {
    console.log(`[${label}]`, value);
    derived._node._notify(value);
  };
  derived._disposers.push(sourceNode._addChild(derived._node));
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
  const obs = new Observable(initialValue, obsNode);
  obs._disposers.push(disposeRaw);
  trackSource(obs, this);
  return obs;
}

/**
 * Race this Event against another. The first to emit wins; the loser is
 * permanently ignored and its subscription is cleaned up.
 */
function raceEventOperator(otherEvent) {
  const derived = new Event();
  let winner = null;
  let disposeA, disposeB;

  disposeA = this._node._subscribeRaw((value) => {
    if (winner === null) {
      winner = 'a';
      disposeB();
    }
    if (winner === 'a') derived._node._notify(value);
  });

  disposeB = otherEvent._node._subscribeRaw((value) => {
    if (winner === null) {
      winner = 'b';
      disposeA();
    }
    if (winner === 'b') derived._node._notify(value);
  });

  derived._disposers.push(
    () => { if (winner !== 'b') disposeA(); },
    () => { if (winner !== 'a') disposeB(); }
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
 */
function takeAndDisposeOperator(sourceNode, count, source) {
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1) {
    throw new RangeError(`takeAndDispose(count) requires an integer >= 1, got ${count}`);
  }
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
 */
function skipFirstOperator(sourceNode, count, source) {
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) {
    throw new RangeError(`skipFirst(count) requires an integer >= 0, got ${count}`);
  }
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
 */
function debounceAndDisposeOperator(sourceNode, ms, source) {
  if (typeof ms !== 'number' || ms < 0) {
    throw new RangeError(`debounceAndDispose(ms) requires ms >= 0, got ${ms}`);
  }
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

/**
 * Returns a Promise that resolves with the next emitted value, then unsubscribes.
 */
function firstValueMethod() {
  return new Promise((resolve) => {
    const unsub = this._node._subscribeRaw((value) => {
      unsub();
      resolve(value);
    });
  });
}

// ---------------------------------------------------------------------------
// Attach operators to Event.prototype
// ---------------------------------------------------------------------------

Event.prototype.map = function (fn) {
  return mapOperator(this._node, fn, this);
};

Event.prototype.filter = function (predicate) {
  return filterOperator(this._node, predicate, this);
};

Event.prototype.execute = function (fn) {
  return executeOperator(this._node, fn, this);
};

Event.prototype.asObservable = asObservableOperator;

Event.prototype.raceEvent = raceEventOperator;

Event.prototype.combineEvent = combineEventOperator;

Event.prototype.debounce = function (ms) {
  return debounceOperator(this._node, ms, this);
};

Event.prototype.waitForEvent = waitForEventOperator;

Event.prototype.takeAndDispose = function (count) {
  return takeAndDisposeOperator(this._node, count, this);
};

Event.prototype.skipFirst = function (count) {
  return skipFirstOperator(this._node, count, this);
};

Event.prototype.debounceAndDispose = function (ms) {
  return debounceAndDisposeOperator(this._node, ms, this);
};

Event.prototype.distinctUntilChanged = function (comparator) {
  return distinctUntilChangedOperator(this._node, comparator, this);
};

Event.prototype.debug = function (label) {
  return debugOperator(this._node, label || 'debug', this);
};

Event.prototype.firstValue = firstValueMethod;

Event.prototype.toPromise = firstValueMethod;

// ---------------------------------------------------------------------------
// Attach operators to Observable.prototype
// ---------------------------------------------------------------------------

Observable.prototype.map = function (fn) {
  return mapOperator(this._node, fn, this);
};

Observable.prototype.filter = function (predicate) {
  return filterOperator(this._node, predicate, this);
};

Observable.prototype.execute = function (fn) {
  return executeOperator(this._node, fn, this);
};

Observable.prototype.debounce = function (ms) {
  return debounceOperator(this._node, ms, this);
};

Observable.prototype.takeAndDispose = function (count) {
  return takeAndDisposeOperator(this._node, count, this);
};

Observable.prototype.skipFirst = function (count) {
  return skipFirstOperator(this._node, count, this);
};

Observable.prototype.debounceAndDispose = function (ms) {
  return debounceAndDisposeOperator(this._node, ms, this);
};

Observable.prototype.distinctUntilChanged = function (comparator) {
  return distinctUntilChangedOperator(this._node, comparator, this);
};

Observable.prototype.debug = function (label) {
  return debugOperator(this._node, label || 'debug', this);
};

Observable.prototype.raceEvent = raceEventOperator;

Observable.prototype.combineEvent = combineEventOperator;

Observable.prototype.waitForEvent = waitForEventOperator;

Observable.prototype.firstValue = firstValueMethod;

Observable.prototype.toPromise = firstValueMethod;
