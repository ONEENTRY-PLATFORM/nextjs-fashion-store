'use client';
import { ArrowRight } from 'lucide-react';
import React, { useEffect } from 'react';

import { useRouter } from '@/lib/i18n/navigation';
import { useDict } from '@/lib/oneentry/labels/DictContext';

/** 404 page UI copy. */
export const NOT_FOUND_LABELS = {
  largeNumberAria: '404',
  eyebrow: 'Error 404',
  heading: 'Page Not Found',
  body: "The page you're looking for doesn't exist or has been moved. Explore our collections instead.",
  ctaHome: 'Back to Home',
  ctaHomeHref: '/',
  ctaWomen: 'Women',
  ctaWomenHref: '/women/clothing',
  ctaMen: 'Men',
  ctaMenHref: '/men/clothing',
  trendingHeading: 'Trending Now',
  trendingLinks: [
    { label: 'New Arrivals', href: '/new' },
    { label: 'Sale', href: '/sale' },
    { label: 'Bags', href: '/women/bags' },
    { label: 'Shoes', href: '/women/shoes' },
    { label: 'Accessories', href: '/women/accessories' },
  ] as const,
} as const;

const L_FALLBACK = NOT_FOUND_LABELS;

export function NotFoundPage() {
  const L = useDict('not_found_', L_FALLBACK);
  const router = useRouter();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="flex flex-1 flex-col bg-white">
      <main id="main-content" className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        {/* Large 404 */}
        <div className="relative mb-6 select-none">
          <span
            className="text-[180px] leading-none font-bold tracking-tighter text-black/4 sm:text-[240px]"
            aria-hidden="true"
          >
            {L.largeNumberAria}
          </span>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <p className="text-xs font-medium tracking-[0.25em] text-gray-400 uppercase">{L.eyebrow}</p>
            <h1
              data-testid="not-found-heading"
              className="text-center text-3xl leading-tight font-light tracking-tight text-black sm:text-4xl"
            >
              {L.heading}
            </h1>
          </div>
        </div>

        {/* Divider */}
        <div className="mb-8 h-px w-12 bg-black" />

        {/* Message */}
        <p className="mb-10 max-w-sm text-center text-sm leading-relaxed text-gray-500">{L.body}</p>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <button
            onClick={() => router.push(L.ctaHomeHref)}
            className="bg-black px-8 py-3 text-xs tracking-widest text-white uppercase transition-colors duration-200 hover:bg-gray-900"
          >
            {L.ctaHome}
          </button>
          <button
            onClick={() => router.push(L.ctaWomenHref)}
            className="flex items-center gap-2 border border-black px-8 py-3 text-xs tracking-widest text-black uppercase transition-colors duration-200 hover:bg-black hover:text-white"
          >
            {L.ctaWomen}
            <ArrowRight size={12} />
          </button>
          <button
            onClick={() => router.push(L.ctaMenHref)}
            className="flex items-center gap-2 border border-black px-8 py-3 text-xs tracking-widest text-black uppercase transition-colors duration-200 hover:bg-black hover:text-white"
          >
            {L.ctaMen}
            <ArrowRight size={12} />
          </button>
        </div>

        {/* Trending links */}
        <div className="mt-16 flex flex-col items-center gap-4">
          <p className="text-xs tracking-[0.2em] text-gray-400 uppercase">{L.trendingHeading}</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {L.trendingLinks.map(({ label, href }) => (
              <button
                key={href}
                onClick={() => router.push(href)}
                className="text-xs text-gray-500 underline-offset-4 transition-colors duration-150 hover:text-black hover:underline"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
