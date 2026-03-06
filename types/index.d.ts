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
   * Race this Event against another. The first source to emit wins —
   * all future emissions come only from the winner. The losing source
   * is permanently ignored.
   */
  raceEvent(other: Event<T>): Event<T>;

  /**
   * Combine this Event with another. Emits a `[A, B]` tuple containing
   * the latest value from each source. Only starts emitting once both
   * sources have emitted at least once (combineLatest semantics).
   */
  combineEvent<U>(other: Event<U>): Event<[T, U]>;

  /**
   * Convert this Event into an Observable with an initial value.
   * Future emissions update the Observable's stored value.
   */
  asObservable(initialValue: T): Observable<T>;
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
}
