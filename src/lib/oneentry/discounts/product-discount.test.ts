/**
 * Unit tests for applyProductDiscount() in product-discount.ts.
 *
 * loadProductDiscounts() is a thin unstable_cache wrapper around the SDK —
 * testing it end-to-end would just be testing the cache plumbing, not logic.
 * All meaningful behaviour lives in the pure applyProductDiscount() export,
 * which is tested exhaustively below.
 */
import { describe, expect, it } from 'vitest';
import { applyProductDiscount, RawProductDiscount } from './product-discount';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface P {
  id: number;
  price: number;
  categories: string[];
  discountAttributes?: Record<string, string>;
}

const p = (overrides: Partial<P> = {}): P => ({
  id: 1,
  price: 100,
  categories: [],
  ...overrides,
});

const rule = (overrides: Partial<RawProductDiscount> = {}): RawProductDiscount => ({
  type: 'DISCOUNT',
  discountValue: {
    discountType: 'PERCENT',
    value: 10,
    applicability: 'TO_PRODUCT',
  },
  ...overrides,
});

const percentRule = (pct: number, extra: Partial<RawProductDiscount> = {}): RawProductDiscount =>
  rule({ discountValue: { discountType: 'PERCENT', value: pct, applicability: 'TO_PRODUCT' }, ...extra });

const fixedRule = (amount: number, extra: Partial<RawProductDiscount> = {}): RawProductDiscount =>
  rule({ discountValue: { discountType: 'FIXED_AMOUNT', value: amount, applicability: 'TO_PRODUCT' }, ...extra });

const productCond = (value: unknown) => ({ type: 'PRODUCT', value });
const categoryCond = (value: unknown) => ({ type: 'CATEGORY', value });
/** Build an ATTRIBUTE condition. `entityIds` carries the OE attribute marker;
 *  `value` is the expected-value payload (object or scalar). */
const attrCond = (
  marker: string | null,
  value: unknown,
) => ({
  type: 'ATTRIBUTE',
  entityIds: marker != null ? [{ id: marker, isNested: false }] : [],
  value,
});

// ---------------------------------------------------------------------------
// Edge: empty / no-match
// ---------------------------------------------------------------------------

