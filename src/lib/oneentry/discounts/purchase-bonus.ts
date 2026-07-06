import { unstable_cache } from 'next/cache';
import { getApi, isError, isOneEntryEnabled } from '../index';
import { DEFAULT_LOCALE } from '../locale';
import { REVALIDATE_CATALOG } from '../../isr';
import type { CatalogProduct } from '../catalog/products';

/** OE `Discounts.getDiscountByMarker` marker for the "bonus per purchase" rule
 *  that the tenant admin manages from the OE admin panel. */
const PURCHASE_BONUS_MARKER = 'purchase-of-goods';

/** SDK typings say `IDiscountCondition.value` is a string, but real payloads
 *  return objects (e.g. `{ ids: [...] }`, `{ amount: 100 }`) — narrow locally. */
type RawCondition = {
  type?: string;
  conditionType?: string;
  value?: unknown;
};

type RawDiscountValue = {
  value?: number;
  discountType?: string;
  applicability?: string;
  maxAmount?: number | null;
};

type RawBonusRule = {
  identifier?: string;
  startDate?: string;
  endDate?: string;
  discountValue?: RawDiscountValue;
  conditions?: RawCondition[];
};

function condType(c: RawCondition): string {
  return (c.type ?? c.conditionType ?? '').toUpperCase();
}

/** Pull numeric ids out of a condition value regardless of shape:
 *  scalar, array, or `{ ids: [...] }` / `{ id: N }`. */
function extractIds(value: unknown): number[] {
  if (value == null) return [];
  if (typeof value === 'number') return Number.isFinite(value) ? [value] : [];
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? [n] : [];
  }
  if (Array.isArray(value)) return value.flatMap((v) => extractIds(v));
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('ids' in obj) return extractIds(obj.ids);
    if ('id' in obj) return extractIds(obj.id);
  }
  return [];
}

/** Pull category needles (ids, markers, or paths) out of a condition value. */
function extractCategoryNeedles(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === 'string' || typeof value === 'number') return [String(value)];
  if (Array.isArray(value)) return value.flatMap((v) => extractCategoryNeedles(v));
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const nested = obj.ids ?? obj.markers ?? obj.paths ?? obj.id ?? obj.marker ?? obj.path;
    if (nested != null) return extractCategoryNeedles(nested);
  }
  return [];
}

function categoryMatches(needle: string, productCategories: string[]): boolean {
  return productCategories.some((cat) =>
    cat === needle
    || cat.split('/').filter(Boolean).includes(needle)
    || cat.includes(needle),
  );
}

/** Fetch the `purchase-of-goods` bonus rule once per revalidation window. */
const loadPurchaseBonusRuleCached = unstable_cache(
  async (): Promise<RawBonusRule | null> => {
    const result = await getApi().Discounts.getDiscountByMarker(
      PURCHASE_BONUS_MARKER,
      DEFAULT_LOCALE,
    );
    if (isError(result)) return null;
    return result as unknown as RawBonusRule;
  },
  ['oe-discount-purchase-of-goods'],
  { revalidate: REVALIDATE_CATALOG, tags: ['oe-discounts'] },
);

/** Compute the bonus points a shopper earns when buying `oeProduct` under the
 *  `purchase-of-goods` rule. Returns `null` when the rule is missing, inactive,
 *  or does not apply to this product. `1 bonus = 1 currency unit`, so a PERCENT
 *  rule of 5% on a $126 product yields ~6 points. */
export async function loadPurchaseBonusForProduct(
  oeProduct: Pick<CatalogProduct, 'id' | 'price' | 'categories'>,
): Promise<{ points: number } | null> {
  if (!isOneEntryEnabled) return null;

  const rule = await loadPurchaseBonusRuleCached();
  if (!rule || !rule.discountValue) return null;

  const now = Date.now();
  if (rule.startDate && new Date(rule.startDate).getTime() > now) return null;
  if (rule.endDate && new Date(rule.endDate).getTime() < now) return null;

  const conditions = rule.conditions ?? [];
  const productConds = conditions.filter((c) => condType(c) === 'PRODUCT');
  const categoryConds = conditions.filter((c) => condType(c) === 'CATEGORY');

  // Rule with per-product or per-category scope: at least one such condition
  // must match the current product. Other condition kinds (MIN_CART_AMOUNT,
  // USER_LTV, etc.) are cart/user-scoped and don't gate the PDP badge.
  if (productConds.length > 0 || categoryConds.length > 0) {
    const productMatches = productConds.some((c) =>
      extractIds(c.value).includes(oeProduct.id),
    );
    const categoryMatchesRule = categoryConds.some((c) =>
      extractCategoryNeedles(c.value).some((needle) =>
        categoryMatches(needle, oeProduct.categories),
      ),
    );
    if (!productMatches && !categoryMatchesRule) return null;
  }

  const dv = rule.discountValue;
  const dtype = (dv.discountType ?? '').toUpperCase();
  const rawValue = Number(dv.value ?? 0);
  if (!Number.isFinite(rawValue) || rawValue <= 0) return null;

  let points = 0;
  if (dtype === 'PERCENT' || dtype === 'PERCENTAGE') {
    points = Math.round((oeProduct.price * rawValue) / 100);
  } else if (dtype === 'FIXED_AMOUNT') {
    points = Math.round(rawValue);
  }
  if (points <= 0) return null;

  return { points };
}
