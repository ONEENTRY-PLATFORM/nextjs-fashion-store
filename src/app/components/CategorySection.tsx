'use client'
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { ShopCategory } from '../data/categories';
import { CATEGORY_SECTION_LABELS } from '../data/commonLabels';
import type { CategoryItemFromCms } from '../../lib/oneentry/blocks/category-section';

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
    id: c.id, label: c.label, chip: c.chip, image: c.image, href: c.href,
  }));
  const [activeFilter, setActiveFilter] = useState(chips[0] ?? '');
  // true = already animated / back-nav → skip card entrance, show immediately
  const [animated, setAnimated] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('homepageAnimated') === '1') {
      setAnimated(true);
    }
  }, []);

  useEffect(() => { setMounted(true); }, []);

  if (categories.length === 0) return null;
  const visibleCategories = categories.filter(cat => cat.chip === activeFilter);

  return (
    <section className="py-0 font-[Inter,sans-serif]">
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8">
        {/* Title */}
        <h2 className="text-center mb-6 text-[clamp(1.5rem,3vw,2rem)] font-semibold leading-tight tracking-[0.05em] uppercase">
          {CATEGORY_SECTION_LABELS.heading}
        </h2>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide">
          {chips.map((chip) => (
            <button
              key={chip}
              onClick={() => setActiveFilter(chip)}
              className={`flex-shrink-0 px-4 py-2 text-xs tracking-wider uppercase border transition-all duration-200 rounded-md ${
                activeFilter === chip
                  ? 'bg-black text-white border-black font-semibold'
                  : 'bg-white text-black border-[#ccc] font-normal'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* 6-Column Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-4">
          {!mounted ? Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`category-skeleton-${i}`}
              className="bg-accent animate-pulse aspect-[2/3]"
              style={{ animationDelay: `${i * 55}ms` }}
              aria-hidden="true"
            />
          )) : visibleCategories.map((cat, i) => (
            <Link
              key={cat.id}
              href={cat.href}
              className="relative group overflow-hidden block transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg aspect-[2/3]"
              style={animated ? undefined : { animation: `hp-fade-up 0.5s ${CARD_BASE_DELAY + i * CARD_STAGGER}ms ease-out both` }}
            >
              {/* Image */}
              <Image
                src={cat.image}
                alt={cat.label}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 17vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Base overlay */}
              <div className="absolute inset-0 bg-black/35" />
              {/* Hover overlay */}
              <div className="absolute inset-0 transition-opacity duration-300 opacity-0 group-hover:opacity-100 bg-black/20" />
              {/* Label — lifts slightly on hover */}
              <div className="absolute bottom-0 left-0 right-0 bg-black px-3 py-2.5 transition-transform duration-300 group-hover:-translate-y-1">
                <p className="text-white text-center text-xs tracking-widest uppercase font-medium">
                  {cat.label}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}