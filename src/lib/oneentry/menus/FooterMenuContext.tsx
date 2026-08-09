'use client';
import { createContext, type ReactNode, useContext } from 'react';

import type { MenuPageNode } from './menus';

/**
 * The footer reads two different OE menus, and they must not be merged:
 *
 * - `bottom_menu` holds the link **columns** — grouping custom items with the
 *   info pages hung under them.
 * - `footer` holds the flat **legal row** under the copyright line.
 *
 * Telling them apart by "does this node have children" would work only as long
 * as every column actually has its links filled in; a half-built column would
 * silently leak into the legal row.
 */
interface FooterMenus {
  /** Nodes that become the link columns. */
  columns: MenuPageNode[];
  /** Nodes that become the legal row. */
  legal: MenuPageNode[];
}

const Ctx = createContext<FooterMenus | null>(null);

/**
 * Publish both footer menus to the client.
 *
 * @param       props         - Provider props.
 * @param       props.columns - `bottom_menu` nodes.
 * @param       props.legal   - `footer` nodes.
 * @param       props.children - Subtree that reads them.
 * @returns                     The provided subtree.
 */
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

/** Nodes for the footer's link columns. Empty when the CMS has none. */
export function useFooterColumnsMenu(): MenuPageNode[] {
  return useContext(Ctx)?.columns ?? [];
}

/** Nodes for the footer's legal row. Empty when the CMS has none. */
export function useFooterMenu(): MenuPageNode[] {
  return useContext(Ctx)?.legal ?? [];
}