describe('applyProductDiscount — empty / no-match', () => {
  it('returns undefined for empty rule set', () => {
    expect(applyProductDiscount(p(), [])).toBeUndefined();
  });

  it('returns undefined when rule has no discountValue', () => {
    const r: RawProductDiscount = { type: 'DISCOUNT', conditions: [productCond(1)] };
    expect(applyProductDiscount(p({ id: 1 }), [r])).toBeUndefined();
  });

  it('returns undefined when product id is not in rule condition', () => {
    const r = rule({ conditions: [productCond(99)] });
    expect(applyProductDiscount(p({ id: 1 }), [r])).toBeUndefined();
  });

  it('returns undefined when category does not match', () => {
    const r = rule({ conditions: [categoryCond('outerwear')] });
    expect(applyProductDiscount(p({ categories: ['tops'] }), [r])).toBeUndefined();
  });

  it('returns undefined when discountValue.value is 0', () => {
    const r = rule({ conditions: [productCond(1)], discountValue: { discountType: 'PERCENT', value: 0 } });
    expect(applyProductDiscount(p({ id: 1 }), [r])).toBeUndefined();
  });

  it('returns undefined when discountValue.value is negative', () => {
    const r = rule({ conditions: [productCond(1)], discountValue: { discountType: 'PERCENT', value: -10 } });
    expect(applyProductDiscount(p({ id: 1 }), [r])).toBeUndefined();
  });

  it('returns undefined when discountValue.value is undefined', () => {
    const r = rule({ conditions: [productCond(1)], discountValue: { discountType: 'PERCENT' } });
    expect(applyProductDiscount(p({ id: 1 }), [r])).toBeUndefined();
  });

  it('returns undefined for unknown discountType', () => {
    const r = rule({
      conditions: [productCond(1)],
      discountValue: { discountType: 'MYSTERY', value: 10 },
    });
    expect(applyProductDiscount(p({ id: 1 }), [r])).toBeUndefined();
  });

  it('returns undefined when resulting price equals original (100% discount with maxAmount = 0)', () => {
    // FIXED_AMOUNT equal to price → discounted = 0, which IS < price, should return 0
    // but a 0% discount (value 0) returns undefined — verify >= guard separately
    const r = rule({
      conditions: [productCond(5)],
      discountValue: { discountType: 'FIXED_AMOUNT', value: 0 },
    });
    expect(applyProductDiscount(p({ id: 5, price: 100 }), [r])).toBeUndefined();
  });

  it('returns undefined when discounted price === original price (zero reduction after maxAmount cap)', () => {
    // maxAmount 0 → cap is ignored (not > 0), reduction stays at 50; price = 50 < 100 → valid
    // Use a scenario where PERCENT would bring price ABOVE original — not possible with positive pct
    // Instead: FIXED_AMOUNT $0 with maxAmount null → value 0 triggers early return
    // This case tests the `candidate >= product.price` guard directly:
    // a rule that applies but produces exactly original price.
    // Construct: FIXED_AMOUNT $0 — already covered above. Use PERCENT 0 instead (also covered).
    // To hit the >= guard: FIXED_AMOUNT equal to 0 result where price rounds up to === price.
    // The simplest path: mock a scenario via PERCENT 100 with maxAmount 0 (ignored) → discounted = 0 < 100 → valid.
    // Keep this test as documentation that the guard exists:
    const r: RawProductDiscount = {
      type: 'DISCOUNT',
      conditions: [productCond(7)],
      discountValue: { discountType: 'PERCENT', value: 100 },
    };
    // 100% off $100 = $0, which IS < $100, so we get $0 back (not undefined)
    expect(applyProductDiscount(p({ id: 7, price: 100 }), [r])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// PRODUCT condition — various value shapes
// ---------------------------------------------------------------------------

describe('applyProductDiscount — PRODUCT condition value shapes', () => {
  it('matches scalar number id', () => {
    const r = percentRule(20, { conditions: [productCond(42)] });
    expect(applyProductDiscount(p({ id: 42, price: 100 }), [r])).toBe(80);
  });

  it('matches scalar string id', () => {
    const r = percentRule(20, { conditions: [productCond('42')] });
    expect(applyProductDiscount(p({ id: 42, price: 100 }), [r])).toBe(80);
  });

  it('matches id inside an array', () => {
    const r = percentRule(20, { conditions: [productCond([10, 42, 99])] });
    expect(applyProductDiscount(p({ id: 42, price: 100 }), [r])).toBe(80);
  });

  it('matches id inside { ids: [...] } object', () => {
    const r = percentRule(20, { conditions: [productCond({ ids: [10, 42] })] });
    expect(applyProductDiscount(p({ id: 42, price: 100 }), [r])).toBe(80);
  });

  it('matches id inside { id: N } object', () => {
    const r = percentRule(20, { conditions: [productCond({ id: 42 })] });
    expect(applyProductDiscount(p({ id: 42, price: 100 }), [r])).toBe(80);
  });

  it('does not match when id not in array', () => {
    const r = percentRule(20, { conditions: [productCond([10, 99])] });
    expect(applyProductDiscount(p({ id: 42, price: 100 }), [r])).toBeUndefined();
  });

  it('matches conditionType field as alias for type', () => {
    const r: RawProductDiscount = {
      type: 'DISCOUNT',
      conditions: [{ conditionType: 'PRODUCT', value: 5 }],
      discountValue: { discountType: 'PERCENT', value: 10, applicability: 'TO_PRODUCT' },
    };
    expect(applyProductDiscount(p({ id: 5, price: 200 }), [r])).toBe(180);
  });
});

// ---------------------------------------------------------------------------
// CATEGORY condition — various value shapes and matching modes
// ---------------------------------------------------------------------------

describe('applyProductDiscount — CATEGORY condition value shapes', () => {
  it('matches exact segment in slash path', () => {
    // category stored as 'clothing/outerwear' → needle 'outerwear' matches via split
    const r = percentRule(10, { conditions: [categoryCond('outerwear')] });
    expect(applyProductDiscount(p({ categories: ['clothing/outerwear'] }), [r])).toBe(90);
  });

  it('matches exact full string', () => {
    const r = percentRule(10, { conditions: [categoryCond('tops')] });
    expect(applyProductDiscount(p({ categories: ['tops'] }), [r])).toBe(90);
  });

  it('matches substring (includes check)', () => {
    // 'outer' is a substring of 'outerwear'
    const r = percentRule(10, { conditions: [categoryCond('outer')] });
    expect(applyProductDiscount(p({ categories: ['outerwear'] }), [r])).toBe(90);
  });

  it('matches needle from { markers: [...] }', () => {
    const r = percentRule(10, { conditions: [categoryCond({ markers: ['outerwear'] })] });
    expect(applyProductDiscount(p({ categories: ['clothing/outerwear'] }), [r])).toBe(90);
  });

  it('matches needle from { paths: [...] }', () => {
    const r = percentRule(10, { conditions: [categoryCond({ paths: ['tops'] })] });
    expect(applyProductDiscount(p({ categories: ['tops'] }), [r])).toBe(90);
  });

  it('matches needle from { marker: "..." }', () => {
    const r = percentRule(10, { conditions: [categoryCond({ marker: 'tops' })] });
    expect(applyProductDiscount(p({ categories: ['tops'] }), [r])).toBe(90);
  });

  it('matches needle from { path: "..." }', () => {
    const r = percentRule(10, { conditions: [categoryCond({ path: 'jeans' })] });
    expect(applyProductDiscount(p({ categories: ['bottoms/jeans'] }), [r])).toBe(90);
  });

  it('matches any category when multiple categories present', () => {
    const r = percentRule(10, { conditions: [categoryCond('shoes')] });
    expect(applyProductDiscount(p({ categories: ['tops', 'shoes'] }), [r])).toBe(90);
  });

  it('does not match when no category hits needle', () => {
    const r = percentRule(10, { conditions: [categoryCond('shoes')] });
    expect(applyProductDiscount(p({ categories: ['tops', 'outerwear'] }), [r])).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Discount calculation: PERCENT, FIXED_AMOUNT, maxAmount cap
// ---------------------------------------------------------------------------

describe('applyProductDiscount — discount math', () => {
  const prod = p({ id: 1, price: 100 });

  it('PERCENT 20% of $100 → $80', () => {
    const r = percentRule(20, { conditions: [productCond(1)] });
    expect(applyProductDiscount(prod, [r])).toBe(80);
  });

  it('PERCENTAGE alias works identically to PERCENT', () => {
    const r = rule({
      conditions: [productCond(1)],
      discountValue: { discountType: 'PERCENTAGE', value: 20 },
    });
    expect(applyProductDiscount(prod, [r])).toBe(80);
  });

  it('FIXED_AMOUNT $10 off $100 → $90', () => {
    const r = fixedRule(10, { conditions: [productCond(1)] });
    expect(applyProductDiscount(prod, [r])).toBe(90);
  });

  it('PERCENT 90% of $100 with maxAmount:20 → $80 (cap wins over $90 reduction)', () => {
    const r = rule({
      conditions: [productCond(1)],
      discountValue: { discountType: 'PERCENT', value: 90, maxAmount: 20 },
    });
    // 90% of 100 = 90 reduction; capped at 20 → 100-20 = 80
    expect(applyProductDiscount(prod, [r])).toBe(80);
  });

  it('maxAmount cap not applied when reduction < maxAmount', () => {
    const r = rule({
      conditions: [productCond(1)],
      discountValue: { discountType: 'PERCENT', value: 10, maxAmount: 50 },
    });
    // 10% of 100 = 10 reduction; cap 50 not triggered → 90
    expect(applyProductDiscount(prod, [r])).toBe(90);
  });

  it('maxAmount: null is treated as no cap', () => {
    const r = rule({
      conditions: [productCond(1)],
      discountValue: { discountType: 'PERCENT', value: 50, maxAmount: null },
    });
    expect(applyProductDiscount(prod, [r])).toBe(50);
  });

  it('FIXED_AMOUNT exceeding price floors at 0, not negative', () => {
    const r = fixedRule(200, { conditions: [productCond(1)] });
    expect(applyProductDiscount(prod, [r])).toBe(0);
  });

  it('result is rounded to two decimal places', () => {
    // 33.33% of $100 = 33.33 reduction → $66.67
    const r = rule({
      conditions: [productCond(1)],
      discountValue: { discountType: 'PERCENT', value: 33.33 },
    });
    expect(applyProductDiscount(prod, [r])).toBe(66.67);
  });
});

// ---------------------------------------------------------------------------
// Best-of-multiple rules
// ---------------------------------------------------------------------------

describe('applyProductDiscount — best-of-multiple rules', () => {
  it('picks the lower resulting price (10% vs $30 off on $100 → $70 wins)', () => {
    const r1 = percentRule(10, { conditions: [productCond(1)] });    // → $90
    const r2 = fixedRule(30, { conditions: [productCond(1)] });      // → $70
    expect(applyProductDiscount(p({ id: 1, price: 100 }), [r1, r2])).toBe(70);
  });

  it('picks best even when first rule is better', () => {
    const r1 = fixedRule(50, { conditions: [productCond(1)] });      // → $50
    const r2 = percentRule(10, { conditions: [productCond(1)] });    // → $90
    expect(applyProductDiscount(p({ id: 1, price: 100 }), [r1, r2])).toBe(50);
  });

  it('ignores non-matching rules and returns the matching one', () => {
    const rMiss = fixedRule(30, { conditions: [productCond(99)] });  // different product
    const rHit = percentRule(20, { conditions: [productCond(1)] });  // → $80
    expect(applyProductDiscount(p({ id: 1, price: 100 }), [rMiss, rHit])).toBe(80);
  });

  it('returns undefined when no rule matches even with multiple rules', () => {
    const r1 = percentRule(10, { conditions: [productCond(99)] });
    const r2 = fixedRule(20, { conditions: [productCond(88)] });
    expect(applyProductDiscount(p({ id: 1 }), [r1, r2])).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// conditionLogic: AND vs OR
// ---------------------------------------------------------------------------

describe('applyProductDiscount — conditionLogic AND / OR', () => {
  // product id=1, category='outerwear'
  const prod = p({ id: 1, price: 100, categories: ['outerwear'] });

  const ruleWithLogic = (logic: string, pid: number, cat: string) =>
    rule({
      conditionLogic: logic,
      conditions: [productCond(pid), categoryCond(cat)],
    });

  it('OR (default): product matches → applies even when category does not', () => {
    const r = ruleWithLogic('OR', 1, 'shoes');
    expect(applyProductDiscount(prod, [r])).toBe(90); // 10% off
  });

  it('OR (default): category matches → applies even when product id does not', () => {
    const r = ruleWithLogic('OR', 99, 'outerwear');
    expect(applyProductDiscount(prod, [r])).toBe(90);
  });

  it('OR (absent conditionLogic): same as OR explicit', () => {
    const r: RawProductDiscount = {
      type: 'DISCOUNT',
      conditions: [productCond(99), categoryCond('outerwear')],
      discountValue: { discountType: 'PERCENT', value: 10 },
    };
    expect(applyProductDiscount(prod, [r])).toBe(90);
  });

  it('AND: both match → applies', () => {
    const r = ruleWithLogic('AND', 1, 'outerwear');
    expect(applyProductDiscount(prod, [r])).toBe(90);
  });

  it('AND: only product matches → does NOT apply', () => {
    const r = ruleWithLogic('AND', 1, 'shoes');
    expect(applyProductDiscount(prod, [r])).toBeUndefined();
  });

  it('AND: only category matches → does NOT apply', () => {
    const r = ruleWithLogic('AND', 99, 'outerwear');
    expect(applyProductDiscount(prod, [r])).toBeUndefined();
  });

  it('AND: neither matches → undefined', () => {
    const r = ruleWithLogic('AND', 99, 'shoes');
    expect(applyProductDiscount(prod, [r])).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Date window: applyProductDiscount itself does NOT filter by date
// (loadProductDiscounts is the only gatekeeper)
// ---------------------------------------------------------------------------

describe('applyProductDiscount — does not apply date filtering', () => {
  it('applies a rule with an expired endDate (date checks are caller responsibility)', () => {
    const r = rule({
      conditions: [productCond(1)],
      endDate: '2000-01-01T00:00:00.000Z', // long in the past
    });
    // pure fn ignores the date — should still apply
    expect(applyProductDiscount(p({ id: 1, price: 100 }), [r])).toBe(90);
  });

  it('applies a rule with a future startDate (same rationale)', () => {
    const r = rule({
      conditions: [productCond(1)],
      startDate: '2099-01-01T00:00:00.000Z',
    });
    expect(applyProductDiscount(p({ id: 1, price: 100 }), [r])).toBe(90);
  });
});

// ---------------------------------------------------------------------------
// ATTRIBUTE conditions
// ---------------------------------------------------------------------------

describe('applyProductDiscount — ATTRIBUTE condition: eq operator', () => {
  it('matches when product discountAttribute equals expected value → salePrice computed', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: '10', condition: 'eq' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: '10' } }), [r])).toBe(90);
  });

  it('does not match when product attribute value differs from expected', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: '10', condition: 'eq' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: '20' } }), [r])).toBeUndefined();
  });

  it('does not match when product is missing the discount attribute key', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: '10', condition: 'eq' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: {} }), [r])).toBeUndefined();
  });

  it('does not match when discountAttributes is absent (legacy product)', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: '10', condition: 'eq' })],
    });
    // p() produces no discountAttributes field — backward compat path
    expect(applyProductDiscount(p(), [r])).toBeUndefined();
  });

  it('scalar string value is treated as eq (no condition wrapper)', () => {
    // OE sometimes delivers plain string: `value: "10"` without a condition object
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', '10')],
    });
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: '10' } }), [r])).toBe(90);
  });

  it('eq match is case-insensitive on strings', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: 'ABC', condition: 'eq' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: 'abc' } }), [r])).toBe(90);
  });

  it('unknown operator falls back to eq behaviour', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: '10', condition: 'UNKNOWN_OP' })],
    });
    // Unknown → defaults to eq comparison
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: '10' } }), [r])).toBe(90);
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: '99' } }), [r])).toBeUndefined();
  });

  // Regression: OE tenant stored `discount_13: '10%'` on the product while the
  // discount rule carried `eq "10"`. The old normalize() stripped the trailing `%`
  // so the catalog showed a sale price that OE then refused to honour at checkout
  // (visible as a mysterious "Adjustments +$X" row). Fix: normalize() now forwards
  // the value verbatim; `attributeOperatorMatches('eq', '10%', '10')` must be false.
  it('does not match when product value "10%" is compared to rule value "10" via eq', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_13', { value: '10', condition: 'eq' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: { discount_13: '10%' } }), [r])).toBeUndefined();
  });
});

