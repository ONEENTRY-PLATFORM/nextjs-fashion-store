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

/** Resolve an OE `pageUrl` to a storefront href. */
export function footerHref(pageUrl: string): string {
  const url = (pageUrl ?? '').trim();
  if (!url) return '/';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return url;
  return `/${url}`;
}

const nodeLabel = (node: MenuPageNode): string => (node.menuTitle || node.title || '').trim();

/** Whether a node points somewhere. */
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

/** Link columns for the footer body: every root node of the `footer` menu that has children becomes a column, its children become the links. */
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

/** Legal links for the bottom bar: the childless root nodes of the menu. */
export function footerBottomLinksFromMenu(nodes: MenuPageNode[]): FooterLinkItem[] {
  return (
    [...nodes]
      .filter((n) => n.children.length === 0)
      // A column header is a custom menu item carrying `-` as its address.
      .filter((n) => isAddressable(n.pageUrl))
      .sort(byPosition)
      .map(toLink)
      .filter((l) => l.label.length > 0)
  );
}
