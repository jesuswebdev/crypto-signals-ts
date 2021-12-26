import { INTERVAL, MESSAGE_BROKER_URI } from './config/index';
import { Observer } from './Observer';
import { PAIRS } from '@jwd-crypto-signals/common';

const observer = new Observer({
  pairs: PAIRS.map(p => p.symbol),
  interval: INTERVAL,
  messageBrokerUri: MESSAGE_BROKER_URI
});

observer.init();
