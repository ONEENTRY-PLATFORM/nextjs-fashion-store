'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { MenuPageNode } from './menus';

const Ctx = createContext<MenuPageNode[] | null>(null);

export function FooterMenuProvider({
  data,
  children,
}: {
  data: MenuPageNode[];
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useFooterMenu(): MenuPageNode[] {
  return useContext(Ctx) ?? [];
}
