import { ConsumeMessage } from 'amqplib';

/**
 *
 * @param v value to check
 * @description Asserts wether a number is valid or not.
 * Invalid values include: `undefined`, `null`, `Infinity`, `-Infinity`, `NaN`.
 */
export function numberIsValid(v: number) {
  return !(
    typeof v === 'undefined' ||
    v === null ||
    v === Infinity ||
    v === -Infinity ||
    isNaN(v)
  );
}

/**
 *
 * @description Replaces NaN values with zeros (or given value).
 * @param v value
 * @param d value to use if `v` is not valid
 */
export function nz(v: number, d?: number): number {
  return !numberIsValid(v) ? d ?? 0 : v;
}

export function numberSchemaValidation(n: number) {
  return (
    n === null ||
    (typeof n === 'number' && !isNaN(n) && n !== Infinity && n !== -Infinity)
  );
}

export function encodeRabbitMqMessage<T>(data: T): Buffer {
  return Buffer.from(JSON.stringify(data));
}

export function decodeRabbitMqMessage<T>(msg: ConsumeMessage): T {
  return JSON.parse(msg.content.toString());
}

export { PAIRS } from './btc_pairs';
export * from './MessageBroker';

/**
 * Interfaces
 */
export * from './interfaces/Candle';

/**
 * Models
 */
export * from './models/Candle';
