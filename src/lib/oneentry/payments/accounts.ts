'use server';
import { oneentry } from '../index';

export interface PaymentAccount {
  id: number;
  identifier: string;
  type: 'stripe' | 'custom';
  title: string;
  description: string;
  isVisible: boolean;
}

// Fetches all payment accounts from OneEntry. Returns only the visible ones —
// hidden accounts stay in the admin panel but are excluded from checkout.
// The SDK unwraps localizeInfos to a single-locale object based on the
// x-app-token; the checkout doesn't need multi-locale variants here.
export async function getPaymentAccountsAction(): Promise<PaymentAccount[]> {
  if (!oneentry) return [];
  try {
    const raw = await oneentry.Payments.getAccounts();
    if (!Array.isArray(raw)) return [];
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
  } catch {
    return [];
  }
}
