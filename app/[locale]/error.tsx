'use client';
import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

import { ERROR_PAGE_LABELS as L_FALLBACK } from '@/app/data/errorPageLabels';
import { useDict } from '@/lib/oneentry/labels/DictContext';

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
