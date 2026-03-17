# SimpleRX.js

A minimal reactive framework for JavaScript with signal-based internals and a LINQ-style fluent API, designed to be easy to understand and use without requiring years of studying reactive principles.

## Comparison to RxJS
RxJS is a powerful and very well tought out library but it has the issue of a steep learning curve. In my opinion this has multiple root causes:
* No easy distinction between hot and cold observables
* Cold observables emit a value when subscribed, hot don't

SimpleRX doesn't want to compete with RxJS when it comes to performance or extensiveness, but my aim in developing this library was to make it easier for developers to harness the power of reactive programming.

## Disclaimer
I developed this library with the help of AI since I don't really have the time to write all the code by myself. Although there are tests and I reviewed the code with caution, I have to suggest to **USE THIS LIBRARY WITH CAUTION AND NOT IN PRODUCTION!**

## Features

- **Signal-powered** — fast push-based reactivity under the hood
- **Two clean types** — `Observable` (stateful) and `Event` (derived stream)
- **Fluent chaining** — `.map().filter().execute().subscribe()` like LINQ
- **Time-based triggers** — `ticker` and `timer` for interval/delay patterns
- **Zero dependencies** — no runtime deps, tiny footprint
- **TypeScript support** — ships with `.d.ts` type definitions and full generics

## Installation

```bash
npm install simplerx
```

```js
import { Observable, ticker, timer } from 'simplerx';
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
| `.debounce(ms)` | `Event` | Debounce emissions by `ms` milliseconds |
| `.takeAndDispose(count)` | `Event` | Take N emissions, then auto-dispose chain |
| `.skipFirst(count)` | `Event` | Skip first N emissions, pass the rest |
| `.debounceAndDispose(ms)` | `Event` | Debounce, emit once, then auto-dispose |
| `.dispose()` | `void` | Tear down this Observable (clear subscribers/children) |

### Event

| Method | Returns | Description |
|--------|---------|-------------|
| `.subscribe(callback)` | `Dispose` | Subscribe (fires only on future emissions) |
| `.map(fn)` | `Event` | Transform values |
| `.filter(predicate)` | `Event` | Filter values by condition |
| `.execute(fn)` | `Event` | Run side-effect, pass value through |
| `.debounce(ms)` | `Event` | Debounce emissions by `ms` milliseconds |
| `.takeAndDispose(count)` | `Event` | Take N emissions, then auto-dispose chain |
| `.skipFirst(count)` | `Event` | Skip first N emissions, pass the rest |
| `.debounceAndDispose(ms)` | `Event` | Debounce, emit once, then auto-dispose |
| `.raceEvent(other)` | `Event` | First source to emit wins, loser ignored |
| `.combineEvent(other)` | `Event` | Emit `[A, B]` tuples (combineLatest) |
| `.waitForEvent(other)` | `Event` | Buffer value, emit when `other` fires |
| `.asObservable(initialValue)` | `Observable` | Convert back to stateful Observable |
| `.dispose()` | `void` | Tear down this Event and upstream operator chain |

### Factory Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `ticker(ms)` | `{ event, dispose }` | Emit 0, 1, 2, … every `ms` milliseconds |
| `timer(ms)` | `{ event, dispose }` | Emit `0` once after `ms` milliseconds |

### Cleanup: Unsubscribe vs Dispose

There are two distinct cleanup mechanisms:

**Unsubscribe** — returned by `.subscribe()`. Removes only that callback. The operator chain stays alive for other subscribers.

```js
const mapped = count.map(v => v * 2);
const unsub = mapped.subscribe(v => console.log(v));
unsub();  // just removes this callback, chain stays alive
```

**Dispose** — called on an Event or Observable. Tears down the entire upstream operator chain: removes all subscribers, detaches from parent nodes, clears pending timers, and cascades to upstream Events. Does **not** dispose user-created root Observables.

```js
const o = new Observable(0);
const chain = o.map(v => v + 1).filter(v => v > 0).map(v => v * 10);
chain.subscribe(v => console.log(v));

chain.dispose();  // tears down filter → first map, detaches from o
// o is still alive and usable
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

### debounce

Wait for silence before emitting the most recent value (like RxJS `debounceTime`).

```js
const search = new Observable('');
search
  .debounce(300)
  .subscribe(query => fetchResults(query));

search.set('h');
search.set('he');
search.set('hel');
search.set('hello');
// Only 'hello' is emitted — after 300ms of silence
```

### takeAndDispose

Take the first N emissions, then auto-dispose the entire chain.

```js
const clicks = new Observable(0);
clicks.takeAndDispose(3).subscribe(v => console.log('click', v));
clicks.set(1);  // → click 1
clicks.set(2);  // → click 2
clicks.set(3);  // → click 3 (chain auto-disposes)
clicks.set(4);  // nothing — chain is gone
```

### skipFirst

Ignore the first N emissions, then pass everything through.

```js
const sensor = new Observable(0);
sensor.skipFirst(2).subscribe(v => console.log('stable:', v));
sensor.set(1);  // skipped (calibrating)
sensor.set(2);  // skipped (calibrating)
sensor.set(3);  // → stable: 3
```

### debounceAndDispose

Like debounce, but auto-disposes after the single debounced emission. One-shot idle pattern.

```js
const input = new Observable('');
input.debounceAndDispose(500).subscribe(v => saveDraft(v));
input.set('he');
input.set('hello');
// After 500ms of silence → saveDraft('hello'), then chain auto-disposes
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

### waitForEvent

Buffer the latest value and only emit when another Event fires. Combine with `timer` to create a fixed delay.

```js
import { Observable, timer } from 'simplerx';

const clicks = new Observable(0);
const { event: gate } = timer(500);

clicks.map(v => v)
  .waitForEvent(gate)
  .subscribe(v => console.log('delayed:', v));

clicks.set(1);
// After 500ms → delayed: 1
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

## Factory Functions

### ticker

Create a recurring interval that emits incrementing integers.

```js
import { ticker } from 'simplerx';

const { event, dispose } = ticker(1000);
event.subscribe(n => console.log('tick', n));  // 0, 1, 2, …
// Call dispose() to stop the interval
```

### timer

Create a one-shot delay that fires once.

```js
import { timer } from 'simplerx';

const { event, dispose } = timer(2000);
event.subscribe(() => console.log('fired!'));
// Call dispose() to cancel before it fires
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
  factories.js   Factory functions (ticker, timer)
  index.js       Public entry point
types/
  index.d.ts     TypeScript definitions
test/
  *.test.js                Base type tests
  operators/*.test.js      Operator tests
  factories/*.test.js      Factory function tests
```

### Guidelines

- Source is plain JavaScript (ES modules) — no build step
- TypeScript definitions live in `types/index.d.ts` and must be updated alongside any API changes
- All new operators go in `src/operators.js` following the existing pattern
- Factory functions go in `src/factories.js` and are exported from `src/index.js`
- Tests use `bun:test` — base type tests in `test/`, operator tests in `test/operators/`, factory tests in `test/factories/`
- Async tests (timer, debounce) use real timers with short durations and `await delay(ms)`
- Keep it minimal: no unnecessary abstractions, no runtime dependencies

## License

MIT
