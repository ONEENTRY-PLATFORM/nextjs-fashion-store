/** Provider kinds an OE payment account can have. Kept out of `accounts.ts` because that file is `'use server'` and may only export async functions. */
import type { IAccountsEntity } from 'oneentry/types';

/** Taken from the SDK so a provider added on the OE side widens this union instead of failing the build. */
export type PaymentAccountType = IAccountsEntity['type'];

/** Every provider except `custom` is hosted checkout: OE mints a session and the shopper is redirected off-site. Written as "not custom" so a newly supported provider is treated as online rather than silently dropped from the picker. */
export function isOnlinePaymentAccount(type: PaymentAccountType): boolean {
  return type !== 'custom';
}
