/**
 * Unit tests for the `shouldHydrateForUser` decision helper.
 *
 * No mocks needed — the function is a pure boolean predicate with no
 * external dependencies.
 */

import { describe, expect, it } from 'vitest';
import { shouldHydrateForUser, pickLocalIdsToPrune, diffCartForHydrate } from './hydrate-guard';

describe('shouldHydrateForUser', () => {
  it('returns false when userIdentifier is null', () => {
    expect(shouldHydrateForUser(null, null)).toBe(false);
    expect(shouldHydrateForUser(null, 'user@example.com')).toBe(false);
  });

  it('returns false when userIdentifier is undefined', () => {
    expect(shouldHydrateForUser(undefined, null)).toBe(false);
    expect(shouldHydrateForUser(undefined, 'user@example.com')).toBe(false);
  });

  it('returns false when userIdentifier is an empty string', () => {
    // An empty string is falsy — treated the same as "no user".
    expect(shouldHydrateForUser('', null)).toBe(false);
    expect(shouldHydrateForUser('', '')).toBe(false);
  });

  it('returns false when storedFlag already equals userIdentifier (already merged)', () => {
    expect(shouldHydrateForUser('alice@example.com', 'alice@example.com')).toBe(false);
  });

  it('returns true when storedFlag is null (key absent from sessionStorage)', () => {
    expect(shouldHydrateForUser('alice@example.com', null)).toBe(true);
  });

  it('returns true when storedFlag holds a different user (cross-user sign-in)', () => {
    expect(shouldHydrateForUser('bob@example.com', 'alice@example.com')).toBe(true);
  });

  it('returns true when storedFlag is the legacy "1" sentinel (pre-migration flag)', () => {
    // Before this change, both contexts stored '1' as the flag.  After the
    // migration the flag carries the userIdentifier, so '1' !== identifier
    // → hydrate runs again, which is the correct behaviour.
    expect(shouldHydrateForUser('alice@example.com', '1')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// pickLocalIdsToPrune
// ---------------------------------------------------------------------------

/** Identity toCms: numeric string → number, non-numeric → null. */
const numericToCms = (id: string): number | null =>
  /^\d+$/.test(id) ? Number(id) : null;

describe('pickLocalIdsToPrune', () => {
  it('(a) all local items present in OE → returns empty array', () => {
    const local = [{ id: '10' }, { id: '20' }, { id: '30' }];
    const oeIds = [10, 20, 30];
    expect(pickLocalIdsToPrune(local, oeIds, numericToCms)).toEqual([]);
  });

  it('(b) some local items absent from OE → returns their ids', () => {
    const local = [{ id: '10' }, { id: '20' }, { id: '30' }];
    // OE only has 10 and 30; 20 was removed on another device.
    const oeIds = [10, 30];
    expect(pickLocalIdsToPrune(local, oeIds, numericToCms)).toEqual(['20']);
  });

  it('(b) multiple absent items → all returned', () => {
    const local = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const oeIds: number[] = []; // OE cart is empty
    expect(pickLocalIdsToPrune(local, oeIds, numericToCms)).toEqual(['1', '2', '3']);
  });

  it('(c) non-numeric local id → skipped, never pruned', () => {
    // Playground stubs like "wc-7" or legacy "product-abc" have no CMS id.
    const local = [{ id: 'wc-7' }, { id: 'product-abc' }, { id: '99' }];
    const oeIds = [10, 20]; // 99 is absent, but the non-numeric ones must survive
    expect(pickLocalIdsToPrune(local, oeIds, numericToCms)).toEqual(['99']);
  });

  it('(c) all local ids are non-numeric → returns empty array', () => {
    const local = [{ id: 'wc-1' }, { id: 'wc-2' }];
    expect(pickLocalIdsToPrune(local, [], numericToCms)).toEqual([]);
  });

  it('(d) OE list has extra ids not in local → still returns empty', () => {
    // OE has more items than local — those will be added in the next step.
    // The prune step must not return anything here.
    const local = [{ id: '5' }];
    const oeIds = [5, 100, 200];
    expect(pickLocalIdsToPrune(local, oeIds, numericToCms)).toEqual([]);
  });

  it('accepts OE ids as numeric strings (mixed string/number)', () => {
    // OE SDK sometimes returns productId as a string despite the TS type saying number.
    const local = [{ id: '42' }, { id: '43' }];
    const oeIds = ['42' as unknown as number]; // 43 absent
    expect(pickLocalIdsToPrune(local, oeIds, numericToCms)).toEqual(['43']);
  });
});

// ---------------------------------------------------------------------------
// diffCartForHydrate
// ---------------------------------------------------------------------------

/** No playground mapping — always returns null (plain numeric ids). */
const noPlayground = (_cmsId: number): string | null => null;

/** Simulates a playground mapping: cmsId 7 → 'pg-7', everything else → null. */
const withPlayground = (cmsId: number): string | null =>
  cmsId === 7 ? 'pg-7' : null;

describe('diffCartForHydrate', () => {
  it('(1) all items match in id and qty — both output arrays are empty', () => {
    const local = [
      { id: '10', quantity: 2 },
      { id: '20', quantity: 1 },
    ];
    const oe = [
      { productId: 10, qty: 2 },
      { productId: 20, qty: 1 },
    ];
    const result = diffCartForHydrate(local, oe, noPlayground);
    expect(result.qtyMismatches).toEqual([]);
    expect(result.toAdd).toEqual([]);
  });

  it('(2) one local item has drifted qty — appears in qtyMismatches with OE qty', () => {
    const local = [
      { id: '10', quantity: 3 },
      { id: '20', quantity: 1 },
    ];
    const oe = [
      { productId: 10, qty: 1 }, // drifted: local says 3, OE says 1
      { productId: 20, qty: 1 },
    ];
    const result = diffCartForHydrate(local, oe, noPlayground);
    expect(result.qtyMismatches).toEqual([{ id: '10', newQty: 1 }]);
    expect(result.toAdd).toEqual([]);
  });

  it('(3) OE item absent from local — appears in toAdd', () => {
    const local = [{ id: '10', quantity: 2 }];
    const oe = [
      { productId: 10, qty: 2 },
      { productId: 99, qty: 4 }, // not in local
    ];
    const result = diffCartForHydrate(local, oe, noPlayground);
    expect(result.qtyMismatches).toEqual([]);
    expect(result.toAdd).toEqual([{ productId: 99, qty: 4 }]);
  });

  it('(4) local has extra items not in OE — do NOT appear in either output', () => {
    // Pruning is a separate step; diffCartForHydrate must stay silent about extras.
    const local = [
      { id: '10', quantity: 1 },
      { id: '55', quantity: 3 }, // only in local, not in OE
    ];
    const oe = [{ productId: 10, qty: 1 }];
    const result = diffCartForHydrate(local, oe, noPlayground);
    expect(result.qtyMismatches).toEqual([]);
    expect(result.toAdd).toEqual([]);
  });

  it('(5) uses playgroundIdFor to normalise the id before Map lookup', () => {
    // Local Redux holds the playground id 'pg-7'; OE payload has productId 7.
    // diffCartForHydrate must resolve 7 → 'pg-7' and find the local entry.
    const local = [{ id: 'pg-7', quantity: 2 }];
    const oe = [{ productId: 7, qty: 5 }]; // qty drifted
    const result = diffCartForHydrate(local, oe, withPlayground);
    // Should detect the mismatch under the playground id, not push to toAdd.
    expect(result.qtyMismatches).toEqual([{ id: 'pg-7', newQty: 5 }]);
    expect(result.toAdd).toEqual([]);
  });

  it('(5b) missing OE item with playground mapping — toAdd carries raw productId', () => {
    const local: { id: string; quantity: number }[] = [];
    const oe = [{ productId: 7, qty: 1 }];
    const result = diffCartForHydrate(local, oe, withPlayground);
    // Not in local at all → goes to toAdd regardless of playground mapping.
    expect(result.toAdd).toEqual([{ productId: 7, qty: 1 }]);
    expect(result.qtyMismatches).toEqual([]);
  });

  it('handles an empty OE cart — both arrays empty', () => {
    const local = [{ id: '10', quantity: 2 }];
    const oe: { productId: number; qty: number }[] = [];
    const result = diffCartForHydrate(local, oe, noPlayground);
    expect(result.qtyMismatches).toEqual([]);
    expect(result.toAdd).toEqual([]);
  });

  it('handles both arrays empty', () => {
    const result = diffCartForHydrate([], [], noPlayground);
    expect(result.qtyMismatches).toEqual([]);
    expect(result.toAdd).toEqual([]);
  });
});
