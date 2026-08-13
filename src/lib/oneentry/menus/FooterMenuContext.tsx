'use client';
import { createContext, type ReactNode, useContext } from 'react';

import type { MenuPageNode } from './menus';

/** The footer reads two different OE menus, and they must not be merged: - `bottom_menu` holds the link **columns**. */
interface FooterMenus {
  /** Nodes that become the link columns. */
  columns: MenuPageNode[];
  /** Nodes that become the legal row. */
  legal: MenuPageNode[];
}

const Ctx = createContext<FooterMenus | null>(null);

/** Publish both footer menus to the client. */
export function FooterMenuProvider({
  columns,
  legal,
  children,
}: {
  columns: MenuPageNode[];
  legal: MenuPageNode[];
  children: ReactNode;
}) {
  return <Ctx.Provider value={{ columns, legal }}>{children}</Ctx.Provider>;
}

/** Nodes for the footer's link columns. */
export function useFooterColumnsMenu(): MenuPageNode[] {
  return useContext(Ctx)?.columns ?? [];
}

/** Nodes for the footer's legal row. */
export function useFooterMenu(): MenuPageNode[] {
  return useContext(Ctx)?.legal ?? [];
}
