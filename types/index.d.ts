export type Dispose = () => void;

export class Event<T = void> {
  emit(value: T): void;
  subscribe(callback: (value: T) => void): Dispose;
  map<U>(fn: (value: T) => U): Event<U>;
}

export class Observable<T> {
  constructor(initialValue: T);
  readonly value: T;
  set(newValue: T): void;
  subscribe(callback: (value: T) => void): Dispose;
  map<U>(fn: (value: T) => U): Observable<U>;
}
