/// <reference types="@testing-library/jest-dom" />
/**
 * Tests for the auto-size-selection behaviour added to QuickViewModal:
 *
 * 1. Opening a product with one size → selectedSize is pre-set to that size.
 * 2. Opening a product with multiple sizes → selectedSize starts null.
 * 3. Clicking a color swatch on a one-size product → size stays selected.
 * 4. Clicking a color swatch on a multi-size product → size resets to null.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks — order matters: vi.mock() is hoisted, keep deps simple
// ---------------------------------------------------------------------------

const mockCloseQuickView = vi.fn();
const mockAddItem = vi.fn();
const mockOpenMiniCart = vi.fn();
const mockToggleItem = vi.fn();
const mockPush = vi.fn();

// Controlled via helpers below so individual tests can configure the open state.
let mockIsOpen = false;
let mockProduct: unknown = null;
let mockInitialColorIndex: number | null = null;

vi.mock('../context/QuickViewContext', () => ({
  useQuickView: () => ({
    isOpen: mockIsOpen,
    product: mockProduct,
    initialColorIndex: mockInitialColorIndex,
    closeQuickView: mockCloseQuickView,
  }),
}));

vi.mock('../context/CartContext', () => ({
  useCart: () => ({ addItem: mockAddItem, openMiniCart: mockOpenMiniCart }),
}));

vi.mock('../context/WishlistContext', () => ({
  useWishlist: () => ({ toggleItem: mockToggleItem, isWishlisted: () => false }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('../hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({ current: null }),
}));

vi.mock('./QuickViewSizeGuide', () => ({
  QuickViewSizeGuide: () => null,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ isLoggedIn: false, openLoginModal: vi.fn(), user: null }),
}));

vi.mock('../pages/product/WriteReviewModal', () => ({
  WriteReviewModal: () => null,
}));

vi.mock('../pages/product/StarRating', () => ({
  StarRating: () => null,
}));

vi.mock('../../lib/oneentry/catalog/reviews-actions', () => ({
  getProductReviewSummary: vi.fn().mockResolvedValue({ count: 0, avg: null }),
}));

vi.mock('../utils/review-eligibility', () => ({
  canReviewProduct: vi.fn().mockReturnValue(false),
}));

vi.mock('next/image', () => ({
  // Render a plain <img> so we don't need the Next.js image optimisation pipeline.
  default: ({ src, alt, fill: _fill, sizes: _sizes, ...rest }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; sizes?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src as string} alt={alt ?? ''} {...rest} />
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProduct(sizes: string[], colors: string[] = ['#000000'], extra: Record<string, unknown> = {}): unknown {
  return {
    id: 'test-product',
    name: 'Test Dress',
    brand: 'TestBrand',
    price: '$99.00',
    image: '/test.jpg',
    colors,
    sizes,
    inStock: true,
    reviews: [],
    ...extra,
  };
}

async function openModal(product: unknown, colorIndex = 0) {
  mockProduct = product;
  mockInitialColorIndex = colorIndex;
  mockIsOpen = true;
  const { QuickViewModal } = await import('./QuickViewModal');
  let container: HTMLElement = document.body;
  await act(async () => {
    ({ container } = render(<QuickViewModal />));
  });
  return container;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QuickViewModal — size auto-selection', () => {
  beforeEach(() => {
    vi.resetModules();
    mockIsOpen = false;
    mockProduct = null;
    mockInitialColorIndex = null;
    mockCloseQuickView.mockReset();
    mockPush.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('pre-selects the sole size when the product has exactly one size', async () => {
    const product = makeProduct(['One Size']);
    await openModal(product);

    // The single size button should have the "selected" styling (bg-black text-white)
    const sizeBtn = screen.getByRole('button', { name: 'One Size' });
    expect(sizeBtn.className).toMatch(/bg-black/);
    expect(sizeBtn.className).toMatch(/text-white/);
  });

  it('does not pre-select any size when the product has multiple sizes', async () => {
    const product = makeProduct(['S', 'M', 'L']);
    await openModal(product);

    // None of the size buttons should have the selected (bg-black text-white) styling
    const sBtn = screen.getByRole('button', { name: 'S' });
    const mBtn = screen.getByRole('button', { name: 'M' });
    const lBtn = screen.getByRole('button', { name: 'L' });
    expect(sBtn.className).not.toMatch(/bg-black/);
    expect(mBtn.className).not.toMatch(/bg-black/);
    expect(lBtn.className).not.toMatch(/bg-black/);
  });

  it('keeps the size selected after a color swatch click on a one-size product', async () => {
    const product = makeProduct(['One Size'], ['#000000', '#ffffff']);
    await openModal(product);

    // Confirm size is pre-selected before the color click
    const sizeBtn = screen.getByRole('button', { name: 'One Size' });
    expect(sizeBtn.className).toMatch(/bg-black/);

    // Click the second color swatch (index 1, white)
    const colorBtns = screen.getAllByRole('button', { name: /Color \d/ });
    await act(async () => {
      fireEvent.click(colorBtns[1]);
    });

    // Size must remain selected after the color change
    expect(sizeBtn.className).toMatch(/bg-black/);
    expect(sizeBtn.className).toMatch(/text-white/);
  });

  // ------------------------------------------------------------------
  // Regression: lexicographic string comparison bug in sale-price guard
  // ------------------------------------------------------------------

  it('does NOT show strike-through when salePrice >= originalPrice (broken family fallback)', async () => {
    // product.salePrice '$100' is NOT less than product.price '$90' numerically,
    // but was incorrectly less when compared as strings ('$1' < '$9').
    const product = makeProduct(['One Size'], ['#000000'], {
      price: '$90',
      salePrice: '$100',
      // variant has no own salePrice → falls back to product.salePrice
      variants: undefined,
    });
    await openModal(product);

    // No line-through element should be in the DOM
    const strikeElements = document.querySelectorAll('.line-through');
    // Filter to only the price strike-through (exclude size-OOS strikethroughs
    // which also use line-through but appear inside button elements)
    const priceStrike = Array.from(strikeElements).filter(
      (el) => el.tagName.toLowerCase() === 'span'
    );
    expect(priceStrike).toHaveLength(0);
  });

  it('DOES show strike-through when salePrice < originalPrice (normal sale)', async () => {
    const product = makeProduct(['One Size'], ['#000000'], {
      price: '$100',
      salePrice: '$50',
      variants: undefined,
    });
    await openModal(product);

    const strikeSpans = Array.from(document.querySelectorAll('span.line-through'));
    expect(strikeSpans.length).toBeGreaterThanOrEqual(1);
    expect(strikeSpans[0].textContent).toBe('$100');
  });

  it('clears the size selection after a color swatch click on a multi-size product', async () => {
    const product = makeProduct(['S', 'M'], ['#000000', '#ffffff']);
    await openModal(product);

    // Manually select 'S' first
    const sBtnInitial = screen.getByRole('button', { name: 'S' });
    await act(async () => {
      fireEvent.click(sBtnInitial);
    });
    expect(screen.getByRole('button', { name: 'S' }).className).toMatch(/bg-black/);

    // Click the second color swatch
    const colorBtns = screen.getAllByRole('button', { name: /Color \d/ });
    await act(async () => {
      fireEvent.click(colorBtns[1]);
    });

    // Size selection must have been cleared
    expect(screen.getByRole('button', { name: 'S' }).className).not.toMatch(/bg-black text-white/);
    expect(screen.getByRole('button', { name: 'M' }).className).not.toMatch(/bg-black text-white/);
  });
});
