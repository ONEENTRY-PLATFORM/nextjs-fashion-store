import { beforeEach, describe, expect, it, vi } from 'vitest';

// unstable_cache is transparent in tests — call the wrapped fn directly.
vi.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
}));

const getBlockByMarker = vi.fn();

vi.mock('../index', () => ({
  oneentry: { Blocks: { getBlockByMarker } },
  isError: (v: unknown) =>
    !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
}));

const importFresh = async () => {
  vi.resetModules();
  return import('./discount-banner');
};

beforeEach(() => {
  getBlockByMarker.mockReset();
});

// Helper: build a minimal flat attributeValues block response.
function makeBlockResponse(attrs: Record<string, unknown>) {
  const attributeValues: Record<string, { value?: unknown }> = {};
  for (const [k, v] of Object.entries(attrs)) {
    attributeValues[k] = { value: v };
  }
  return { attributeValues };
}

// ─────────────────────────────────────────────────────────────────────────────
describe('loadDiscountBanner — hp_b_b_description marker (canonical)', () => {
  it('reads description from hp_b_b_description when present', async () => {
    getBlockByMarker.mockResolvedValue(
      makeBlockResponse({
        hp_b_b_pic: [{ downloadLink: 'https://cdn/banner.jpg' }],
        hp_b_b_title: 'Big Sale',
        hp_b_b_lable: '50% OFF',
        hp_b_b_sub_title: 'Outerwear',
        hp_b_b_description: 'Up to 50% off selected items',
        hp_b_b_cta_text: 'Shop Now',
        hp_b_b_cta_link: '/sale',
      }),
    );
    const { loadDiscountBanner } = await importFresh();
    const banner = await loadDiscountBanner('en_US');

    expect(banner).not.toBeNull();
    expect(banner!.description).toBe('Up to 50% off selected items');
    expect(banner!.image).toBe('https://cdn/banner.jpg');
    expect(banner!.cta).toBe('Shop Now');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('loadDiscountBanner — ph_b_b_description fallback (typo marker)', () => {
  it('falls back to ph_b_b_description when hp_b_b_description is absent', async () => {
    getBlockByMarker.mockResolvedValue(
      makeBlockResponse({
        hp_b_b_pic: [{ downloadLink: 'https://cdn/banner.jpg' }],
        hp_b_b_title: 'Big Sale',
        hp_b_b_lable: '50% OFF',
        hp_b_b_sub_title: 'Outerwear',
        // only the typo marker present
        ph_b_b_description: 'Description via typo marker',
        hp_b_b_cta_text: 'Shop Now',
        hp_b_b_cta_link: '/sale',
      }),
    );
    const { loadDiscountBanner } = await importFresh();
    const banner = await loadDiscountBanner('en_US');

    expect(banner).not.toBeNull();
    expect(banner!.description).toBe('Description via typo marker');
  });

  it('canonical hp_b_b_description wins over ph_b_b_description when both present', async () => {
    getBlockByMarker.mockResolvedValue(
      makeBlockResponse({
        hp_b_b_pic: [{ downloadLink: 'https://cdn/banner.jpg' }],
        hp_b_b_title: 'Big Sale',
        hp_b_b_lable: '50% OFF',
        hp_b_b_sub_title: 'Outerwear',
        hp_b_b_description: 'Canonical description',
        ph_b_b_description: 'Typo fallback — should not appear',
        hp_b_b_cta_text: 'Shop Now',
        hp_b_b_cta_link: '/sale',
      }),
    );
    const { loadDiscountBanner } = await importFresh();
    const banner = await loadDiscountBanner('en_US');

    expect(banner).not.toBeNull();
    expect(banner!.description).toBe('Canonical description');
  });

  it('description is empty string when neither marker is present', async () => {
    getBlockByMarker.mockResolvedValue(
      makeBlockResponse({
        hp_b_b_pic: [{ downloadLink: 'https://cdn/banner.jpg' }],
        hp_b_b_title: 'Big Sale',
        hp_b_b_lable: '50% OFF',
        hp_b_b_sub_title: 'Outerwear',
        // no description markers at all
        hp_b_b_cta_text: 'Shop Now',
        hp_b_b_cta_link: '/sale',
      }),
    );
    const { loadDiscountBanner } = await importFresh();
    const banner = await loadDiscountBanner('en_US');

    expect(banner).not.toBeNull();
    expect(banner!.description).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('loadDiscountBanner — returns null when image is missing', () => {
  it('returns null when hp_b_b_pic is absent (no image)', async () => {
    getBlockByMarker.mockResolvedValue(
      makeBlockResponse({
        hp_b_b_title: 'Big Sale',
        hp_b_b_description: 'Some description',
      }),
    );
    const { loadDiscountBanner } = await importFresh();
    const banner = await loadDiscountBanner('en_US');

    expect(banner).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('loadDiscountBanner — error paths', () => {
  it('returns null on OE error envelope', async () => {
    getBlockByMarker.mockResolvedValue({ statusCode: 404, message: 'Not found' });
    const { loadDiscountBanner } = await importFresh();
    expect(await loadDiscountBanner('en_US')).toBeNull();
  });

  it('returns null when SDK throws', async () => {
    getBlockByMarker.mockRejectedValue(new Error('network timeout'));
    const { loadDiscountBanner } = await importFresh();
    expect(await loadDiscountBanner('en_US')).toBeNull();
  });
});
