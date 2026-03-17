export { Event } from './event.js';
export { Observable } from './observable.js';
export { ticker, timer, mergeEvents, fromPromise, fromEvent } from './factories.js';
export { setOnError } from './signal.js';

// Side-effect: attaches all operators to prototypes
import './operators.js';
