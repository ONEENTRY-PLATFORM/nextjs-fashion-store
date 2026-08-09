import type { MenuPageNode } from './menus';

export interface FooterLinkItem {
  key: string;
  label: string;
  href: string;
}

export interface FooterColumn {
  key: string;
  title: string;
  links: FooterLinkItem[];
}

/**
 * Resolve an OE `pageUrl` to a storefront href.
 *
 * Editors type a page slug in the admin panel, not a route. Info pages are
 * registered under both `/{slug}` and `/info/{slug}` (see `pageRegistry.ts`),
 * and `/{slug}` is the canonical one — the same shape root routes like
 * `stores` and `sale` already use, so a bare prefix is right for every slug.
 * Absolute URLs and explicit paths pass through untouched.
 */
export function footerHref(pageUrl: string): string {
  const url = (pageUrl ?? '').trim();
  if (!url) return '/';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return url;
  return `/${url}`;
}

const nodeLabel = (node: MenuPageNode): string => (node.menuTitle || node.title || '').trim();

/**
 * Whether a node points somewhere. Custom menu items that exist only to group
 * their children carry `-` as their value, which the public read surfaces as
 * the node's `pageUrl`.
 */
const isAddressable = (pageUrl: string): boolean => {
  const url = (pageUrl ?? '').trim();
  return url.length > 0 && url !== '-';
};

const toLink = (node: MenuPageNode): FooterLinkItem => ({
  key: String(node.id),
  label: nodeLabel(node),
  href: footerHref(node.pageUrl),
});

const byPosition = (a: MenuPageNode, b: MenuPageNode) => (a.position ?? 0) - (b.position ?? 0);

/**
 * Link columns for the footer body: every root node of the `footer` menu that
 * has children becomes a column, its children become the links.
 *
 * Root nodes *without* children are legal — they are the legal/bottom-bar
 * links (see `footerBottomLinksFromMenu`), which is what a flat `footer` menu
 * produces. That split keeps a tenant that never nested anything working
 * exactly as before while letting one that does drive the columns from the CMS.
 */
export function footerColumnsFromMenu(nodes: MenuPageNode[]): FooterColumn[] {
  return [...nodes]
    .filter((n) => n.children.length > 0)
    .sort(byPosition)
    .map((n) => ({
      key: String(n.id),
      title: nodeLabel(n),
      links: [...n.children]
        .sort(byPosition)
        .map(toLink)
        .filter((l) => l.label.length > 0),
    }))
    .filter((col) => col.title.length > 0 && col.links.length > 0);
}

/**
 * Legal links for the bottom bar: the childless root nodes of the menu.
 */
export function footerBottomLinksFromMenu(nodes: MenuPageNode[]): FooterLinkItem[] {
  return (
    [...nodes]
      .filter((n) => n.children.length === 0)
      // A column header is a custom menu item carrying `-` as its address; one
      // whose links an editor has not added yet is childless and would otherwise
      // arrive here as a legal link pointing at `/-`.
      .filter((n) => isAddressable(n.pageUrl))
      .sort(byPosition)
      .map(toLink)
      .filter((l) => l.label.length > 0)
  );
}
