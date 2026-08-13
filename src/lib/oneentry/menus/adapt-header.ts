import type { Gender, SubCat } from '@/app/data/categories';

import type { MenuPageNode } from './menus';

/** Shape consumed by `Header` / `HeaderMobileDrawer` — mirrors the legacy hardcoded `MEGA_DATA` object. */
export interface HeaderMegaItem {
  label: string;
  /** OE `pageUrl` of the leaf node — used to filter the catalog by that specific category path. */
  pageUrl: string;
}
export type HeaderMega = Record<Gender, Record<Exclude<SubCat, null>, { title: string; items: HeaderMegaItem[] }[]>>;

const SUBCAT_KEYS: Exclude<SubCat, null>[] = ['shoes', 'clothing', 'bags', 'accessories'];

const norm = (s: string) => s.toLowerCase().trim();

/** Try to match a node against a known gender by string. */
const matchGender = (node: MenuPageNode): Gender | null => {
  const n = norm(node.pageUrl) || norm(node.menuTitle) || norm(node.title);
  if (n.includes('women')) return 'women';
  if (n.includes('men')) return 'men';
  return null;
};

/** Same idea for subcats. */
const matchSubCat = (node: MenuPageNode): Exclude<SubCat, null> | null => {
  const n = norm(node.pageUrl) || norm(node.menuTitle) || norm(node.title);
  for (const key of SUBCAT_KEYS) if (n.includes(key)) return key;
  return null;
};

/** Turn the OE `header` menu tree into the mega-menu shape the storefront already knows how to render. */
export function adaptHeaderMenuToMega(pages: MenuPageNode[]): HeaderMega | null {
  if (!pages || pages.length === 0) return null;

  const out: HeaderMega = {
    women: { shoes: [], clothing: [], bags: [], accessories: [] },
    men: { shoes: [], clothing: [], bags: [], accessories: [] },
  };

  // Pass 1: keyword matching per gender.
  const genderNodes: Record<Gender, MenuPageNode | null> = { women: null, men: null };
  for (const node of pages) {
    const g = matchGender(node);
    if (g && !genderNodes[g]) genderNodes[g] = node;
  }
  // Pass 2: positional fill for whichever gender didn't keyword-match.
  const orphanPages = pages.filter((p) => matchGender(p) === null);
  if (!genderNodes.women && orphanPages[0]) genderNodes.women = orphanPages[0];
  if (!genderNodes.men) genderNodes.men = orphanPages[genderNodes.women === orphanPages[0] ? 1 : 0] ?? null;

  for (const g of ['women', 'men'] as Gender[]) {
    const genderNode = genderNodes[g];
    if (!genderNode) continue;
    const children = genderNode.children ?? [];

    // Pass 1: keyword matching for subcats.
    const subNodes: Record<Exclude<SubCat, null>, MenuPageNode | null> = {
      shoes: null,
      clothing: null,
      bags: null,
      accessories: null,
    };
    for (const child of children) {
      const s = matchSubCat(child);
      if (s && !subNodes[s]) subNodes[s] = child;
    }
    // Pass 2: positional fill — assign remaining unmatched children to the subcategory slots that are still empty, in order.
    const usedIds = new Set(
      Object.values(subNodes)
        .filter((n): n is MenuPageNode => n !== null)
        .map((n) => n.id),
    );
    const orphans = children.filter((c) => !usedIds.has(c.id));
    for (const key of SUBCAT_KEYS) {
      if (subNodes[key]) continue;
      const next = orphans.shift();
      if (!next) break;
      subNodes[key] = next;
    }

    for (const key of SUBCAT_KEYS) {
      const subNode = subNodes[key];
      if (!subNode) continue;
      // Two shapes of subcategory tree in OE: 1.
      const level3 = subNode.children ?? [];
      const isFlat = level3.length > 0 && level3.every((n) => (n.children ?? []).length === 0);
      if (isFlat) {
        const items: HeaderMegaItem[] = level3
          .map((n) => ({ label: (n.menuTitle || n.title || '').trim(), pageUrl: (n.pageUrl || '').trim() }))
          .filter((it) => it.label.length > 0);
        if (items.length > 0) {
          out[g][key].push({ title: key.toUpperCase(), items });
        }
        continue;
      }
      for (const columnNode of level3) {
        const title = (columnNode.menuTitle || columnNode.title || '').trim();
        if (!title) continue;
        const items: HeaderMegaItem[] = (columnNode.children ?? [])
          .map((n) => ({ label: (n.menuTitle || n.title || '').trim(), pageUrl: (n.pageUrl || '').trim() }))
          .filter((it) => it.label.length > 0);
        if (items.length === 0) continue;
        out[g][key].push({ title: title.toUpperCase(), items });
      }
    }
  }

  // Return null only if we couldn't extract anything useful at all, so the dropdown just doesn't render (rather than showing an empty white panel).
  const empty = SUBCAT_KEYS.every((k) => out.women[k].length === 0 && out.men[k].length === 0);
  return empty ? null : out;
}
