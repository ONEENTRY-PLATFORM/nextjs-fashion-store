'use client';
import { createContext, useContext, type ReactNode } from 'react';
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
