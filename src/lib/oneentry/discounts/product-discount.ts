/** Product-price discounts sourced from the OneEntry Discounts module. */
import { unstable_cache } from 'next/cache';
import type { IDiscountCondition, IDiscountsEntity, IDiscountsResponse, IDiscountValue } from 'oneentry/types';

import { REVALIDATE_PRODUCT } from '@/lib/isr';
import { getApi, isError, isOneEntryEnabled } from '@/lib/oneentry/index';
import { DEFAULT_LOCALE } from '@/lib/oneentry/locale';
import { withTiming } from '@/lib/oneentry/profiling';

/**
 * Not derived from `IDiscountCondition`: that declares `value: string`, while real OE payloads
 * deliver `{ ids: [...] }` / `{ id: N }` / raw arrays, and it does not name `entityIds` at all.
 * Only the `type` union is worth borrowing — `conditionType` is the older spelling of the same field.
 */
interface RawCondition {
  type?: IDiscountCondition['type'] | string;
  conditionType?: string;
  value?: unknown;
  /** OE `ATTRIBUTE` conditions carry the attribute marker id here rather than in `value`. Example: `[{ id: 'discount_12', isNested: false }]`. */
  entityIds?: Array<{ id?: string; isNested?: boolean }> | null;
}

/** Slim shape of the discount payload we actually consume: `IDiscountsEntity` with every field optional and the two the API contradicts replaced. */
export interface RawProductDiscount extends Omit<Partial<IDiscountsEntity>, 'conditions'> {
  conditions?: RawCondition[];
}

// ─── Condition-value parsers ────────────────────────────────────────────────

function condType(c: RawCondition): string {
  return (c.type ?? c.conditionType ?? '').toUpperCase();
}

/** Pull numeric ids out of a condition value regardless of shape: scalar, array, or `{ ids: [...] }` / `{ id: N }`. */
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
  return productCategories.some(
    (cat) => cat === needle || cat.split('/').filter(Boolean).includes(needle) || cat.includes(needle),
  );
}

// ─── ATTRIBUTE-condition operators ──────────────────────────────────────────

/** Extract the attribute marker id (`discount_12`) from a condition's `entityIds`. OE always packs a single id per condition. */
function extractAttributeMarker(entityIds: RawCondition['entityIds']): string | null {
  if (!Array.isArray(entityIds) || entityIds.length === 0) return null;
  const first = entityIds[0];
  const id = typeof first?.id === 'string' ? first.id.trim() : '';
  return id || null;
}

/** `ATTRIBUTE.value` is `{ value: '10', condition: 'eq' }` in the OE admin output, but the SDK loosely types it as `string`. Normalize to a `{ operator, value }` pair we can compare against. */
function parseAttributeConditionValue(value: unknown): { operator: string; value: string | null } {
  if (value == null) return { operator: 'eq', value: null };
  if (typeof value === 'string' || typeof value === 'number') {
    return { operator: 'eq', value: String(value) };
  }
  if (typeof value === 'object') {
    const obj = value as { value?: unknown; condition?: unknown };
    const operator = (typeof obj.condition === 'string' ? obj.condition : 'eq').toLowerCase();
    const raw = obj.value;
    if (raw == null) return { operator, value: null };
    if (typeof raw === 'string' || typeof raw === 'number') return { operator, value: String(raw) };
  }
  return { operator: 'eq', value: null };
}

/** Compare a product's attribute value to a rule's expected value under the given OE operator. */
function attributeOperatorMatches(
  operator: string,
  productValue: string | undefined,
  expected: string | null,
): boolean {
  const op = operator.toLowerCase();
  // `exs` — attribute exists (any value).
  if (op === 'exs' || op === 'exists') return productValue != null && productValue !== '';
  if (op === 'nex' || op === 'not_exists' || op === 'nexs') return !productValue;
  if (productValue == null || productValue === '') return false;
  if (expected == null) return false;
  const a = productValue.trim().toLowerCase();
  const b = expected.trim().toLowerCase();
  switch (op) {
    case 'eq':
      return a === b;
    case 'neq':
    case 'ne':
      return a !== b;
    case 'gt':
      return Number(a) > Number(b);
    case 'gte':
    case 'ge':
      return Number(a) >= Number(b);
    case 'lt':
      return Number(a) < Number(b);
    case 'lte':
    case 'le':
      return Number(a) <= Number(b);
    case 'lke':
    case 'like':
    case 'contains':
      return a.includes(b);
    default:
      return a === b; // safest fallback matches purchase-bonus behaviour
  }
}

// ─── Active-window & applicability filters ──────────────────────────────────

function isActive(rule: RawProductDiscount, now: number): boolean {
  if (rule.startDate && new Date(rule.startDate).getTime() > now) return false;
  if (rule.endDate && new Date(rule.endDate).getTime() < now) return false;
  return true;
}

function isToProduct(rule: RawProductDiscount): boolean {
  const dv = rule.discountValue;
  if (!dv) return false;
  const applicability = (dv.applicability ?? '').toUpperCase();
  return applicability === 'TO_PRODUCT';
}

function isDiscountType(rule: RawProductDiscount): boolean {
  return (rule.type ?? '').toUpperCase() === 'DISCOUNT';
}

// ─── Loader ─────────────────────────────────────────────────────────────────

