import { PAIRS } from '@jwd-crypto-signals/common';
import { Observer } from './Observer';
import { INTERVAL, RABBITMQ_URI, RABBITMQ_CHANNEL } from './config/index';

try {
  if (!INTERVAL) {
    throw new Error('Candles interval is not defined');
  }
  if (!RABBITMQ_URI) {
    throw new Error('RabbitMQ URI is not defined');
  }
  if (!RABBITMQ_CHANNEL) {
    throw new Error('RabbitMQ channel is not defined');
  }

  const observer = new Observer({
    pairs: PAIRS.map(p => p.symbol),
    interval: INTERVAL
  });

  observer.init();
} catch (error) {
  console.error(error);
}
