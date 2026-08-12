/* ════════════════════════════════════════════
   NAVIGATION — MEGA MENU
════════════════════════════════════════════ */
export type Gender = 'women' | 'men';
export type SubCat = 'shoes' | 'clothing' | 'bags' | 'accessories' | null;
export interface MegaSectionItem {
  label: string;
  pageUrl: string;
}
export interface MegaSection {
  title: string;
  items: MegaSectionItem[];
}

export const SUB_CATEGORIES = ['Shoes', 'Clothing', 'Bags', 'Accessories', 'New', 'Sale'];

/* ════════════════════════════════════════════
   HOME — SHOP BY CATEGORY SECTION
════════════════════════════════════════════ */
export interface ShopCategory {
  id: string;
  label: string;
  href: string;
  image: string;
  /**
   * Blur data URI for `next/image`'s `blurDataURL`. Present only for CMS
   *  pictures uploaded through an OE preview template — the hard-coded
   *  fallback categories below have none.
   */
  imageBlur?: string;
  chip: string; // which filter chip this belongs to
}

// The image table and the `?key=value` helper that built them went with
// `SHOP_CATEGORIES` / `CATEGORY_FILTER_CHIPS`: the home category tiles come from
// OneEntry now, so nothing here needs a hard-coded Unsplash URL any more.
