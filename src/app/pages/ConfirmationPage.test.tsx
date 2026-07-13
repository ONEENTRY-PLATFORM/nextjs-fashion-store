/// <reference types="@testing-library/jest-dom" />
/**
 * Tests for the sessionStorage-based order-id logic in ConfirmationPage.
 *
 * The component reads `sessionStorage.oe_last_order_id` inside a useEffect
 * and displays it as the order id, falling back to a random `OE-XXXXXXXX`
 * string when the key is absent.  After reading, the key is removed from
 * sessionStorage.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Heavy dependency mocks — all wired before the module is imported
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement('img', { src, alt }),
}));

// Cart context — provide a minimal stub with stable clearCart reference
const clearCart = vi.fn();
vi.mock('../context/CartContext', () => ({
  useCart: () => ({ items: [], total: 0, clearCart }),
}));

// CheckoutLabelsContext — return fallback for every useT call
vi.mock('../../lib/oneentry/labels/CheckoutLabelsContext', () => ({
  useT: (_set: string, _key: string, fallback: string) => fallback,
}));

// Layout components — replace with lightweight stubs
vi.mock('../components/Header', () => ({
  Header: () => React.createElement('header', { 'data-testid': 'header' }),
}));
vi.mock('../components/Footer', () => ({
  Footer: () => React.createElement('footer', { 'data-testid': 'footer' }),
}));
vi.mock('../components/CheckoutStepper', () => ({
  CheckoutStepper: () => React.createElement('div', { 'data-testid': 'stepper' }),
}));

// ---------------------------------------------------------------------------
// Import the component AFTER mocks are registered
// ---------------------------------------------------------------------------
import { ConfirmationPage } from './ConfirmationPage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const OE_LAST_ORDER_KEY = 'oe_last_order_id';

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.clearAllTimers();
});

// ---------------------------------------------------------------------------
describe('ConfirmationPage — order id display', () => {
  it('displays the real order id stored in sessionStorage', async () => {
    sessionStorage.setItem(OE_LAST_ORDER_KEY, '169');

    await act(async () => {
      render(React.createElement(ConfirmationPage));
    });

    // The order id should appear somewhere in the document
    expect(screen.getByText('169')).toBeDefined();
  });

  it('falls back to a generated OE-XXXXXXXX id when sessionStorage key is absent', async () => {
    // Ensure the key is not set
    sessionStorage.removeItem(OE_LAST_ORDER_KEY);

    await act(async () => {
      render(React.createElement(ConfirmationPage));
    });

    // The random id always starts with "OE-"
    const strong = document.querySelector('strong');
    expect(strong?.textContent).toMatch(/^OE-[0-9A-F]{8}$/);
  });

  it('removes the key from sessionStorage after reading it', async () => {
    sessionStorage.setItem(OE_LAST_ORDER_KEY, '999');

    await act(async () => {
      render(React.createElement(ConfirmationPage));
    });

    expect(sessionStorage.getItem(OE_LAST_ORDER_KEY)).toBeNull();
  });

  it('ignores an empty-string value and falls back to generated id', async () => {
    sessionStorage.setItem(OE_LAST_ORDER_KEY, '');

    await act(async () => {
      render(React.createElement(ConfirmationPage));
    });

    const strong = document.querySelector('strong');
    // An empty string must NOT be shown; a generated id must appear instead
    expect(strong?.textContent).toMatch(/^OE-[0-9A-F]{8}$/);
  });
});
