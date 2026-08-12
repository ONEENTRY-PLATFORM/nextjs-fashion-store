'use client';
import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

import { useDict } from '@/lib/oneentry/labels/DictContext';

/**
 * Shown when the checkout segment throws. Overlaid by `checkout_error_*` in the
 * OE `system_pages` set, alongside the 404 / offline / generic-error copy.
 */
export const CHECKOUT_ERROR_LABELS = {
  heading: 'Checkout unavailable',
  body: 'There was a problem loading the checkout. Your cart has not been charged.',
  supportPrefix: 'Please try again or',
  supportCtaText: 'contact support',
  supportSuffix: 'if the issue persists.',
  supportEmail: 'support@oneentry.cloud',
  tryAgain: 'Try Again',
  backToCart: 'Back to Cart',
  cartHref: '/cart',
} as const;

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CheckoutError({ error, reset }: ErrorProps) {
  const L = useDict('checkout_error_', CHECKOUT_ERROR_LABELS);
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-white px-4"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <div className="max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <AlertTriangle size={48} strokeWidth={1} className="text-gray-300" />
        </div>
        <h1 className="mb-3 tracking-[0.2em] uppercase" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
          {L.heading}
        </h1>
        <p className="mb-2 text-sm leading-relaxed text-gray-500">{L.body}</p>
        <p className="mb-8 text-xs text-gray-400">
          {L.supportPrefix}{' '}
          <a href={`mailto:${L.supportEmail}`} className="underline hover:text-gray-600">
            {L.supportCtaText}
          </a>{' '}
          {L.supportSuffix}
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="bg-black px-6 py-3 text-xs tracking-[0.2em] text-white uppercase transition-colors hover:bg-gray-800"
            style={{ borderRadius: '6px', fontWeight: 600 }}
          >
            {L.tryAgain}
          </button>
          <a
            href={L.cartHref}
            className="border border-black px-6 py-3 text-xs tracking-[0.2em] uppercase transition-colors hover:bg-black hover:text-white"
            style={{ borderRadius: '6px', fontWeight: 600 }}
          >
            {L.backToCart}
          </a>
        </div>
      </div>
    </div>
  );
}
