/** Dispose function returned by `.subscribe()`. Call it to unsubscribe. */
export type Dispose = () => void;

/**
 * A derived reactive stream that emits values but does not store them.
 *
 * Events are created by operators (e.g. `.map()`, `.filter()`) and cannot
 * be triggered manually. They serve as intermediate steps in a reactive
 * chain. To convert an Event back into a stateful Observable, use
 * `.asObservable(initialValue)`.
 */
export class Event<T = void> {
  /**
   * Subscribe to future emissions of this Event.
   * The callback is NOT invoked immediately — only when a value is pushed
   * through the reactive chain.
   */
  subscribe(callback: (value: T) => void): Dispose;

  /** Transform each emitted value. Returns a new Event. */
  map<U>(fn: (value: T) => U): Event<U>;

  /**
   * Filter emissions by predicate. Values that do not satisfy the predicate
   * are silently dropped and will not reach downstream subscribers.
   */
  filter(predicate: (value: T) => boolean): Event<T>;

  /**
   * Run a side-effect for each emitted value without altering it.
   * The value passes through unchanged. Equivalent to RxJS `tap`.
   */
  execute(fn: (value: T) => void): Event<T>;

  /**
   * Debounce emissions — waits for `ms` milliseconds of silence before
   * emitting the most recent value.
   * @throws {RangeError} If `ms` is negative or not a number.
   */
  debounce(ms: number): Event<T>;

  /**
   * Race this Event against another. The first source to emit wins —
   * all future emissions come only from the winner. The losing source
   * is permanently ignored and its subscription is cleaned up.
   */
  raceEvent<U>(other: Event<U>): Event<T | U>;

  /**
   * Combine this Event with another. Emits a `[A, B]` tuple containing
   * the latest value from each source. Only starts emitting once both
   * sources have emitted at least once (combineLatest semantics).
   */
  combineEvent<U>(other: Event<U>): Event<[T, U]>;

  /**
   * Buffer the latest value and only emit it when `otherEvent` fires.
   * If multiple values arrive before the gate opens, only the most recent
   * is kept. Combine with `timer` for a fixed delay:
   * `event.waitForEvent(timer(500).event)`
   */
  waitForEvent(otherEvent: Event<any>): Event<T>;

  /**
   * Take the first `count` emissions, then auto-dispose the entire chain.
   * @throws {RangeError} If `count` is not a positive integer.
   */
  takeAndDispose(count: number): Event<T>;

  /**
   * Skip the first `count` emissions, then pass everything through.
   * @throws {RangeError} If `count` is not a non-negative integer.
   */
  skipFirst(count: number): Event<T>;

  /**
   * Debounce emissions, emit once after `ms` milliseconds of silence,
   * then auto-dispose the entire chain.
   * @throws {RangeError} If `ms` is negative or not a number.
   */
  debounceAndDispose(ms: number): Event<T>;

  /**
   * Only emit when the value differs from the previous emission.
   * Uses reference equality (`===`) by default, or a custom comparator.
   */
  distinctUntilChanged(comparator?: (prev: T, next: T) => boolean): Event<T>;

  /**
   * Log each emission with a label, then pass the value through unchanged.
   * Useful for debugging reactive chains.
   */
  debug(label?: string): Event<T>;

  /**
   * Convert this Event into an Observable with an initial value.
   * Future emissions update the Observable's stored value.
   */
  asObservable(initialValue: T): Observable<T>;

  /**
   * Returns a Promise that resolves with the next emitted value.
   * Automatically unsubscribes after the first emission.
   */
  firstValue(): Promise<T>;

  /**
   * Alias for `firstValue()`. Returns a Promise that resolves with
   * the next emitted value.
   */
  toPromise(): Promise<T>;

  /**
   * Tear down this Event and the entire upstream operator chain.
   * Removes all subscribers and child nodes, detaches from parent nodes,
   * clears pending timers, and recursively disposes upstream Events.
   * Does NOT dispose user-created Observables at the root of a chain.
   */
  dispose(): void;
}

/**
 * A reactive value container that holds state and notifies subscribers on change.
 *
 * Observable is the primary source of reactivity. It stores a current value
 * accessible via `.value` and pushes updates to subscribers when `.set()` is
 * called. Subscribers receive the current value immediately upon subscribing
 * (BehaviorSubject semantics).
 *
 * Operators like `.map()` and `.filter()` return an Event (a derived stream
 * without stored state). Use `.asObservable()` on an Event to convert back.
 */
export class Observable<T> {
  /** Create an Observable with an initial value. */
  constructor(initialValue: T);

  /** The current value of this Observable. */
  readonly value: T;

  /** Update the stored value and notify all subscribers and derived chains. */
  set(newValue: T): void;

