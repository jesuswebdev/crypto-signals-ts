import { ConsumeMessage } from 'amqplib';

function invalidNumber(v: number) {
  return (
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
  return invalidNumber(v) ? d ?? 0 : v;
}

export function encodeRabbitMqMessage<T>(data: T): Buffer {
  return Buffer.from(JSON.stringify(data));
}
export function decodeRabbitMqMessage<T>(msg: ConsumeMessage): T {
  return JSON.parse(msg.content.toString());
}

export { PAIRS } from './btc_pairs';