/** Page through `getAllDiscounts` — OE caps a single page at 200. */
async function fetchAllProductDiscounts(lang: string): Promise<RawProductDiscount[]> {
  if (!isOneEntryEnabled) return [];
  const items: RawProductDiscount[] = [];
  const PAGE = 200;
  for (let offset = 0; offset < 2000; offset += PAGE) {
    try {
      const result = await getApi().Discounts.getAllDiscounts(lang, offset, PAGE, 'DISCOUNT');
      if (isError(result)) break;
      const resp: Omit<IDiscountsResponse, 'items'> & { items?: RawProductDiscount[] } = result;
      const chunk = resp.items ?? [];
      items.push(...chunk);
      if (chunk.length < PAGE) break;
    } catch {
      break;
    }
  }
  return items;
}

/** Cross-request cache of the trimmed rule set. */
const loadProductDiscountsCached = unstable_cache(
  async (lang: string): Promise<RawProductDiscount[]> => {
    const all = await fetchAllProductDiscounts(lang);
    const now = Date.now();
    return all.filter((r) => {
      if (!isDiscountType(r)) return false;
      if (!isToProduct(r)) return false;
      if (!isActive(r, now)) return false;
      const conds = r.conditions ?? [];
      // Rule must gate on a product-scoped condition — otherwise we can't decide which products it applies to at load time.
      return conds.some((c) => {
        const t = condType(c);
        return t === 'PRODUCT' || t === 'CATEGORY' || t === 'ATTRIBUTE';
      });
    });
  },
  ['oe-product-discounts'],
  { revalidate: REVALIDATE_PRODUCT, tags: ['oe-discounts'] },
);

export const loadProductDiscounts = withTiming('loadProductDiscounts', async (): Promise<RawProductDiscount[]> =>
  loadProductDiscountsCached(DEFAULT_LOCALE),
);

// ─── Rule application ───────────────────────────────────────────────────────

interface ProductForDiscount {
  id: number;
  price: number;
  categories: string[];
  /** Attribute values keyed by full OE marker (e.g. `discount_12: '10'`). */
  discountAttributes?: Record<string, string>;
}

function ruleAppliesTo(rule: RawProductDiscount, p: ProductForDiscount): boolean {
  const conds = rule.conditions ?? [];
  const productConds = conds.filter((c) => condType(c) === 'PRODUCT');
  const categoryConds = conds.filter((c) => condType(c) === 'CATEGORY');
  const attributeConds = conds.filter((c) => condType(c) === 'ATTRIBUTE');
  const productHit = productConds.some((c) => extractIds(c.value).includes(p.id));
  const categoryHit = categoryConds.some((c) =>
    extractCategoryNeedles(c.value).some((needle) => categoryMatches(needle, p.categories)),
  );
  const attrHit = attributeConds.some((c) => {
    const marker = extractAttributeMarker(c.entityIds);
    if (!marker) return false;
    const { operator, value: expected } = parseAttributeConditionValue(c.value);
    const productValue = p.discountAttributes?.[marker];
    return attributeOperatorMatches(operator, productValue, expected);
  });
  const presentKinds = [productConds.length > 0, categoryConds.length > 0, attributeConds.length > 0].filter(
    Boolean,
  ).length;
  // Multi-kind rule → honour `conditionLogic`. Single-kind rule → any hit in that kind is enough (default OR semantics degenerate to `some`).
  if (presentKinds > 1) {
    const logic = (rule.conditionLogic ?? 'OR').toUpperCase();
    const hits = [
      productConds.length > 0 ? productHit : null,
      categoryConds.length > 0 ? categoryHit : null,
      attributeConds.length > 0 ? attrHit : null,
    ].filter((h): h is boolean => h !== null);
    return logic === 'AND' ? hits.every(Boolean) : hits.some(Boolean);
  }
  return productHit || categoryHit || attrHit;
}

function computeDiscountedPrice(price: number, dv: Partial<IDiscountValue>): number | undefined {
  const dtype = (dv.discountType ?? '').toUpperCase();
  const rawValue = Number(dv.value ?? 0);
  if (!Number.isFinite(rawValue) || rawValue <= 0) return undefined;
  let reduction = 0;
  if (dtype === 'PERCENT' || dtype === 'PERCENTAGE') {
    reduction = (price * rawValue) / 100;
  } else if (dtype === 'FIXED_AMOUNT') {
    reduction = rawValue;
  } else {
    return undefined;
  }
  const maxCap = Number(dv.maxAmount ?? 0);
  if (Number.isFinite(maxCap) && maxCap > 0 && reduction > maxCap) {
    reduction = maxCap;
  }
  const discounted = Math.max(0, price - reduction);
  return Math.round(discounted * 100) / 100; // two decimals
}

/** Return the salePrice for a product under the loaded rule set, or `undefined` when nothing applies. */
export function applyProductDiscount(product: ProductForDiscount, rules: RawProductDiscount[]): number | undefined {
  let best: number | undefined;
  for (const rule of rules) {
    if (!rule.discountValue) continue;
    if (!ruleAppliesTo(rule, product)) continue;
    const candidate = computeDiscountedPrice(product.price, rule.discountValue);
    if (candidate === undefined || candidate >= product.price) continue;
    if (best === undefined || candidate < best) best = candidate;
  }
  return best;
}
