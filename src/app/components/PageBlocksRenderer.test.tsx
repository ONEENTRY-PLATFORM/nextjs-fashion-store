/// <reference types="@testing-library/jest-dom" />
/**
 * PageBlocksRenderer — unit tests for the two new default-branch cases
 * added in the latest commit:
 *
 *  1. `block.type === 'recently_viewed_block'` + empty Redux trail → renders nothing.
 *  2. `block.type === 'recently_viewed_block'` + primed Redux trail  → delegates to
 *     RecentlyViewedSection and product names appear in the output.
 *  3. Block with a `title` but no products and no dedicated marker/type handler
 *     (e.g. `cart_complement_block`) → renders the title as an `<h2>`.
 *
 * Strategy
 * --------
 * The component is a 'use client' React component wired to many heavy child
 * components (HeroSlider, CategorySection, …) and to the Redux store via
 * `useSelector`. We mock every child at the module level and control the
 * Redux selector return value by mocking `react-redux` directly — no real
 * store needed.
 *
 * `AnimatedSection` uses `IntersectionObserver` (not available in jsdom) and
 * `pageshow`. Both are shimmed in the test setup below.
 */

import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// IntersectionObserver shim (jsdom doesn't implement it)
// ---------------------------------------------------------------------------
beforeAll(() => {
  if (typeof window !== 'undefined' && !window.IntersectionObserver) {
    class MockIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: MockIntersectionObserver,
    });
  }
});

// ---------------------------------------------------------------------------
// Mutable selector result — individual tests flip this via helpers below.
// ---------------------------------------------------------------------------
let mockRecentlyViewedItems: unknown[] = [];

vi.mock('react-redux', () => ({
  useSelector: (selector: (s: unknown) => unknown) =>
    selector({ recentlyViewed: { items: mockRecentlyViewedItems } }),
}));

// ---------------------------------------------------------------------------
// Mock heavy child components — we only care about the branching logic,
// not the rendering internals of each section.
// ---------------------------------------------------------------------------
vi.mock('./HeroSlider', () => ({ HeroSlider: () => <div data-testid="hero-slider" /> }));
vi.mock('./CategorySection', () => ({ CategorySection: () => <div data-testid="category-section" /> }));
vi.mock('./PromoBlock', () => ({ PromoBlock: () => <div data-testid="promo-block" /> }));
vi.mock('./DiscountBanner', () => ({ DiscountBanner: () => <div data-testid="discount-banner" /> }));
vi.mock('./MenCollection', () => ({ MenCollection: () => <div data-testid="men-collection" /> }));
vi.mock('./WomenCollection', () => ({ WomenCollection: () => <div data-testid="women-collection" /> }));
vi.mock('./NewArrivals', () => ({ NewArrivals: () => <div data-testid="new-arrivals" /> }));

// RecentlyViewedSection: render product names so the test can assert on them.
vi.mock('../pages/product/RecentlyViewedSection', () => ({
  RecentlyViewedSection: ({ products }: { products: Array<{ name?: string }> }) => (
    <div data-testid="recently-viewed-section">
      {products.map((p, i) => (
        <span key={i} data-testid="rv-product-name">{p.name}</span>
      ))}
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeBlock(overrides: Partial<{
  marker: string;
  type: string;
  title: string;
  position: number;
  products: unknown[];
}> = {}) {
  return {
    marker: 'unknown_block',
    type: 'generic',
    title: '',
    position: 0,
    products: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PageBlocksRenderer — recently_viewed_block', () => {
  afterEach(() => {
    mockRecentlyViewedItems = [];
    cleanup();
  });

  it('renders nothing when the Redux recently-viewed trail is empty', async () => {
    mockRecentlyViewedItems = [];

    const { PageBlocksRenderer } = await import('./PageBlocksRenderer');
    const block = makeBlock({ marker: 'recently_viewed', type: 'recently_viewed_block' });

    await act(async () => {
      render(<PageBlocksRenderer blocks={[block as never]} />);
    });

    expect(screen.queryByTestId('recently-viewed-section')).toBeNull();
  });

  it('renders RecentlyViewedSection with product names when the trail is primed', async () => {
    mockRecentlyViewedItems = [
      { id: '1', name: 'Blue Jacket', viewedAt: Date.now() },
      { id: '2', name: 'White Sneakers', viewedAt: Date.now() },
    ];

    const { PageBlocksRenderer } = await import('./PageBlocksRenderer');
    const block = makeBlock({ marker: 'recently_viewed', type: 'recently_viewed_block' });

    await act(async () => {
      render(<PageBlocksRenderer blocks={[block as never]} />);
    });

    expect(screen.getByTestId('recently-viewed-section')).toBeTruthy();
    expect(screen.getByText('Blue Jacket')).toBeTruthy();
    expect(screen.getByText('White Sneakers')).toBeTruthy();
  });

  it('deduplicates products with the same name before passing to RecentlyViewedSection', async () => {
    // Same product name (different case) should appear only once.
    mockRecentlyViewedItems = [
      { id: '1', name: 'Blue Jacket', viewedAt: Date.now() },
      { id: '2', name: 'blue jacket', viewedAt: Date.now() - 1000 },
      { id: '3', name: 'White Sneakers', viewedAt: Date.now() },
    ];

    const { PageBlocksRenderer } = await import('./PageBlocksRenderer');
    const block = makeBlock({ marker: 'recently_viewed', type: 'recently_viewed_block' });

    await act(async () => {
      render(<PageBlocksRenderer blocks={[block as never]} />);
    });

    const nameEls = screen.getAllByTestId('rv-product-name');
    expect(nameEls).toHaveLength(2); // 'Blue Jacket' + 'White Sneakers'; duplicate dropped
  });
});

describe('PageBlocksRenderer — title-only fallback (no products, unknown marker/type)', () => {
  afterEach(() => {
    mockRecentlyViewedItems = [];
    cleanup();
  });

  it('renders an h2 with the block title when products are empty and type has no handler', async () => {
    const { PageBlocksRenderer } = await import('./PageBlocksRenderer');
    // Use an unknown type so the block falls through to the title-only branch
    // (cart_complement_block now has its own guard that returns null when empty).
    const block = makeBlock({
      marker: 'unknown_section',
      type: 'unknown_section',
      title: 'Complete the Look',
      products: [],
    });

    await act(async () => {
      render(<PageBlocksRenderer blocks={[block as never]} />);
    });

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toBe('Complete the Look');
  });

  it('renders nothing when title is empty and there are no products', async () => {
    const { PageBlocksRenderer } = await import('./PageBlocksRenderer');
    const block = makeBlock({
      marker: 'unknown_marker',
      type: 'unknown_type',
      title: '',
      products: [],
    });

    await act(async () => {
      render(<PageBlocksRenderer blocks={[block as never]} />);
    });

    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByTestId('new-arrivals')).toBeNull();
  });
});

describe('PageBlocksRenderer — cart_complement_block guard', () => {
  afterEach(() => {
    mockRecentlyViewedItems = [];
    cleanup();
  });

  it('renders nothing for cart_complement_block with an empty products array', async () => {
    const { PageBlocksRenderer } = await import('./PageBlocksRenderer');
    const block = makeBlock({
      marker: 'cart_complement_block',
      type: 'cart_complement_block',
      title: 'Complete the Look',
      products: [],
    });

    await act(async () => {
      render(<PageBlocksRenderer blocks={[block as never]} />);
    });

    // The guard returns null — no heading should appear in the DOM.
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByText('Complete the Look')).toBeNull();
  });
});
