import { CURRENCY } from '../data/currencyConfig';

export const fmt = (n: number) => CURRENCY.format(n);

/** Strip trailing zeros (and dangling decimal point) from any pre-formatted
 *  price string. Examples:
 *    "$35.00"   → "$35"
 *    "$94.50"   → "$94.5"
 *    "$94.99"   → "$94.99"
 *    "$1,250.00"→ "$1,250"
 *  Safe to call on non-currency strings (returns input unchanged). */
export function stripTrailingZeros(price: string | undefined | null): string {
  if (typeof price !== 'string') return '';
  return price.replace(/(\.\d*?)0+(?!\d)/g, '$1').replace(/\.(?!\d)/g, '');
}
