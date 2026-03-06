# SimpleRX.js

A minimal reactive framework for JavaScript with signal-based internals and a LINQ-style fluent API.

## Features

- **Signal-powered** — fast push-based reactivity under the hood
- **Two clean types** — `Observable` (stateful) and `Event` (derived stream)
- **Fluent chaining** — `.map().filter().execute().subscribe()` like LINQ
- **Zero dependencies** — no runtime deps, tiny footprint
- **TypeScript support** — ships with `.d.ts` type definitions and full generics

## Installation

```bash
npm install simplerx
```

```js
import { Observable } from 'simplerx';
```

## Quick Start

```js
import { Observable } from 'simplerx';

// Create a reactive value
const count = new Observable(0);

// Subscribe — fires immediately with current value, then on every change
count.subscribe(v => console.log('count:', v));
// → count: 0

// Update the value
count.set(1);  // → count: 1
count.set(2);  // → count: 2

// Chain operators — returns an Event (derived stream, no stored value)
count
  .map(v => v * 2)
  .filter(v => v > 2)
  .subscribe(v => console.log('doubled & filtered:', v));

count.set(1);  // mapped to 2, filtered out (not > 2)
count.set(3);  // → doubled & filtered: 6

// Convert back to Observable when you need a stored value
const doubled = count.map(v => v * 2).asObservable(0);
doubled.value;  // 0 (initial value)
doubled.subscribe(v => console.log('doubled:', v));  // → doubled: 0
count.set(5);   // → doubled: 10
doubled.value;  // 10
```

## Core Concepts

### Observable

The primary source of reactivity. Holds a value and notifies subscribers when it changes.

```js
const name = new Observable('Alice');
name.value;           // 'Alice'
name.set('Bob');      // notifies all subscribers
name.subscribe(cb);   // cb fires immediately with 'Bob', then on every change
```

Subscribers receive the current value **immediately** on subscribe (like RxJS `BehaviorSubject`).

### Event

A derived stream created by operators. Does **not** store a value and cannot be triggered manually.

```js
const event = name.map(n => n.toUpperCase());
// event has no .value, no .emit(), no .set()
event.subscribe(v => console.log(v));  // only fires on future changes
name.set('Charlie');  // → CHARLIE
```

Events are the intermediate type in operator chains. To get a stateful value back, use `.asObservable()`.

## API Reference

### Observable

| Method | Returns | Description |
|--------|---------|-------------|
| `new Observable(initialValue)` | `Observable` | Create a reactive value |
| `.value` | `T` | Read the current value |
| `.set(newValue)` | `void` | Update value and notify subscribers |
| `.subscribe(callback)` | `Dispose` | Subscribe (fires immediately with current value) |
| `.map(fn)` | `Event` | Transform values |
| `.filter(predicate)` | `Event` | Filter values by condition |
| `.execute(fn)` | `Event` | Run side-effect, pass value through |

### Event

| Method | Returns | Description |
|--------|---------|-------------|
| `.subscribe(callback)` | `Dispose` | Subscribe (fires only on future emissions) |
| `.map(fn)` | `Event` | Transform values |
| `.filter(predicate)` | `Event` | Filter values by condition |
| `.execute(fn)` | `Event` | Run side-effect, pass value through |
| `.raceEvent(other)` | `Event` | First source to emit wins, loser ignored |
| `.combineEvent(other)` | `Event` | Emit `[A, B]` tuples (combineLatest) |
| `.asObservable(initialValue)` | `Observable` | Convert back to stateful Observable |

All `.subscribe()` calls return a **dispose function** — call it to unsubscribe:

```js
const dispose = count.subscribe(v => console.log(v));
dispose();  // unsubscribed
```

## Operators

### map

Transform each value through a function.

```js
const prices = new Observable(100);
prices.map(p => p * 1.2).subscribe(v => console.log('with tax:', v));
prices.set(200);  // → with tax: 240
```

### filter

Drop values that don't satisfy the predicate.

```js
const input = new Observable(0);
input.filter(v => v > 0).subscribe(v => console.log('positive:', v));
input.set(-1);  // filtered out
input.set(5);   // → positive: 5
```

### execute

Run a side-effect without altering the value (like RxJS `tap`).

```js
const data = new Observable(0);
data
  .execute(v => analytics.track('value_changed', v))
  .map(v => v * 2)
  .subscribe(v => render(v));
```

### raceEvent

Race two Events — the first to emit wins, the loser is permanently ignored.

```js
const a = new Observable(0);
const b = new Observable(0);
a.map(v => v).raceEvent(b.map(v => v)).subscribe(v => console.log('winner:', v));
a.set(1);  // a wins → winner: 1
b.set(2);  // ignored forever
a.set(3);  // → winner: 3
```

### combineEvent

Combine two Events into `[A, B]` tuples. Only emits once both sources have fired at least once.

```js
const x = new Observable(0);
const y = new Observable(0);
x.map(v => v).combineEvent(y.map(v => v)).subscribe(([a, b]) => {
  console.log(`x=${a}, y=${b}`);
});
x.set(1);         // waiting for y...
y.set(2);         // → x=1, y=2
x.set(3);         // → x=3, y=2
```

### asObservable

Convert an Event back into an Observable with an initial value.

```js
const source = new Observable(0);
const derived = source.map(v => v * 10).asObservable(0);
derived.value;       // 0
derived.subscribe(v => console.log(v));  // → 0 (immediate)
source.set(5);       // → 50
derived.value;       // 50
```

## Contributing

```bash
# Clone the repo
git clone https://github.com/Ratatoeskr/SimpleRX.js.git
cd SimpleRX.js

# Run tests
bun test
```

### Project structure

```
src/
  signal.js      Internal reactive engine (SignalNode)
  event.js       Event class
  observable.js  Observable class
  operators.js   All operators (attached to prototypes)
  index.js       Public entry point
types/
  index.d.ts     TypeScript definitions
test/
  *.test.js              Base type tests
  operators/*.test.js    Operator tests
```

### Guidelines

- Source is plain JavaScript (ES modules) — no build step
- TypeScript definitions live in `types/index.d.ts` and must be updated alongside any API changes
- All new operators go in `src/operators.js` following the existing pattern
- Tests use `bun:test` — add base type tests in `test/`, operator tests in `test/operators/`
- Keep it minimal: no unnecessary abstractions, no runtime dependencies

## License

MIT
