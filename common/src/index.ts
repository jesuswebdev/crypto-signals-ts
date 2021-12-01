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
function nz(v: number, d?: number): number {
  return invalidNumber(v) ? d ?? 0 : v;
}

export { nz };
export { PAIRS } from './btc_pairs';

