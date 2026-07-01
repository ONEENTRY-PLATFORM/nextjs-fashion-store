'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { SignInDict } from './sign-in-types';

const Ctx = createContext<SignInDict | null>(null);

export function SignInLabelsProvider({
  data,
  children,
}: {
  data: SignInDict;
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useSignInT(key: string, fallback: string): string {
  const data = useContext(Ctx);
  if (!data) return fallback;
  return data[key] ?? fallback;
}