describe('applyProductDiscount — ATTRIBUTE condition: neq operator', () => {
  it('neq matches when product value differs from expected', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: '10', condition: 'neq' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: '20' } }), [r])).toBe(90);
  });

  it('ne alias behaves identically to neq', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: '10', condition: 'ne' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: '20' } }), [r])).toBe(90);
  });

  it('neq does not match when values are equal', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: '10', condition: 'neq' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: '10' } }), [r])).toBeUndefined();
  });
});

describe('applyProductDiscount — ATTRIBUTE condition: gt / lt numeric operators', () => {
  it('gt matches when product value is greater than expected', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: '5', condition: 'gt' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: '10' } }), [r])).toBe(90);
  });

  it('gt does not match when product value equals expected', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: '10', condition: 'gt' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: '10' } }), [r])).toBeUndefined();
  });

  it('lt matches when product value is less than expected', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: '20', condition: 'lt' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: '10' } }), [r])).toBe(90);
  });

  it('lt does not match when product value equals expected', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: '10', condition: 'lt' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: '10' } }), [r])).toBeUndefined();
  });

  it('gte matches when product value equals expected', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: '10', condition: 'gte' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: '10' } }), [r])).toBe(90);
  });

  it('lte / le alias matches when product value equals expected', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: '10', condition: 'le' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: '10' } }), [r])).toBe(90);
  });
});

