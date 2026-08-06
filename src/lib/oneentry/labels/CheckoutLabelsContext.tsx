'use client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { mergeDict } from './dict';
import type { CheckoutSetMarker, CheckoutSystemTexts } from './checkout-types';

const Ctx = createContext<CheckoutSystemTexts | null>(null);

export function CheckoutLabelsProvider({
  data,
  children,
}: {
  data: CheckoutSystemTexts;
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useT(
  set: CheckoutSetMarker,
  key: string,
  fallback: string,
): string {
  const data = useContext(Ctx);
  if (!data) return fallback;
  return data[set]?.[key] ?? fallback;
}

/**
 * Overlay a whole local dictionary with the admin panel's values.
 *
 * `useDict('checkout_delivery', 'checkout_delivery_', LABELS)` reads
 * `checkout_delivery_<snake_case_key>` for every string in `LABELS`. See
 * `dict.ts` for the naming convention.
 */
export function useCheckoutDict<T extends Record<string, unknown>>(
  set: CheckoutSetMarker,
  prefix: string,
  fallbacks: T,
): T {
  const data = useContext(Ctx);
  const dict = data?.[set];
  return useMemo(() => mergeDict(dict, prefix, fallbacks), [dict, prefix, fallbacks]);
}
