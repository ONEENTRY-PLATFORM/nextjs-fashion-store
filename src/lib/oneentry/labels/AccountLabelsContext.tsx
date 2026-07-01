'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { AccountSetMarker, AccountSystemTexts } from './account-types';

const Ctx = createContext<AccountSystemTexts | null>(null);

export function AccountLabelsProvider({
  data,
  children,
}: {
  data: AccountSystemTexts;
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useT(
  set: AccountSetMarker,
  key: string,
  fallback: string,
): string {
  const data = useContext(Ctx);
  if (!data) return fallback;
  return data[set]?.[key] ?? fallback;
}