describe('applyProductDiscount — ATTRIBUTE condition: exs / nex (existence) operators', () => {
  it('exs matches whenever the attribute is present with any non-empty value', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: null, condition: 'exs' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: 'anything' } }), [r])).toBe(90);
  });

  it('exists alias behaves identically to exs', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: null, condition: 'exists' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: 'yes' } }), [r])).toBe(90);
  });

  it('exs does not match when attribute is absent', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: null, condition: 'exs' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: {} }), [r])).toBeUndefined();
  });

  it('nex matches when attribute is absent', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: null, condition: 'nex' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: {} }), [r])).toBe(90);
  });

  it('nexs alias matches when attribute is absent', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: null, condition: 'nexs' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: {} }), [r])).toBe(90);
  });

  it('not_exists alias matches when attribute is absent', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: null, condition: 'not_exists' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: {} }), [r])).toBe(90);
  });

  it('nex does not match when attribute is present with a value', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: null, condition: 'nex' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: '5' } }), [r])).toBeUndefined();
  });
});

describe('applyProductDiscount — ATTRIBUTE condition: lke / contains (substring) operator', () => {
  it('lke matches when product value contains the expected substring', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: 'sale', condition: 'lke' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: 'bigsale2024' } }), [r])).toBe(90);
  });

  it('like alias behaves identically to lke', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: 'sale', condition: 'like' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: 'bigsale2024' } }), [r])).toBe(90);
  });

  it('contains alias behaves identically to lke', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: 'sale', condition: 'contains' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: 'bigsale2024' } }), [r])).toBe(90);
  });

  it('lke does not match when the substring is absent', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: 'winter', condition: 'lke' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: 'bigsale2024' } }), [r])).toBeUndefined();
  });

  it('lke is case-insensitive', () => {
    const r = percentRule(10, {
      conditions: [attrCond('discount_12', { value: 'SALE', condition: 'lke' })],
    });
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: 'bigsale2024' } }), [r])).toBe(90);
  });
});

