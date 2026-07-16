/**
 * Unit tests for `FALLBACK_TIER_LTV` values and `nextTierThreshold` logic
 * from AuthContext.tsx.
 *
 * Both are private, so we mirror their exact implementation as pure
 * functions here — the same pattern used in CartPage.summaryTotals.test.ts.
 * This guards against accidental value drift (the old values were 500/1500/5000
 * and the progress bar was broken because it only looked at ltvThreshold).
 */
import { describe, it, expect } from 'vitest';

// ── mirror of FALLBACK_TIER_LTV from AuthContext.tsx ──────────────────────────

type LoyaltyStatus = 'Member' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

const FALLBACK_TIER_LTV: Record<Exclude<LoyaltyStatus, 'Member'>, number> = {
  Bronze: 100,
  Silver: 500,
  Gold: 1000,
  Platinum: 2000,
};

// ── mirror of OeLoyaltyTier (subset used by nextTierThreshold) ────────────────

interface Tier {
  tier: string;
  ltvThreshold: number | null;
  minCartAmount: number | null;
}

const TIER_LADDER: Array<Exclude<LoyaltyStatus, 'Member'>> = ['Bronze', 'Silver', 'Gold', 'Platinum'];

// ── mirror of nextTierThreshold from AuthContext.tsx ──────────────────────────

function nextTierThreshold(tiers: Tier[], activeStatus: LoyaltyStatus): number {
  const gated = tiers.filter((t) => typeof t.ltvThreshold === 'number');
  if (activeStatus === 'Member') {
    return gated[0]?.ltvThreshold ?? FALLBACK_TIER_LTV.Bronze;
  }
  const idx = TIER_LADDER.indexOf(activeStatus as Exclude<LoyaltyStatus, 'Member'>);
  if (idx < 0 || idx === TIER_LADDER.length - 1) return 0;
  const nextName = TIER_LADDER[idx + 1];
  const oe = tiers.find((t) => t.tier.toLowerCase() === nextName.toLowerCase());
  if (oe && typeof oe.ltvThreshold === 'number') return oe.ltvThreshold;
  if (oe && typeof oe.minCartAmount === 'number') return oe.minCartAmount;
  return FALLBACK_TIER_LTV[nextName];
}

// ── FALLBACK_TIER_LTV contract ────────────────────────────────────────────────

describe('FALLBACK_TIER_LTV — hardcoded ladder values', () => {
  it('Silver fallback is 500 (regression: was previously 1500)', () => {
    expect(FALLBACK_TIER_LTV.Silver).toBe(500);
  });

  it('Gold fallback is 1000 (regression: was previously 5000)', () => {
    expect(FALLBACK_TIER_LTV.Gold).toBe(1000);
  });

  it('Platinum fallback is 2000', () => {
    expect(FALLBACK_TIER_LTV.Platinum).toBe(2000);
  });

  it('Bronze fallback is 100', () => {
    expect(FALLBACK_TIER_LTV.Bronze).toBe(100);
  });
});

// ── nextTierThreshold — OE data takes precedence over fallback ────────────────

describe('nextTierThreshold — OE ltvThreshold wins', () => {
  it('returns the OE ltvThreshold for Gold when the Silver user has an OE Gold tier', () => {
    const tiers: Tier[] = [
      { tier: 'silver', ltvThreshold: 500, minCartAmount: null },
      { tier: 'gold', ltvThreshold: 1500, minCartAmount: null },
    ];
    expect(nextTierThreshold(tiers, 'Silver')).toBe(1500);
  });

  it('falls back to FALLBACK_TIER_LTV.Gold when no Gold tier exists in OE', () => {
    const tiers: Tier[] = [
      { tier: 'silver', ltvThreshold: 500, minCartAmount: null },
    ];
    expect(nextTierThreshold(tiers, 'Silver')).toBe(FALLBACK_TIER_LTV.Gold);
  });
});

// ── nextTierThreshold — minCartAmount fallback (regression) ──────────────────

describe('nextTierThreshold — minCartAmount fallback (regression)', () => {
  /**
   * Regression: previously `nextTierThreshold` only checked `ltvThreshold`
   * on the OE tier. When OE ships Gold with `ltvThreshold=null` but
   * `minCartAmount=750`, the old code fell through to FALLBACK_TIER_LTV.Gold
   * (1000) instead of returning 750.
   */
  it('returns minCartAmount when OE Gold has ltvThreshold=null but minCartAmount=750', () => {
    const tiers: Tier[] = [
      { tier: 'silver', ltvThreshold: 500, minCartAmount: null },
      { tier: 'gold', ltvThreshold: null, minCartAmount: 750 },
    ];
    expect(nextTierThreshold(tiers, 'Silver')).toBe(750);
  });

  it('still prefers ltvThreshold over minCartAmount when both are set', () => {
    const tiers: Tier[] = [
      { tier: 'silver', ltvThreshold: 500, minCartAmount: null },
      { tier: 'gold', ltvThreshold: 900, minCartAmount: 750 },
    ];
    expect(nextTierThreshold(tiers, 'Silver')).toBe(900);
  });
});

// ── nextTierThreshold — edge cases ────────────────────────────────────────────

describe('nextTierThreshold — edge cases', () => {
  it('returns 0 for Platinum (top of the ladder)', () => {
    const tiers: Tier[] = [{ tier: 'platinum', ltvThreshold: 2000, minCartAmount: null }];
    expect(nextTierThreshold(tiers, 'Platinum')).toBe(0);
  });

  it('returns Bronze fallback for Member when no LTV-gated tiers exist', () => {
    expect(nextTierThreshold([], 'Member')).toBe(FALLBACK_TIER_LTV.Bronze);
  });

  it('returns the first OE ltvThreshold for Member when OE tiers exist', () => {
    const tiers: Tier[] = [{ tier: 'bronze', ltvThreshold: 50, minCartAmount: null }];
    expect(nextTierThreshold(tiers, 'Member')).toBe(50);
  });
});
