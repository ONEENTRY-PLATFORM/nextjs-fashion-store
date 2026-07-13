/// <reference types="@testing-library/jest-dom" />
/**
 * ProductCard — unit tests.
 *
 * Suite 1 — cached-image race regression:
 *   The bug: `<img onLoad>` never fires when the browser (or jsdom) already
 *   marked the element complete before React attached the listener. The fix
 *   checks `img.complete && img.naturalWidth > 0` synchronously inside the
 *   useEffect, so the wrapper never gets stuck at `opacity-0`.
 *
 * Suite 2 — QuickView-close hover-suppression:
 *   The bug: after closing QuickView the card was left visually pre-zoomed
 *   because CSS `:hover` stayed active. The fix uses a `suppressHoverScale`
 *   flag that is set when the modal opens and stays set until the user moves
 *   the pointer (`pointermove` / `pointerdown`).
 *
 * jsdom limitation note
 * ---------------------
 * jsdom never decodes images, so `img.complete` is always `false` and
 * `naturalWidth` is always `0` out of the box. We work around this by:
 *   1. Rendering the card (effect fires; `complete=false` → imgLoaded=false).
 *   2. Finding the <img> in the DOM and using Object.defineProperty to patch
 *      `complete=true` + `naturalWidth=100` on that specific instance.
 *   3. Forcing the effect to re-run by changing `activeImage` — we do this by
 *      updating a prop (colorImages) so the card swaps to a different URL.
 *   4. Asserting the wrapper has `opacity-100` (not `opacity-0`).
 *
 * This exercises the exact branch added in the fix without any live network.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../context/CatalogAccentContext', () => ({
  useCatalogAccent: () => '#000000',
}));

vi.mock('../context/WishlistContext', () => ({
  useWishlist: () => ({ toggleItem: vi.fn(), isWishlisted: () => false }),
}));

vi.mock('../context/CartContext', () => ({
  useCart: () => ({ addItem: vi.fn(), openMiniCart: vi.fn() }),
}));

// Mutable flag — individual tests flip this to drive the QuickView open/close
// effect inside ProductCard without needing a real Redux store.
let mockIsQuickViewOpen = false;

vi.mock('../context/QuickViewContext', () => ({
  useQuickView: () => ({ openQuickView: vi.fn(), isOpen: mockIsQuickViewOpen }),
}));

// next/image must forward the ref so imgRef.current is populated.
vi.mock('next/image', () => ({
  default: React.forwardRef(function MockImage(
    {
      src,
      alt,
      fill: _fill,
      sizes: _sizes,
      priority: _priority,
      onLoad,
      onError,
      ...rest
    }: React.ImgHTMLAttributes<HTMLImageElement> & {
      fill?: boolean;
      sizes?: string;
      priority?: boolean;
    },
    ref: React.Ref<HTMLImageElement>,
  ) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img ref={ref} src={src as string} alt={alt ?? ''} onLoad={onLoad} onError={onError} data-testid="product-img" {...rest} />;
  }),
}));

// next/link — plain <a> is enough.
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProduct(overrides: Partial<{
  image: string;
  colorImages: string[];
  colors: string[];
}> = {}) {
  return {
    id: 'p1',
    name: 'Test Product',
    price: '$50',
    image: '/img/product.jpg',
    colors: ['#000000'],
    inStock: true,
    ...overrides,
  };
}

/** Patch `complete` and `naturalWidth` on an existing img element instance. */
function simulateCachedImage(img: HTMLImageElement) {
  Object.defineProperty(img, 'complete', { configurable: true, get: () => true });
  Object.defineProperty(img, 'naturalWidth', { configurable: true, get: () => 100 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProductCard — cached-image branch', () => {
  beforeEach(() => {
    vi.resetModules();
    mockIsQuickViewOpen = false;
  });

  afterEach(() => {
    cleanup();
  });

  it('starts with opacity-0 wrapper when the image is NOT cached (normal path)', async () => {
    const { ProductCard } = await import('./ProductCard');
    const product = makeProduct();

    await act(async () => {
      render(<ProductCard product={product} />);
    });

    // jsdom never marks img complete, so imgLoaded stays false → opacity-0
    const img = screen.getByTestId('product-img');
    const wrapper = img.closest('.absolute.inset-0') as HTMLElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper.className).toMatch(/opacity-0/);
    expect(wrapper.className).not.toMatch(/opacity-100/);
  });

  it('sets opacity-100 immediately when img.complete=true on the next effect run (cached-image fix)', async () => {
    const { ProductCard } = await import('./ProductCard');

    // Two-color product: first color has image A, second has image B.
    // We render with color 0 (image A), patch img.complete=true on the DOM
    // node, then click color swatch 1 (triggers activeImage change → effect
    // re-runs → sees complete=true → setImgLoaded(true)).
    const product = makeProduct({
      colors: ['#000000', '#ffffff'],
      colorImages: ['/img/color-black.jpg', '/img/color-white.jpg'],
      image: '/img/color-black.jpg',
    });

    await act(async () => {
      render(<ProductCard product={product} />);
    });

    // Patch the img element that's currently in the DOM to simulate
    // "browser already decoded this from cache".
    const img = screen.getByTestId('product-img');
    simulateCachedImage(img as HTMLImageElement);

    // Click the second color swatch (white), which changes activeImage →
    // useEffect re-fires → should see complete=true → setImgLoaded(true).
    const swatches = screen.getAllByRole('button', {
      name: (n) => n.toLowerCase().includes('white') || n.toLowerCase().includes('#fff'),
    });
    // Fallback: grab by aria-label pattern used by ColorSwatchButton
    const allButtons = screen.getAllByRole('button');
    // ColorSwatchButton renders buttons with aria-label matching colorName(hex).
    // '#ffffff' → 'White' (via hexToColorName). Use the second swatch button
    // (index 1 from the color section, skipping wishlist).
    const colorSection = allButtons.filter(
      (b) => b.getAttribute('aria-label') !== null &&
             !b.getAttribute('aria-label')?.includes('wishlist') &&
             !b.getAttribute('aria-label')?.includes('Wishlist'),
    );

    await act(async () => {
      // Click whichever swatch is NOT the wishlist button — the second color swatch
      if (swatches.length > 0) {
        fireEvent.click(swatches[0]);
      } else if (colorSection.length >= 2) {
        fireEvent.click(colorSection[1]);
      }
    });

    // After effect re-run with complete=true, the wrapper should be opacity-100.
    const wrapper = img.closest('.absolute.inset-0') as HTMLElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper.className).toMatch(/opacity-100/);
    expect(wrapper.className).not.toMatch(/opacity-0/);
  });

  it('fires setImgLoaded(true) via onLoad event when image is not cached', async () => {
    const { ProductCard } = await import('./ProductCard');
    const product = makeProduct();

    await act(async () => {
      render(<ProductCard product={product} />);
    });

    const img = screen.getByTestId('product-img');
    const wrapper = img.closest('.absolute.inset-0') as HTMLElement;

    // Wrapper starts opacity-0
    expect(wrapper.className).toMatch(/opacity-0/);

    // Simulate the browser firing onLoad (image finished loading from network)
    await act(async () => {
      fireEvent.load(img);
    });

    // Now the wrapper must transition to opacity-100
    expect(wrapper.className).toMatch(/opacity-100/);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — QuickView-close hover-suppression
// ---------------------------------------------------------------------------
/**
 * Regression for the "card stays zoomed after closing QuickView" bug.
 *
 * ProductCard uses a `suppressHoverScale` flag instead of CSS `:hover` so
 * that closing the modal (which doesn't move the pointer) always leaves the
 * card in its resting state. The flag clears only when a real pointer
 * interaction (`pointermove` / `pointerdown`) fires on `document`.
 *
 * Harness strategy:
 *   `ProductCard` is wrapped in `React.memo`, so calling `rerender` with
 *   the same props is a no-op — the component never executes, and the mock
 *   is never re-called. To drive `isOpen` changes we use a stateful wrapper
 *   (`TestHarness`) whose React state changes trigger `ProductCard` to
 *   re-render (because its `accentColor` prop changes, busting the memo
 *   comparison). Inside the harness we also update `mockIsQuickViewOpen`
 *   so the mock returns the right value during that render.
 */
describe('ProductCard — QuickView-close hover suppression', () => {
  afterEach(() => {
    mockIsQuickViewOpen = false;
    cleanup();
  });

  it('suppresses scale-105 while QuickView is open and keeps it suppressed until pointermove after close', async () => {
    const { ProductCard } = await import('./ProductCard');

    const product = makeProduct();

    // Setter exposed to the test body so act() can drive state changes.
    let setQvOpen!: (v: boolean) => void;

    // Harness: holds qvOpen in React state; each state change propagates a
    // different `accentColor` prop to bust React.memo's shallow comparison,
    // guaranteeing ProductCard re-executes and calls useQuickView() anew.
    function TestHarness() {
      const [qvOpen, setOpen] = React.useState(false);
      setQvOpen = setOpen;
      // Keep module variable in sync so the mock reads the right value.
      mockIsQuickViewOpen = qvOpen;
      return (
        <ProductCard
          product={product}
          // Distinct accentColor per state so React.memo re-renders the card.
          accentColor={qvOpen ? '#111111' : '#000000'}
        />
      );
    }

    // --- Step 1: initial render, QuickView closed ---
    await act(async () => {
      render(<TestHarness />);
    });

    // scale-105 is applied directly on the <img> via the className prop
    // forwarded through the next/image mock.
    const img = screen.getByTestId('product-img');
    expect(img.className).not.toMatch(/scale-105/);

    // --- Step 2: simulate mouseenter → isHovered = true → scale-105 ---
    const card = img.closest('a') as HTMLElement;
    await act(async () => {
      fireEvent.mouseEnter(card);
    });
    expect(img.className).toMatch(/scale-105/);

    // --- Step 3: open QuickView → suppressHoverScale = true → class gone ---
    await act(async () => {
      setQvOpen(true);
    });
    expect(img.className).not.toMatch(/scale-105/);

    // --- Step 4: close QuickView → suppression still active, class still absent ---
    await act(async () => {
      setQvOpen(false);
    });
    expect(img.className).not.toMatch(/scale-105/);

    // --- Step 5: dispatch pointermove → suppression lifts ---
    // Note: when QuickView opened (step 3), the effect also called
    // setIsHovered(false). So at this point isHovered = false and
    // suppressHoverScale = true. After pointermove, suppressHoverScale
    // clears but isHovered stays false → showHoverScale = false, no
    // scale-105 yet. The card is now in a "ready to hover" state.
    await act(async () => {
      fireEvent(document, new PointerEvent('pointermove', { bubbles: true }));
    });
    expect(img.className).not.toMatch(/scale-105/); // suppression lifted but isHovered is false

    // --- Step 6: re-enter the card → isHovered = true → scale-105 returns ---
    // This confirms normal hover behaviour is fully restored after the cooldown.
    await act(async () => {
      fireEvent.mouseEnter(card);
    });
    expect(img.className).toMatch(/scale-105/);
  });
});
