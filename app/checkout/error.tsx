'use client'
import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { CHECKOUT_ERROR_LABELS as L } from '../../src/app/data/errorPageLabels';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CheckoutError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="min-h-screen bg-white flex items-center justify-center px-4"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <AlertTriangle size={48} strokeWidth={1} className="text-gray-300" />
        </div>
        <h1 className="tracking-[0.2em] uppercase mb-3" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
          {L.heading}
        </h1>
        <p className="text-sm text-gray-500 mb-2 leading-relaxed">
          {L.body}
        </p>
        <p className="text-xs text-gray-400 mb-8">
          {L.supportPrefix}{' '}
          <a href={`mailto:${L.supportEmail}`} className="underline hover:text-gray-600">
            {L.supportCtaText}
          </a>{' '}
          {L.supportSuffix}
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="px-6 py-3 text-xs tracking-[0.2em] uppercase text-white bg-black hover:bg-gray-800 transition-colors"
            style={{ borderRadius: '6px', fontWeight: 600 }}
          >
            {L.tryAgain}
          </button>
          <a
            href={L.cartHref}
            className="px-6 py-3 text-xs tracking-[0.2em] uppercase border border-black hover:bg-black hover:text-white transition-colors"
            style={{ borderRadius: '6px', fontWeight: 600 }}
          >
            {L.backToCart}
          </a>
        </div>
      </div>
    </div>
  );
}
