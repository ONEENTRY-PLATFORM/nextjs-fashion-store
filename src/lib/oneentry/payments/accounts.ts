'use server';
import { getApiSafe, isError } from '@/lib/oneentry/index';
import { logCaught } from '@/lib/oneentry/log';
import type { PaymentAccountType } from '@/lib/oneentry/payments/account-type';

export interface PaymentAccount {
  id: number;
  identifier: string;
  type: PaymentAccountType;
  title: string;
  description: string;
  isVisible: boolean;
}

/**
 * Fetches the payment accounts a shopper may actually be offered.
 *
 * Three gates, each of which used to be missing and each of which fails at a
 * different, later point:
 *
 * - `isVisible` — the admin hid the account from the storefront.
 * - `isUsed` — the account exists but is switched off. Offering it creates the
 *   order and then fails, which is the worst possible moment.
 * - `settings.status === 'connected'` — the account is enabled but carries no
 *   working credentials. `createSession` answers `400 "Your payment account is
 *   not connected."` *after* `createOrder` has already succeeded, leaving the
 *   shopper with an unpaid order and no way back. Ported from the beauty
 *   template, which hit exactly this in production.
 *
 * Still open (audit finding 34): the list is not intersected with the order
 * storage's `paymentAccountIdentifiers`, because the chosen delivery method —
 * and so the storage — is not known on the payment page. Closing that needs the
 * method plumbed through checkout, not a change here.
 */
export async function getPaymentAccountsAction(): Promise<PaymentAccount[]> {
  const api = getApiSafe();
  if (!api) return [];
  try {
    const raw = await api.Payments.getAccounts();
    if (isError(raw) || !Array.isArray(raw)) return [];
    return raw
      .filter((acc) => acc.isVisible !== false)
      .filter((acc) => acc.isUsed !== false)
      .filter((acc) => {
        // Absent settings must not hide an account: older payloads omit the
        // block entirely, and treating that as "not connected" would empty the
        // picker for everyone.
        const status = acc.settings?.status;
        return status === undefined || status === 'connected';
      })
      .map((acc) => ({
        id: acc.id,
        identifier: acc.identifier,
        type: acc.type,
        title: acc.localizeInfos?.title ?? acc.identifier,
        description: (acc.localizeInfos?.plainValue ?? '') || '',
        isVisible: acc.isVisible ?? true,
      }));
  } catch (err) {
    logCaught('accounts.getPaymentAccountsAction', err);
    return [];
  }
}
