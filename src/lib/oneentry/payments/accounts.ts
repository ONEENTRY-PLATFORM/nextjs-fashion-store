'use server';
import { getApiSafe, isError } from '@/lib/oneentry/index';
import { logCaught } from '@/lib/oneentry/log';

export interface PaymentAccount {
  id: number;
  identifier: string;
  type: 'stripe' | 'custom';
  title: string;
  description: string;
  isVisible: boolean;
}

// Fetches all payment accounts from OneEntry.
export async function getPaymentAccountsAction(): Promise<PaymentAccount[]> {
  const api = getApiSafe();
  if (!api) return [];
  try {
    const raw = await api.Payments.getAccounts();
    if (isError(raw) || !Array.isArray(raw)) return [];
    return raw
      .filter((acc) => acc.isVisible !== false)
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
