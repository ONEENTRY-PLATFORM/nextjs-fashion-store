'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { MenuPageNode } from './menus';

const Ctx = createContext<MenuPageNode[] | null>(null);

export function HeaderMenuProvider({
  data,
  children,
}: {
  data: MenuPageNode[];
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

/** Returns the raw OE header menu tree. Consumers usually go through the
 *  adapter (`adaptHeaderMenuToMega`) instead of parsing this directly. */
export function useHeaderMenu(): MenuPageNode[] {
  return useContext(Ctx) ?? [];
}
