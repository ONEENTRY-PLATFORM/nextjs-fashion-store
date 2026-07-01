import { cache } from 'react';

// Local copy of the hex→name map. Importing the canonical map from
// `src/app/utils/colorNames` indirectly pulls a client-tagged module into
// this server-only graph and breaks Turbopack with "require is not defined".
const HEX_COLOR_NAMES: Record<string, string> = {
  '#000000': 'Black', '#FFFFFF': 'White', '#ffffff': 'White',
  '#808080': 'Gray', '#A0A0A0': 'Light Gray', '#C0C0C0': 'Silver',
  '#36454F': 'Charcoal', '#4A3728': 'Dark Brown', '#5C3A1E': 'Brown',
  '#8B4513': 'Saddle Brown', '#A0522D': 'Sienna', '#5C4A3A': 'Warm Brown',
  '#800020': 'Burgundy', '#8B0000': 'Dark Red', '#4A0000': 'Dark Maroon',
  '#1B3A5C': 'Navy', '#4169E1': 'Royal Blue', '#6495ED': 'Cornflower Blue',
  '#D4AF37': 'Gold', '#C4A882': 'Camel', '#C19A6B': 'Camel',
  '#F88A8A': 'Pink', '#FFB6C1': 'Blush', '#FFE4E1': 'Misty Rose',
  '#E8DCC8': 'Beige', '#F5E6D3': 'Cream', '#F5F5F0': 'Off-White',
  '#F5F0E8': 'Ivory', '#DA1E1E': 'Red', '#FF6B6B': 'Coral Red',
  '#FF6B00': 'Orange', '#FFD700': 'Yellow',
  '#808000': 'Olive', '#8B864E': 'Khaki', '#BDB76B': 'Khaki',
  '#556B2F': 'Olive Green', '#2E8B57': 'Forest Green', '#3D5A4C': 'Forest Green',
  '#800080': 'Purple',
};

// Structural duplicates of CatalogTemplate.types / ProductCard so this
// server-side module doesn't transitively pull a `'use client'` module into
// the RSC graph (which trips Turbopack with "require is not defined").
export interface ClothingFilterOption {
  label: string;
  count: number;
  color?: string;
}

export interface ClothingFilterGroup {
  label: string;
  key: string;
  options: ClothingFilterOption[];
  type?: 'checkbox' | 'color' | 'section' | 'search_checkbox' | 'price_range' | 'size_chips' | 'measure_range';
  columns?: number;
}

// Loose, structural shape — narrower than the storefront `Product` but
// compatible with it. Avoids importing the client-component-defined type
// into this server module.
type CountableProduct = {
  colors: string[];
  sizes?: string[];
  label?: string;
  // Allow any extra fields without forcing index signature.
  brand?: string;
  style?: string;
  material?: string;
  season?: string;
  brandCountry?: string;
  fit?: string;
  liningMaterial?: string;
  productDetails?: string[];
};

type RawChild = {
  type: string;
  marker?: string;
  value?: string;
  localizeInfos?: { en_US?: { title?: string } };
};

type RawGroup = {
  type: string;
  localizeInfos?: { en_US?: { title?: string } };
  position?: number;
  children?: RawChild[];
};

type RawFilter = {
  localizeInfos?: { en_US?: { title?: string } };
  items?: RawGroup[];
};

/**
 * OE filter group title → key on the storefront `Product` model. Filter
 * options on the catalog template are matched against products via this key
 * (see `filterProducts` in `data/filterUtils.ts`).
 *
 * Groups whose title isn't mapped here fall through unused — typically that
 * means the storefront product type doesn't capture that attribute yet.
 */
/**
 * 'color' and 'size' are virtual keys interpreted specially by
 * `filterProducts` — products store colors as a hex array and sizes as a
 * string array, so the key here doesn't map directly to a Product field.
 */
const FILTER_GROUP_KEY: Record<string, string> = {
  Style: 'style',
  'Fit (Rise)': 'fit',
  Details: 'productDetails',
  Brand: 'brand',
  Color: 'color',
  Size: 'size',
  Material: 'material',
  Lining: 'liningMaterial',
  Insulation: 'insulation',
  'Care Instructions': 'careInstructions',
  Season: 'season',
  Country: 'brandCountry',
  Label: 'label',
  Price: 'price',
};

// Explicit name→hex for the values OE actually emits in the `clothing`
// filter. Names that aren't covered by the canonical HEX_COLOR_NAMES
// (Grey, Green, Blue, Dark Blue, Assorted) get a sensible default here so
// every option in the OE filter has a swatch.
const OE_COLOR_HEX: Record<string, string> = {
  Black:       '#000000',
  White:       '#FFFFFF',
  Grey:        '#808080',
  Gray:        '#808080',
  Brown:       '#5C3A1E',
  Beige:       '#E8DCC8',
  Pink:        '#F88A8A',
  Red:         '#DA1E1E',
  Khaki:       '#8B864E',
  'Dark Blue': '#1B3A5C',
  Blue:        '#4169E1',
  Green:       '#2E8B57',
  // Multi-coloured fallback rendered as a conic gradient via the swatch
  // component; the storefront's color renderer treats `multi` specially.
  Assorted:    'multi',
};

