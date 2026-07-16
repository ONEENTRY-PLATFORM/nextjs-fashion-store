/**
 * Unit tests for the `fetchLoyalty` tier-parsing logic in actions.ts.
 *
 * `fetchLoyalty` is a private helper, so we test its core extraction logic
 * as a pure derivation — the same pattern used in CartPage.summaryTotals.test.ts
 * and MiniCart.summary.test.ts. The functions below mirror the exact code paths
 * inside `fetchLoyalty` and `fetchMe`.
 *
 * Separately we test the full function via a getUserApi mock to cover the
 * bonusBalance-survives-empty-tiers regression.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── mirror of the RawDiscount extraction logic inside fetchLoyalty ────────────

interface RawCondition {
  conditionType?: string;
  type?: string;
  value?: { amount?: number } | string | number;
}

interface RawDiscount {
  identifier?: string;
  localizeInfos?: { en_US?: { title?: string }; title?: string } & Record<string, { title?: string }>;
  discountValue?: {
    value?: number;
    maxAmount?: number | null;
    discountType?: string;
    applicability?: string;
  };
  conditions?: RawCondition[];
  userGroups?: Array<{ id?: number }> | null;
}

interface OeLoyaltyTier {
  tier: string;
  tierTitle: string;
  discountPct: number;
  discountMaxAmount: number | null;
  applicability: string;
  ltvThreshold: number | null;
  minCartAmount: number | null;
  userGroupIds: number[];
}

function readAmount(cond: RawCondition | undefined): number | null {
  if (!cond) return null;
  if (typeof cond.value === 'object' && cond.value !== null) {
    const a = (cond.value as { amount?: number }).amount;
    return typeof a === 'number' && Number.isFinite(a) ? a : null;
  }
  if (typeof cond.value === 'string' || typeof cond.value === 'number') {
    const n = Number(cond.value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseRawDiscount(r: RawDiscount): OeLoyaltyTier {
  const dv = r.discountValue ?? {};
  const isPercent =
    (dv.discountType ?? '').toUpperCase() === 'PERCENTAGE' ||
    (dv.discountType ?? '').toUpperCase() === 'PERCENT';
  const ltvCond = (r.conditions ?? []).find(
    (c) => c.conditionType === 'USER_LTV' || c.type === 'USER_LTV',
  );
  const minCartCond = (r.conditions ?? []).find(
    (c) => c.conditionType === 'MIN_CART_AMOUNT' || c.type === 'MIN_CART_AMOUNT',
  );
  const ltvValue = readAmount(ltvCond);
  const minCartValue = readAmount(minCartCond);
  const groupsRaw = Array.isArray(r.userGroups) ? r.userGroups : [];
  return {
    tier: r.identifier ?? '',
    tierTitle:
      (r.localizeInfos as { en_US?: { title?: string }; title?: string } | undefined)?.en_US?.title ??
      (r.localizeInfos as { title?: string } | undefined)?.title ??
      '',
    discountPct: isPercent ? Number(dv.value ?? 0) : 0,
    discountMaxAmount: dv.maxAmount ?? null,
    applicability: dv.applicability ?? '',
    ltvThreshold: ltvValue,
    minCartAmount: minCartValue,
    userGroupIds: groupsRaw.map((g) => Number(g?.id ?? 0)).filter((n) => n > 0),
  };
}

// ── pure-derivation tests ─────────────────────────────────────────────────────

describe('fetchLoyalty — tier parsing (pure derivation)', () => {
  it('sets minCartAmount and ltvThreshold=null when only MIN_CART_AMOUNT condition is present', () => {
    const raw: RawDiscount = {
      identifier: 'silver',
      discountValue: { discountType: 'PERCENTAGE', value: 5 },
      conditions: [{ type: 'MIN_CART_AMOUNT', value: { amount: 500 } }],
    };
    const tier = parseRawDiscount(raw);
    expect(tier.minCartAmount).toBe(500);
    expect(tier.ltvThreshold).toBeNull();
  });

  it('sets ltvThreshold and minCartAmount=null when only USER_LTV condition is present', () => {
    const raw: RawDiscount = {
      identifier: 'gold',
      discountValue: { discountType: 'PERCENTAGE', value: 10 },
      conditions: [{ type: 'USER_LTV', value: { amount: 100 } }],
    };
    const tier = parseRawDiscount(raw);
    expect(tier.ltvThreshold).toBe(100);
    expect(tier.minCartAmount).toBeNull();
  });

  it('sets both minCartAmount and ltvThreshold when both conditions are present', () => {
    const raw: RawDiscount = {
      identifier: 'platinum',
      discountValue: { discountType: 'PERCENTAGE', value: 15 },
      conditions: [
        { type: 'MIN_CART_AMOUNT', value: { amount: 1000 } },
        { type: 'USER_LTV', value: { amount: 2000 } },
      ],
    };
    const tier = parseRawDiscount(raw);
    expect(tier.minCartAmount).toBe(1000);
    expect(tier.ltvThreshold).toBe(2000);
  });

  it('also accepts conditionType (alternate OE field name) for USER_LTV', () => {
    const raw: RawDiscount = {
      identifier: 'bronze',
      conditions: [{ conditionType: 'USER_LTV', value: { amount: 50 } }],
    };
    const tier = parseRawDiscount(raw);
    expect(tier.ltvThreshold).toBe(50);
  });

  it('also accepts conditionType for MIN_CART_AMOUNT', () => {
    const raw: RawDiscount = {
      identifier: 'silver',
      conditions: [{ conditionType: 'MIN_CART_AMOUNT', value: { amount: 300 } }],
    };
    const tier = parseRawDiscount(raw);
    expect(tier.minCartAmount).toBe(300);
  });
});

// ── bonusBalance regression — survives empty tiers ────────────────────────────

const getDiscountByMarker = vi.fn();
const getBonusBalance = vi.fn();

vi.mock('../index', () => ({
  isOneEntryEnabled: true,
  isError: (v: unknown): boolean =>
    !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
  getUserApi: () => ({
    Discounts: { getDiscountByMarker, getBonusBalance },
  }),
  getGuestApi: () => null,
  oneentry: null,
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name === 'oe_access' ? { value: 'tok' } : undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock('../catalog/products', () => ({
  loadProductsByIds: vi.fn(async () => []),
}));

beforeEach(() => {
  vi.resetModules();
  getDiscountByMarker.mockReset();
  getBonusBalance.mockReset();
});

describe('fetchLoyalty — bonusBalance regression (via getUserApi mock)', () => {
  it('returns bonusBalance even when all four tier fetches error', async () => {
    // All marker fetches return an IError shape → tiers will be empty.
    getDiscountByMarker.mockResolvedValue({ statusCode: 404, message: 'not found' });
    // getBonusBalance returns a balance of 42.
    getBonusBalance.mockResolvedValue({ balance: 42 });

    vi.doMock('next/headers', () => ({
      cookies: async () => ({
        get: (name: string) => (name === 'oe_access' ? { value: 'tok' } : undefined),
        set: vi.fn(),
        delete: vi.fn(),
      }),
    }));

    // Import the module AFTER mocks are set (importFresh pattern).
    vi.resetModules();
    const { getCurrentUserAction } = await import('./actions');

    // getCurrentUserAction calls fetchMe → fetchLoyalty internally.
    // We can't assert loyalty directly from getCurrentUserAction (it returns OeUser | null),
    // but we can access it through fetchMe's output shape via a thin wrapper.
    // Instead: call fetchLoyalty via the named export path.
    // Since fetchLoyalty is private, we confirm the observable contract through
    // the isError branch: when ALL tier fetches are errors, tiers=[] but
    // bonusBalance must still reflect getBonusBalance result.
    //
    // We exercise `fetchLoyalty` indirectly by stubbing the entire getUserApi
    // and calling getCurrentUserAction, then inspecting `loyalty` on the
    // returned OeUser.
    //
    // getCurrentUserAction requires /me to succeed too — stub that minimally.
    const api = {
      Discounts: { getDiscountByMarker, getBonusBalance },
      Users: {
        getUser: vi.fn().mockResolvedValue({
          id: 1,
          identifier: 'test@test.com',
          formData: [],
        }),
        getCart: vi.fn().mockResolvedValue({ items: [], total: 0 }),
        getWishlist: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      },
      FormData: {
        getFormsDataByMarker: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      },
      Orders: {
        getAllOrdersByMarker: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      },
    };

    vi.doMock('../index', () => ({
      isOneEntryEnabled: true,
      isError: (v: unknown): boolean =>
        !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
      getUserApi: () => api,
      getGuestApi: () => null,
      oneentry: null,
    }));

    vi.resetModules();
    const mod = await import('./actions');
    const me = await mod.getCurrentUserAction();
    // me may be null if getCurrentUserAction couldn't assemble user — but
    // loyalty on the returned user is what we care about.
    expect(me).not.toBeNull();
    if (!me) return;
    expect(me.loyalty).not.toBeNull();
    expect(me.loyalty?.tiers).toEqual([]);
    expect(me.loyalty?.bonusBalance).toBe(42);
  });
});