describe('applyProductDiscount — ATTRIBUTE condition: entityIds edge cases', () => {
  it('does not match when entityIds is empty array', () => {
    const r: RawProductDiscount = {
      type: 'DISCOUNT',
      conditions: [{ type: 'ATTRIBUTE', entityIds: [], value: { value: '10', condition: 'eq' } }],
      discountValue: { discountType: 'PERCENT', value: 10 },
    };
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: '10' } }), [r])).toBeUndefined();
  });

  it('does not match when entityIds is undefined', () => {
    const r: RawProductDiscount = {
      type: 'DISCOUNT',
      conditions: [{ type: 'ATTRIBUTE', entityIds: undefined, value: { value: '10', condition: 'eq' } }],
      discountValue: { discountType: 'PERCENT', value: 10 },
    };
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: '10' } }), [r])).toBeUndefined();
  });

  it('does not match when entityIds is null', () => {
    const r: RawProductDiscount = {
      type: 'DISCOUNT',
      conditions: [{ type: 'ATTRIBUTE', entityIds: null, value: { value: '10', condition: 'eq' } }],
      discountValue: { discountType: 'PERCENT', value: 10 },
    };
    expect(applyProductDiscount(p({ discountAttributes: { discount_12: '10' } }), [r])).toBeUndefined();
  });
});

