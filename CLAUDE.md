# SimpleRX.js — Project Context

Minimal reactive JavaScript library with signal-based internals and LINQ-style fluent chaining. Zero dependencies. Plain JS source with TypeScript `.d.ts` definitions.

## Core Concepts

Two base types — **Observable** and **Event** — with a clear separation:

- **Observable** — the only user-constructable type. Holds a value, notifies on change.
  - `new Observable(initialValue)` creates one
  - `.value` — synchronous read of current value
  - `.set(newValue)` — update and notify
  - `.subscribe(cb)` — fires `cb` immediately with current value, then on every change (BehaviorSubject semantics)
  - `.map()`, `.filter()`, `.execute()` — all return an **Event**, not an Observable

- **Event** — a derived stream created only by operators. Does NOT store a value. Cannot be emitted manually (no `.emit()`).
  - `.subscribe(cb)` — fires only on future emissions, NOT immediately
  - `.map()`, `.filter()`, `.execute()` — chain further, return Event
  - `.raceEvent(other)` — first to emit wins, loser permanently ignored
  - `.combineEvent(other)` — emits `[A, B]` tuples once both have fired (combineLatest)
  - `.asObservable(initialValue)` — converts back to Observable

**Key rule**: all operators return Event. To get a stateful value back, call `.asObservable(initialValue)`.

## Architecture

```
src/
  signal.js      Internal SignalNode engine (not exported)
  event.js       Event class (subscribe only, no emit)
  observable.js  Observable class (value + set + subscribe)
  operators.js   All operators, attached to prototypes via side-effect import
  index.js       Public entry: exports Event + Observable, imports operators.js
types/
  index.d.ts     TypeScript definitions (generics, Dispose type)
test/
  event.test.js       Event base type tests
  observable.test.js   Observable base type tests
  operators/
    map.test.js          map operator tests
    filter.test.js       filter operator tests
    execute.test.js      execute operator tests
    race-event.test.js   raceEvent operator tests
    combine-event.test.js combineEvent operator tests
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
3. Wire the derived node to the source via `sourceNode._addChild(derived._node)` (for map/filter/execute) or `sourceNode._subscribeRaw(cb)` (for race/combine/asObservable)
4. Return the derived Event

Operators are attached to `Event.prototype` and `Observable.prototype` at the bottom of `operators.js`. This file is imported for side effects in `index.js`.

Circular dependency between Event/Observable/operators is avoided by: `event.js` and `observable.js` define classes with only `subscribe`/`set`/`value`. `operators.js` imports both and attaches methods to their prototypes.

## Tooling

- **Runtime/test runner**: Bun (`bun test`)
- **Module system**: ES modules (`"type": "module"` in package.json)
- **No build step** — source JS is consumed directly
- **Test imports**: `import { describe, it, expect } from 'bun:test'`

## Common Commands

```bash
bun test          # Run all tests
bun test --watch  # Watch mode
```
