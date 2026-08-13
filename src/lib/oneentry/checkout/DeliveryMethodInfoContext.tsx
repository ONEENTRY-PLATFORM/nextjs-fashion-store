'use client';
import { createContext, type ReactNode, useContext } from 'react';

import type { DeliveryMethodInfo } from './delivery-methods';

const Ctx = createContext<DeliveryMethodInfo | null>(null);

export function DeliveryMethodInfoProvider({ data, children }: { data: DeliveryMethodInfo; children: ReactNode }) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

/** Read the OE-populated method copy inside a client component. */
export function useDeliveryMethodInfo(): DeliveryMethodInfo | null {
  return useContext(Ctx);
}