const NAME_TO_HEX: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(HEX_COLOR_NAMES).map(([hex, name]) => [name, hex]),
  ),
  ...OE_COLOR_HEX,
};

const eqCI = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

/**
 * Render-time helper: count how many products carry the given filter value.
 * Storefront `Product.colors[]` holds color *names* from OE (e.g. "Khaki",
 * not the hex), so the color comparison matches by name not by swatch.
 * `Product.label` is uppercased by the OE adapter ("SALE"/"NEW"/"BESTSELLER")
 * while the OE filter values use title-case — match case-insensitively.
 */
function countMatches(products: CountableProduct[], key: string, label: string): number {
  if (key === 'color') {
    return products.filter((p) => p.colors.some((c) => eqCI(c, label))).length;
  }
  if (key === 'size') {
    return products.filter((p) => p.sizes?.some((s) => eqCI(s, label)) ?? false).length;
  }
  if (key === 'label') {
    return products.filter((p) => typeof p.label === 'string' && eqCI(p.label, label)).length;
  }
  return products.filter((p) => {
    const v = (p as unknown as Record<string, unknown>)[key];
    if (typeof v === 'string') return eqCI(v, label);
    if (Array.isArray(v)) return (v as string[]).some((s) => eqCI(s, label));
    return false;
  }).length;
}

const FILTER_TYPE_BY_KEY: Partial<Record<string, ClothingFilterGroup['type']>> = {
  color: 'color',
  size: 'size_chips',
  details: 'search_checkbox',
  productDetails: 'search_checkbox',
  careInstructions: 'search_checkbox',
  price: 'price_range',
};

const FILTER_COLUMNS_BY_KEY: Record<string, number> = {
  color: 3,
  size: 4,
  style: 2,
  brand: 3,
  material: 3,
  season: 2,
  brandCountry: 2,
  liningMaterial: 2,
  insulation: 2,
  careInstructions: 3,
  productDetails: 3,
  fit: 2,
  label: 2,
};

/**
 * Map an OE clothing-filter response to `FilterGroup[]` consumed by
 * `CatalogTemplate`. The `products` arg is used purely to compute per-option
 * counts — the option list itself comes from OE.
 */
function adaptFilterToGroups(raw: RawFilter, products: CountableProduct[]): ClothingFilterGroup[] {
  const groups: ClothingFilterGroup[] = [];
  for (const g of raw.items ?? []) {
    const groupTitle = g.localizeInfos?.en_US?.title ?? '';
    if (!groupTitle) continue;
    const key = FILTER_GROUP_KEY[groupTitle];
    if (!key) continue;

    if (key === 'price') {
      // OE price filter has no children — surface as a price-range slider that
      // the existing CatalogTemplate already knows how to render.
      groups.push({
        label: groupTitle,
        key: 'price',
        type: 'price_range',
        options: [],
      });
      continue;
    }

    const options: ClothingFilterOption[] = [];
    for (const c of g.children ?? []) {
      const rawLabel = c.localizeInfos?.en_US?.title ?? c.value ?? '';
      const label = rawLabel.trim();
      if (!label) continue;
      const count = countMatches(products, key, label);
      const opt: ClothingFilterOption = { label, count };
      if (key === 'color') {
        const hex = NAME_TO_HEX[label];
        if (hex) opt.color = hex;
      }
      options.push(opt);
    }
    if (options.length === 0) continue;

    groups.push({
      label: groupTitle,
      key,
      type: FILTER_TYPE_BY_KEY[key],
      columns: FILTER_COLUMNS_BY_KEY[key] ?? 2,
      options,
    });
  }
  return groups;
}

/**
 * Fetch the `clothing` filter from OneEntry and adapt to the storefront's
 * FilterGroup shape. Returns `null` when OE is unreachable so callers fall
 * back to the static filter definition.
 */
export const loadClothingFilter = cache(
  async (
    products: CountableProduct[],
    lang: string = 'en_US',
  ): Promise<ClothingFilterGroup[] | null> => {
    const url = process.env.ONEENTRY_URL;
    const appToken = process.env.ONEENTRY_TOKEN;
    if (!url || !appToken) return null;
    try {
      const res = await fetch(
        `${url}/api/content/filters/marker/clothing?langCode=${encodeURIComponent(lang)}`,
        {
          headers: {
            'x-app-token': appToken,
            accept: 'application/json',
          },
          cache: 'no-store',
        },
      );
      const txt = await res.text();
      if (!res.ok || !txt.trim().startsWith('{')) return null;
      const raw = JSON.parse(txt) as RawFilter;
      return adaptFilterToGroups(raw, products);
    } catch {
      return null;
    }
  },
);
