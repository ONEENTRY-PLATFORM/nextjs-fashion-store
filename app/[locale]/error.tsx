'use client';
import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

import { useDict } from '@/lib/oneentry/labels/DictContext';

/**
 * Global Error page UI copy (app/error.tsx).
 */
export const ERROR_PAGE_LABELS = {
  heading: 'Something went wrong',
  body: "We couldn't load this page. Please try again or return to the homepage.",
  tryAgain: 'Try Again',
  goHome: 'Go Home',
  homeHref: '/',
  errorIdPrefix: 'Error ID:',
  supportPrefix: 'If this keeps happening, please',
  supportCtaText: 'contact support',
  supportEmail: 'support@oneentry.cloud',
} as const;

const L_FALLBACK = ERROR_PAGE_LABELS;

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const L = useDict('error_', L_FALLBACK);
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      // `flex-1`, not `min-h-screen`: the header and footer are rendered by the
      // root layout around this boundary, so a full-viewport minimum here would
      // stack on top of them and push the error card off-screen.
      className="flex flex-1 items-center justify-center bg-white px-4"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <div className="max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <AlertTriangle size={48} strokeWidth={1} className="text-gray-300" />
        </div>
        <h1 className="mb-3 tracking-[0.2em] uppercase" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
          {L.heading}
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-gray-500">{L.body}</p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="bg-black px-6 py-3 text-xs tracking-[0.2em] text-white uppercase transition-colors hover:bg-gray-800"
            style={{ borderRadius: '6px', fontWeight: 600 }}
          >
            {L.tryAgain}
          </button>
          <a
            href={L.homeHref}
            className="border border-black px-6 py-3 text-xs tracking-[0.2em] uppercase transition-colors hover:bg-black hover:text-white"
            style={{ borderRadius: '6px', fontWeight: 600 }}
          >
            {L.goHome}
          </a>
        </div>
        {error.digest && (
          <p className="mt-6 text-xs text-gray-300">
            {L.errorIdPrefix} {error.digest}
          </p>
        )}
        <p className="mt-3 text-xs text-gray-400">
          {L.supportPrefix}{' '}
          <a href={`mailto:${L.supportEmail}`} className="underline hover:text-gray-600">
            {L.supportCtaText}
          </a>
        </p>
      </div>
    </div>
  );
}
