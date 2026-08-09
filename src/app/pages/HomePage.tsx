'use client';
import React from 'react';

import { PageBlocksRenderer } from '@/app/components/blocks/PageBlocksRenderer';
import { Footer } from '@/app/components/footer/Footer';
import { Header } from '@/app/components/header/Header';
import type { CategorySectionFromCms } from '@/lib/oneentry/blocks/category-section';
import type { DiscountBannerFromCms } from '@/lib/oneentry/blocks/discount-banner';
import type { HeroSlideFromCms } from '@/lib/oneentry/blocks/hero-slides';
import type { HomepageCollectionItem } from '@/lib/oneentry/blocks/homepage-collections';
import type { PageBlock } from '@/lib/oneentry/blocks/page-blocks';

export function HomePage({
  initialHeroSlides,
  initialPromoItems,
  initialDiscountBanner,
  initialCategorySection,
  pageBlocks = [],
}: {
  initialHeroSlides?: HeroSlideFromCms[];
  initialPromoItems?: HomepageCollectionItem[];
  initialDiscountBanner?: DiscountBannerFromCms | null;
  initialCategorySection?: CategorySectionFromCms;
  pageBlocks?: PageBlock[];
}) {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Header />

      <main id="main-content">
        <PageBlocksRenderer
          blocks={pageBlocks}
          initialHeroSlides={initialHeroSlides}
          initialPromoItems={initialPromoItems}
          initialDiscountBanner={initialDiscountBanner}
          initialCategorySection={initialCategorySection}
        />
      </main>

      <Footer />
    </div>
  );
}
