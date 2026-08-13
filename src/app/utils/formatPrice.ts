import { CURRENCY } from '@/app/data/currencyConfig';

export const fmt = (n: number) => CURRENCY.format(n);

/** Strip trailing zeros (and dangling decimal point) from any pre-formatted price string. */
export function stripTrailingZeros(price: string | undefined | null): string {
  if (typeof price !== 'string') return '';
  return price.replace(/(\.\d*?)0+(?!\d)/g, '$1').replace(/\.(?!\d)/g, '');
}
