import { PAIRS } from '@jwd-crypto-signals/common';
import { Observer } from './Observer';
import { INTERVAL, MESSAGE_BROKER_URI } from './config/index';

try {
  if (!INTERVAL) {
    throw new Error('Candles interval is not defined');
  }

  if (!MESSAGE_BROKER_URI) {
    throw new Error('Message Broker URI is not defined');
  }

  const observer = new Observer({
    pairs: PAIRS.map(p => p.symbol),
    interval: INTERVAL,
    messageBrokerUri: MESSAGE_BROKER_URI
  });

  observer.init();
} catch (error) {
  console.error(error);
}
