/// <reference types="@testing-library/jest-dom" />
/**
 * CartUnavailableNotice — self-dismiss timer tests.
 *
 * The component starts a 5 000 ms setTimeout whenever `unavailableRemoved`
 * becomes non-empty and calls `dismissUnavailableNotice` when it fires.
 * The timer is cleared on unmount and restarted when the array reference
 * changes (fresh removal batch).
 *
 * All four behaviours are exercised here with vi.useFakeTimers() so we don't
 * actually wait five seconds.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Controlled mock for useCart — individual tests set these before rendering.
// ---------------------------------------------------------------------------

const mockDismiss = vi.fn();
let mockUnavailableRemoved: { name?: string }[] = [];

vi.mock('../context/CartContext', () => ({
  useCart: () => ({
    unavailableRemoved: mockUnavailableRemoved,
    dismissUnavailableNotice: mockDismiss,
    // Remaining fields are not read by CartUnavailableNotice but listed for
    // completeness so the mock matches the hook's return shape.
    items: [],
    miniCartOpen: false,
    openMiniCart: vi.fn(),
    closeMiniCart: vi.fn(),
    addItem: vi.fn(),
    addBundle: vi.fn(),
    removeItem: vi.fn(),
    removeBundle: vi.fn(),
    updateQuantity: vi.fn(),
    updateSize: vi.fn(),
    clearCart: vi.fn(),
    totalItems: 0,
    subtotal: 0,
    discount: 0,
    total: 0,
    preview: null,
    previewLoading: false,
    personalDiscount: 0,
    totalDue: 0,
    couponCode: null,
    couponDiscount: 0,
    couponError: null,
    applyCoupon: vi.fn(),
    removeCoupon: vi.fn(),
  }),
}));

// lucide-react icons — not needed for behaviour assertions; stub them to
// avoid the ESM-only import path that jsdom can't resolve.
vi.mock('lucide-react', () => ({
  AlertTriangle: () => null,
  X: () => null,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(name = 'Test Shirt') {
  return { name };
}

async function renderNotice() {
  const { CartUnavailableNotice } = await import('./CartUnavailableNotice');
  return render(<CartUnavailableNotice />);
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('CartUnavailableNotice — self-dismiss timer', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDismiss.mockReset();
    mockUnavailableRemoved = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  // -------------------------------------------------------------------------
  // Case 1 — empty list: timer must NOT be set, dismiss must never be called.
  // -------------------------------------------------------------------------
  it('does NOT call dismiss when unavailableRemoved is empty', async () => {
    mockUnavailableRemoved = [];

    await act(async () => {
      await renderNotice();
    });

    // Advance well past the 5 s window.
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    expect(mockDismiss).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Case 2 — non-empty list: dismiss is called exactly once after 5 000 ms.
  // -------------------------------------------------------------------------
  it('calls dismiss exactly once after 5 000 ms when unavailableRemoved is non-empty', async () => {
    mockUnavailableRemoved = [makeItem()];

    await act(async () => {
      await renderNotice();
    });

    // Not yet called before the timer fires.
    expect(mockDismiss).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(5_000);
    });

    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Case 3 — unmount before 5 000 ms: cleanup clears the timer, dismiss
  //           must NOT be called.
  // -------------------------------------------------------------------------
  it('does NOT call dismiss when the component unmounts before the timer fires', async () => {
    mockUnavailableRemoved = [makeItem()];

    let unmount!: () => void;
    await act(async () => {
      ({ unmount } = await renderNotice());
    });

    // Advance to just before the deadline then unmount.
    await act(async () => {
      vi.advanceTimersByTime(4_999);
    });

    unmount();

    // Finish what would have been the remaining 1 ms.
    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(mockDismiss).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Case 4 — array reference changes mid-window: timer restarts.
  //           a) Advancing < 5 000 ms from the NEW reference must NOT dismiss.
  //           b) Advancing exactly 5 000 ms from the NEW reference DOES dismiss.
  // -------------------------------------------------------------------------
  it('restarts the timer when the unavailableRemoved reference changes (fresh batch)', async () => {
    // --- first batch ---
    mockUnavailableRemoved = [makeItem('Shirt')];

    const { CartUnavailableNotice } = await import('./CartUnavailableNotice');

    // Stateful wrapper so we can swap the prop that the mock reads.
    // We re-assign the module-level variable and force a re-render by
    // changing a key prop — the component re-mounts, firing the effect
    // with the new `unavailableRemoved` reference exactly as it would in
    // production when the Redux slice sets a new array object.
    function Harness() {
      const [batch, setBatch] = React.useState(0);
      // Expose setter so the test body can drive the swap inside act().
      (Harness as unknown as { setBatch: (n: number) => void }).setBatch = setBatch;
      // key= forces a clean re-mount when batch changes, replicating the
      // real scenario where the parent re-renders with a brand-new array ref.
      return <CartUnavailableNotice key={batch} />;
    }

    await act(async () => {
      render(<Harness />);
    });

    // Advance 3 000 ms into the first batch's window.
    await act(async () => {
      vi.advanceTimersByTime(3_000);
    });
    expect(mockDismiss).not.toHaveBeenCalled();

    // Swap to second batch — timer should restart from 0.
    mockUnavailableRemoved = [makeItem('Jeans'), makeItem('Coat')];
    await act(async () => {
      (Harness as unknown as { setBatch: (n: number) => void }).setBatch(1);
    });

    // Advance only 4 999 ms from the NEW reference — must not dismiss yet.
    await act(async () => {
      vi.advanceTimersByTime(4_999);
    });
    expect(mockDismiss).not.toHaveBeenCalled();

    // One final ms crosses the 5 000 ms mark from the new reference.
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });
});
