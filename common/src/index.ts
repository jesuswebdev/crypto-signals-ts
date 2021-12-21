import { MILLISECONDS } from './constants';

/**
 *
 * @param v value to check
 * @description Asserts wether a number is valid or not.
 * Invalid values include: `undefined`, `null`, `Infinity`, `-Infinity`, `NaN`.
 */
export const numberIsValid = function numberIsValid(v: number) {
  return !(
    typeof v === 'undefined' ||
    v === null ||
    v === Infinity ||
    v === -Infinity ||
    isNaN(v)
  );
};

/**
 *
 * @description Replaces NaN values with zeros (or given value).
 * @param v value
 * @param d value to use if `v` is not valid
 */
export const nz = function nz(v: number, d?: number): number {
  return !numberIsValid(v) ? d ?? 0 : v;
};

export const numberSchemaValidation = function numberSchemaValidation(
  n: number
) {
  return (
    n === null ||
    (typeof n === 'number' && !isNaN(n) && n !== Infinity && n !== -Infinity)
  );
};

/**
 *
 * @param candles Candle count
 * @param interval Candle interval
 * @returns The product of candles * interval (converted to milliseconds)
 * @example given candles = 5, and interval = 1m. The result would be 5 * 60000.
 */
export const getTimeDiff = function getTimeDiff(
  candles: number,
  interval: string
) {
  let ms = 0;

  if (interval === '1d') {
    ms = MILLISECONDS.DAY;
  } else if (interval === '4h') {
    ms = MILLISECONDS.HOUR * 4;
  } else if (interval === '1h') {
    ms = MILLISECONDS.HOUR;
  } else if (interval === '15m') {
    ms = MILLISECONDS.MINUTE * 15;
  } else if (interval === '5m') {
    ms = MILLISECONDS.MINUTE * 5;
  } else if (interval === '1m') {
    ms = MILLISECONDS.MINUTE;
  }

  return ms * candles;
};

/**
 *
 * @param value
 * @description Returns `true` if the given `value` is equal to `true`, `'true'`, or `1` and `false` otherwise.
 */
export const getBooleanValue = function getBooleanValue(
  value: string | boolean | number | null | undefined
) {
  const isString = typeof value === 'string';
  const isBoolean = typeof value === 'boolean';
  const isNumber = typeof value === 'number';

  if (isBoolean) {
    return value;
  }

  if (isString) {
    return value === 'true';
  }

  if (isNumber) {
    return value === 1;
  }

  return false;
};

export { PAIRS } from './btc_pairs';
export * from './MessageBroker';
export * from './constants';

/**
 * Interfaces
 */
export * from './interfaces';

/**
 * Models
 */
export * from './models';