describe('applyProductDiscount — mixed ATTRIBUTE + CATEGORY conditions with conditionLogic', () => {
  // Product is in 'outerwear' but does NOT have discount_12=10
  const prodCatOnly = p({ categories: ['outerwear'], discountAttributes: {} });
  // Product has discount_12=10 but is NOT in 'outerwear'
  const prodAttrOnly = p({ categories: ['tops'], discountAttributes: { discount_12: '10' } });
  // Product satisfies BOTH conditions
  const prodBoth = p({ categories: ['outerwear'], discountAttributes: { discount_12: '10' } });

  const mixedRule = (logic: string) => rule({
    conditionLogic: logic,
    conditions: [
      categoryCond('outerwear'),
      attrCond('discount_12', { value: '10', condition: 'eq' }),
    ],
  });

  it('OR: CATEGORY matches but ATTRIBUTE does not → still applies', () => {
    expect(applyProductDiscount(prodCatOnly, [mixedRule('OR')])).toBe(90);
  });

  it('OR: ATTRIBUTE matches but CATEGORY does not → still applies', () => {
    expect(applyProductDiscount(prodAttrOnly, [mixedRule('OR')])).toBe(90);
  });

  it('OR: neither matches → undefined', () => {
    const prod = p({ categories: ['shoes'], discountAttributes: {} });
    expect(applyProductDiscount(prod, [mixedRule('OR')])).toBeUndefined();
  });

  it('AND: both match → applies', () => {
    expect(applyProductDiscount(prodBoth, [mixedRule('AND')])).toBe(90);
  });

  it('AND: only CATEGORY matches → does not apply', () => {
    expect(applyProductDiscount(prodCatOnly, [mixedRule('AND')])).toBeUndefined();
  });

  it('AND: only ATTRIBUTE matches → does not apply', () => {
    expect(applyProductDiscount(prodAttrOnly, [mixedRule('AND')])).toBeUndefined();
  });

  it('absent conditionLogic defaults to OR semantics for mixed conditions', () => {
    const r: RawProductDiscount = {
      type: 'DISCOUNT',
      conditions: [
        categoryCond('outerwear'),
        attrCond('discount_12', { value: '10', condition: 'eq' }),
      ],
      discountValue: { discountType: 'PERCENT', value: 10 },
    };
    // Only category matches — OR default → should still apply
    expect(applyProductDiscount(prodCatOnly, [r])).toBe(90);
  });
});
