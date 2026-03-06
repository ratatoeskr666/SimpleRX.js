export { Event } from './event.js';
export { Observable } from './observable.js';
export { ticker, timer } from './factories.js';

// Side-effect: attaches all operators to prototypes
import './operators.js';
