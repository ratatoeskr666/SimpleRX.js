# SimpleRX.js — Project Context

Minimal reactive JavaScript library with signal-based internals and LINQ-style fluent chaining. Zero dependencies. Plain JS source with TypeScript `.d.ts` definitions.

## Core Concepts

Two base types — **Observable** and **Event** — with a clear separation:

- **Observable** — the only user-constructable type. Holds a value, notifies on change.
  - `new Observable(initialValue)` creates one
  - `.value` — synchronous read of current value
  - `.set(newValue)` — update and notify
  - `.subscribe(cb)` — fires `cb` immediately with current value, then on every change (BehaviorSubject semantics)
  - `.map()`, `.filter()`, `.execute()`, `.debounce()` — all return an **Event**, not an Observable

- **Event** — a derived stream created only by operators. Does NOT store a value. Cannot be emitted manually (no `.emit()`).
  - `.subscribe(cb)` — fires only on future emissions, NOT immediately
  - `.map()`, `.filter()`, `.execute()`, `.debounce()` — chain further, return Event
  - `.raceEvent(other)` — first to emit wins, loser permanently ignored
  - `.combineEvent(other)` — emits `[A, B]` tuples once both have fired (combineLatest)
  - `.waitForEvent(other)` — buffers latest value, emits when `other` fires
  - `.asObservable(initialValue)` — converts back to Observable

**Key rule**: all operators return Event. To get a stateful value back, call `.asObservable(initialValue)`.

**Two cleanup mechanisms**:
- **unsubscribe** (returned by `.subscribe()`) — removes only that callback. Chain stays alive.
- **`.dispose()`** (on Event/Observable) — tears down the entire upstream operator chain. Removes all subscribers, detaches from parents, clears timers, cascades to upstream Events. Does NOT dispose user-created root Observables.

## Factory Functions

Standalone functions that create root Events from time-based triggers. Exported from `src/factories.js`.

- **`ticker(ms)`** — emits incrementing integers (0, 1, 2, …) every `ms` milliseconds. Returns `{ event, dispose }`.
- **`timer(ms)`** — emits a single `0` after `ms` milliseconds, then stops. Returns `{ event, dispose }`.

Both return `{ event: Event, dispose: () => void }`. Call `dispose()` to stop the underlying timer/interval.

## Architecture

```
src/
  signal.js      Internal SignalNode engine (not exported)
  event.js       Event class (subscribe only, no emit)
  observable.js  Observable class (value + set + subscribe)
  operators.js   All operators, attached to prototypes via side-effect import
  factories.js   Factory functions (ticker, timer) — exported from index.js
  index.js       Public entry: exports Event, Observable, ticker, timer + imports operators.js
types/
  index.d.ts     TypeScript definitions (generics, Dispose type)
test/
  event.test.js       Event base type tests
  observable.test.js   Observable base type tests
  dispose.test.js      Disposal and chain teardown tests
  factories/
    ticker.test.js       ticker factory tests (async)
    timer.test.js        timer factory tests (async)
  operators/
    map.test.js          map operator tests
    filter.test.js       filter operator tests
    execute.test.js      execute operator tests
    debounce.test.js     debounce operator tests (async)
    race-event.test.js   raceEvent operator tests
    combine-event.test.js combineEvent operator tests
    wait-for-event.test.js waitForEvent operator tests
```

## Signal Internals (`src/signal.js`)

`SignalNode` is the internal reactive primitive. Not part of the public API.

- `_value` / `_hasValue` — value storage (Observable: true, Event: false)
- `_subscribers: Set<callback>` — end-user callbacks from `.subscribe()`
- `_children: Set<SignalNode>` — derived nodes from operators
- `_notify(value)` — snapshot-iterates subscribers, then pushes to children
- `_push(value)` — default: store value + notify. **Operators override this** on derived nodes to apply transformations (map, filter, etc.)
- `subscribe(cb)` — adds to `_subscribers`, fires immediately if `_hasValue`, returns dispose function
- `_subscribeRaw(cb)` — same but NO immediate fire (used by operators internally)
- `_addChild(child)` — registers a child node, returns dispose function

## How Operators Work (`src/operators.js`)

All operators follow the same pattern:

1. Create a new `Event()` (which internally creates a `SignalNode` with `_hasValue = false`)
2. Override `derived._node._push` to apply the transformation/logic
3. Wire the derived node to the source via `sourceNode._addChild(derived._node)` (for map/filter/execute/debounce) or `sourceNode._subscribeRaw(cb)` (for race/combine/waitForEvent/asObservable)
4. Return the derived Event

Two wiring patterns:
- **`_addChild` pattern** (map, filter, execute, debounce): override `_push` on derived node, parent pushes to child automatically
- **`_subscribeRaw` pattern** (raceEvent, combineEvent, waitForEvent, asObservable): subscribe directly to source(s), call `derived._node._notify()` manually

Operators are attached to `Event.prototype` and `Observable.prototype` at the bottom of `operators.js`. This file is imported for side effects in `index.js`.

## Disposal (`Event.dispose()` / `Observable.dispose()`)

Each Event/Observable has:
- `_disposers: []` — cleanup functions (remove from parent `_children`/`_subscribers`, clear timeouts)
- `_sources: []` — upstream operator-created Events/Observables to cascade dispose to

On `.dispose()`: runs all `_disposers`, clears `_subscribers` and `_children`, then recursively disposes all `_sources`. The `trackSource()` helper in `operators.js` only adds Event sources (not root Observables), so cascade stops at the user-created Observable boundary.

`.subscribe()` returns an **unsubscribe** function that only removes the callback — it does NOT tear down the chain.

Circular dependency between Event/Observable/operators is avoided by: `event.js` and `observable.js` define classes with only `subscribe`/`set`/`value`. `operators.js` imports both and attaches methods to their prototypes.

## How Factories Work (`src/factories.js`)

Factory functions create a bare `Event()` and drive it via `_node._notify()` from `setInterval`/`setTimeout`. They return `{ event, dispose }` where `dispose` clears the underlying timer.

## Tooling

- **Runtime/test runner**: Bun (`bun test`)
- **Module system**: ES modules (`"type": "module"` in package.json)
- **No build step** — source JS is consumed directly
- **Test imports**: `import { describe, it, expect } from 'bun:test'`
- **Async tests**: timer/debounce tests use real timers with short durations and `await delay(ms)`

## Common Commands

```bash
bun test          # Run all tests
bun test --watch  # Watch mode
```
