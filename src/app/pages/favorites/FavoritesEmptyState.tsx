'use client';
import { Heart } from 'lucide-react';
import Image from 'next/image';

import { useRouter } from '@/lib/i18n/navigation';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

export const FAVORITES_EMPTY_LABELS = {
  heading: 'Your Favorites List is Empty',
  body: 'Save the pieces you love and come back to them any time. Start browsing to find your favourites.',
  imageAlt: 'Empty wardrobe',
  ctaWomen: "Browse Women's Collection",
  ctaWomenHref: '/women/clothing',
  ctaHome: 'Go to Home',
  ctaHomeHref: '/',
} as const;

export function FavoritesEmptyState() {
  const L = useDict('favorites_page_empty_', FAVORITES_EMPTY_LABELS);
  const router = useRouter();
  // Same OE set as the rest of the page; local constants are the fallback.
  const lImageAlt = useT('favorites_empty_image_alt', L.imageAlt);
  const lHeading = useT('favorites_empty_heading', L.heading);
  const lBody = useT('favorites_empty_body', L.body);
  const lCtaWomen = useT('favorites_empty_cta_women', L.ctaWomen);
  const lCtaHome = useT('favorites_empty_cta_home', L.ctaHome);
  return (
    <div
      className="flex flex-col items-center justify-center px-4 py-20 text-center"
      data-testid="favorites-empty-state"
    >
      <div className="relative mb-8">
        <Image
          src="https://images.unsplash.com/photo-1601136610007-1ecf5706c908?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=320&q=80"
          alt={lImageAlt}
          width={192}
          height={240}
          className="mx-auto object-cover grayscale-30"
        />
        <div className="absolute inset-0 flex items-end justify-center bg-linear-to-t from-white/95 from-30% to-transparent pb-6">
          <Heart size={40} strokeWidth={1} className="text-accent" />
        </div>
      </div>
      <h2 className="mb-3 text-xl font-bold tracking-[0.15em] uppercase">{lHeading}</h2>
      <p className="mb-8 max-w-xs text-sm leading-relaxed text-gray-400">{lBody}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => router.push(L.ctaWomenHref)}
          className="rounded-none bg-black px-8 py-4 text-xs font-bold tracking-[0.2em] text-white uppercase transition-opacity hover:opacity-90 focus-visible:outline-none"
        >
          {lCtaWomen}
        </button>
        <button
          onClick={() => router.push(L.ctaHomeHref)}
          className="rounded-none border border-black px-8 py-4 text-xs font-semibold tracking-[0.2em] uppercase transition-colors hover:bg-gray-50 focus-visible:outline-none"
        >
          {lCtaHome}
        </button>
      </div>
    </div>
  );
}
