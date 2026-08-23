import { describe, expect, it } from 'vitest';

import { isOnlinePaymentAccount, type PaymentAccountType } from '@/lib/oneentry/payments/account-type';

describe('isOnlinePaymentAccount', () => {
  it('treats `custom` as the only offline provider', () => {
    expect(isOnlinePaymentAccount('custom')).toBe(false);
  });

  it('treats every hosted-checkout provider OE reports as online', () => {
    const hosted: PaymentAccountType[] = ['stripe', 'yookassa', 'midtrans', 'xendit'];
    for (const type of hosted) {
      expect(isOnlinePaymentAccount(type)).toBe(true);
    }
  });

  it('treats a provider the SDK union does not know yet as online, so the picker never silently drops it', () => {
    expect(isOnlinePaymentAccount('paypal' as PaymentAccountType)).toBe(true);
  });
});
