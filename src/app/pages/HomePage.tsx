'use client'
import React from 'react';
import { Header } from '../components/Header';
import type { HeroSlideFromCms } from '../../lib/oneentry/blocks/hero-slides';
import type { HomepageCollectionItem } from '../../lib/oneentry/blocks/homepage-collections';
import type { DiscountBannerFromCms } from '../../lib/oneentry/blocks/discount-banner';
import type { CategorySectionFromCms } from '../../lib/oneentry/blocks/category-section';
import type { PageBlock } from '../../lib/oneentry/blocks/page-blocks';
import { Footer } from '../components/Footer';
import { PageBlocksRenderer } from '../components/PageBlocksRenderer';

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
    <div className="min-h-screen bg-white font-[Inter,sans-serif]">
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