  /**
   * Subscribe to this Observable. The callback is invoked immediately with
   * the current value, then again each time the value changes.
   */
  subscribe(callback: (value: T) => void): Dispose;

  /** Transform each emitted value. Returns a new Event (not Observable). */
  map<U>(fn: (value: T) => U): Event<U>;

  /**
   * Filter emissions by predicate. Values that do not satisfy the predicate
   * are silently dropped. Returns a new Event.
   */
  filter(predicate: (value: T) => boolean): Event<T>;

  /**
   * Run a side-effect for each emitted value without altering it.
   * The value passes through unchanged. Returns a new Event.
   */
  execute(fn: (value: T) => void): Event<T>;

  /**
   * Debounce emissions — waits for `ms` milliseconds of silence before
   * emitting the most recent value. Returns a new Event.
   * @throws {RangeError} If `ms` is negative or not a number.
   */
  debounce(ms: number): Event<T>;

  /**
   * Take the first `count` emissions, then auto-dispose the entire chain.
   * @throws {RangeError} If `count` is not a positive integer.
   */
  takeAndDispose(count: number): Event<T>;

  /**
   * Skip the first `count` emissions, then pass everything through.
   * @throws {RangeError} If `count` is not a non-negative integer.
   */
  skipFirst(count: number): Event<T>;

  /**
   * Debounce emissions, emit once after `ms` milliseconds of silence,
   * then auto-dispose the entire chain.
   * @throws {RangeError} If `ms` is negative or not a number.
   */
  debounceAndDispose(ms: number): Event<T>;

  /**
   * Only emit when the value differs from the previous emission.
   * Uses reference equality (`===`) by default, or a custom comparator.
   */
  distinctUntilChanged(comparator?: (prev: T, next: T) => boolean): Event<T>;

  /**
   * Log each emission with a label, then pass the value through unchanged.
   */
  debug(label?: string): Event<T>;

  /**
   * Race this Observable's emissions against another Event. The first to
   * emit wins; the loser is permanently ignored.
   */
  raceEvent<U>(other: Event<U>): Event<T | U>;

  /**
   * Combine this Observable's emissions with another Event. Emits [A, B]
   * tuples once both have emitted at least once (combineLatest semantics).
   */
  combineEvent<U>(other: Event<U>): Event<[T, U]>;

  /**
   * Buffer the latest value and only emit it when `otherEvent` fires.
   */
  waitForEvent(otherEvent: Event<any>): Event<T>;

  /**
   * Returns a Promise that resolves with the next emitted value.
   * Automatically unsubscribes after the first emission.
   */
  firstValue(): Promise<T>;

  /**
   * Alias for `firstValue()`.
   */
  toPromise(): Promise<T>;

  /**
   * Tear down this Observable. Removes all subscribers and child nodes.
   * For derived Observables (from `.asObservable()`), cascades disposal
   * up the chain. For root Observables, just clears local state.
   */
  dispose(): void;
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

/**
 * Create an Event that emits incrementing integers (0, 1, 2, …) at a
 * fixed interval.
 * Caution: the first value is not emitted immediately, but after the defined ms
 * @param ms Interval in milliseconds between emissions.
 * @returns `event` to subscribe to, `dispose` to stop the interval.
 */
export function ticker(ms: number): { event: Event<number>; dispose: Dispose };

/**
 * Create an Event that fires a single `0` after a one-time delay.
 * @param ms Delay in milliseconds before emission.
 * @returns `event` to subscribe to, `dispose` to cancel before it fires.
 */
export function timer(ms: number): { event: Event<number>; dispose: Dispose };

/**
 * Merge multiple Events into a single Event that emits whenever any
 * source emits. Unlike `combineEvent`, emissions are forwarded immediately.
 * @param events Two or more Events to merge.
 * @throws {RangeError} If fewer than 2 events are provided.
 */
export function mergeEvents<T>(...events: Event<T>[]): { event: Event<T>; dispose: Dispose };

/**
 * Create an Event from a Promise. Emits the resolved value once.
 * Does not emit if the promise rejects.
 */
export function fromPromise<T>(promise: Promise<T>): { event: Event<T>; dispose: Dispose };

/**
 * Create an Event from a DOM EventTarget.
 * @param target The target to listen on (e.g. `document`, an `HTMLElement`).
 * @param eventName The event name (e.g. `'click'`, `'input'`).
 */
export function fromEvent<K extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  eventName: K,
): { event: Event<HTMLElementEventMap[K]>; dispose: Dispose };
export function fromEvent(
  target: EventTarget,
  eventName: string,
): { event: Event<globalThis.Event>; dispose: Dispose };

/**
 * Set a global error handler for exceptions thrown by subscriber callbacks.
 * By default, errors are re-thrown. Setting a handler prevents a single
 * throwing subscriber from breaking sibling notifications.
 */
export function setOnError(handler: (error: unknown) => void): void;
