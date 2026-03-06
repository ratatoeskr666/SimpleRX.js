export type Dispose = () => void;

export class Event<T = void> {
  subscribe(callback: (value: T) => void): Dispose;
  map<U>(fn: (value: T) => U): Event<U>;
  asObservable(initialValue: T): Observable<T>;
}

export class Observable<T> {
  constructor(initialValue: T);
  readonly value: T;
  set(newValue: T): void;
  subscribe(callback: (value: T) => void): Dispose;
  map<U>(fn: (value: T) => U): Event<U>;
}
