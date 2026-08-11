'use client';
import { useState } from 'react';

import CmsImage from '@/app/components/ui/CmsImage';
import type { ShopCategory } from '@/app/data/categories';
import { CATEGORY_SECTION_LABELS } from '@/app/data/commonLabels';
import { useMounted } from '@/app/hooks/useMounted';
import { Link } from '@/lib/i18n/navigation';
import type { CategoryItemFromCms } from '@/lib/oneentry/blocks/category-section';
import { useT } from '@/lib/oneentry/labels/DictContext';

// Base delay (ms) before cards animate in — waits for the parent AnimatedSection fade-up (~650ms).
// On back navigation sessionStorage='1' so animated=true and this is never used.
const CARD_BASE_DELAY = 680;
const CARD_STAGGER = 55;

export function CategorySection({
  initialChips,
  initialCategories,
}: {
  initialChips?: string[];
  initialCategories?: CategoryItemFromCms[];
} = {}) {
  const chips: string[] = initialChips ?? [];
  const categories: ShopCategory[] = (initialCategories ?? []).map((c) => ({
    id: c.id,
    label: c.label,
    chip: c.chip,
    image: c.image,
    // Same omission the hero had: `cat.imageBlur` is read below, but the
    // mapping never carried it across, so the tiles had no LQIP to show while
    // the (unoptimized, full-size) photo downloaded.
    imageBlur: c.imageBlur,
    href: c.href,
  }));
  const [activeFilter, setActiveFilter] = useState(chips[0] ?? '');
  // true = already animated / back-nav → skip card entrance, show immediately
  // Back-navigation should not replay the entrance animation. The flag is
  // read once, lazily — the cards only render after `mounted` flips, so this
  // never diverges from the server HTML and needs no effect round-trip.
  const [animated] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem('homepageAnimated') === '1';
    } catch {
      return false;
    }
  });
  const mounted = useMounted();
  const lHeading = useT('interface_controls_shop_by_category', CATEGORY_SECTION_LABELS.heading);

  if (categories.length === 0) return null;
  const visibleCategories = categories.filter((cat) => cat.chip === activeFilter);

  return (
    <section className="py-0 font-sans">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Title */}
        <h2
          className="mb-6 text-center text-[clamp(1.5rem,3vw,2rem)] leading-tight font-semibold tracking-wider uppercase"
          data-testid="category-section-heading"
        >
          {lHeading}
        </h2>

        {/* Filter Chips */}
        <div className="scrollbar-hide mb-6 flex items-center gap-2 overflow-x-auto pb-1">
          {chips.map((chip) => (
            <button
              key={chip}
              onClick={() => setActiveFilter(chip)}
              className={`shrink-0 rounded-md border px-4 py-2 text-xs tracking-wider uppercase transition-all duration-200 ${
                activeFilter === chip
                  ? 'border-black bg-black font-semibold text-white'
                  : 'border-[#ccc] bg-white font-normal text-black'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* 6-Column Grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-4 lg:grid-cols-6">
          {!mounted
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`category-skeleton-${i}`}
                  className="aspect-2/3 animate-pulse bg-gray-100"
                  style={{ animationDelay: `${i * 55}ms` }}
                  aria-hidden="true"
                />
              ))
            : visibleCategories.map((cat, i) => (
                <Link
                  key={cat.id}
                  href={cat.href}
                  className="group relative block aspect-2/3 overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg"
                  style={
                    animated
                      ? undefined
                      : { animation: `hp-fade-up 0.5s ${CARD_BASE_DELAY + i * CARD_STAGGER}ms ease-out both` }
                  }
                >
                  {/* Image */}
                  <CmsImage
                    src={cat.image}
                    blur={cat.imageBlur}
                    alt={cat.label}
                    data-testid="category-tile-image"
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 17vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Base overlay */}
                  <div className="absolute inset-0 bg-black/35" />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  {/* Label — lifts slightly on hover */}
                  <div className="absolute inset-x-0 bottom-0 bg-black px-3 py-2.5 transition-transform duration-300 group-hover:-translate-y-1">
                    <p className="text-center text-xs font-medium tracking-widest text-white uppercase">{cat.label}</p>
                  </div>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}
