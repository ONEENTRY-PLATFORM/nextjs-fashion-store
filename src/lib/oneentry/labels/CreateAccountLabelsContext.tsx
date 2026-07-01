'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { CreateAccountDict } from './create-account-types';

const Ctx = createContext<CreateAccountDict | null>(null);

export function CreateAccountLabelsProvider({
  data,
  children,
}: {
  data: CreateAccountDict;
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useCreateAccountT(key: string, fallback: string): string {
  const data = useContext(Ctx);
  if (!data) return fallback;
  return data[key] ?? fallback;
}
