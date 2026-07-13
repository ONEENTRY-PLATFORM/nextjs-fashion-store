'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { DeliveryMethodInfo } from './delivery-methods';

const Ctx = createContext<DeliveryMethodInfo | null>(null);

export function DeliveryMethodInfoProvider({
  data,
  children,
}: {
  data: DeliveryMethodInfo;
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

/** Read the OE-populated method copy inside a client component. Returns `null`
 *  when the provider is missing so callers can safely fall back to their local
 *  literal labels (Storybook, unit tests). */
export function useDeliveryMethodInfo(): DeliveryMethodInfo | null {
  return useContext(Ctx);
}
