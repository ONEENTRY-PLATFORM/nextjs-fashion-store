'use client'
import React, { useEffect, useRef, useState } from 'react';
import { Header } from '../components/Header';
import { HeroSlider } from '../components/HeroSlider';
import type { HeroSlideFromCms } from '../../lib/oneentry/blocks/hero-slides';
import type { HomepageCollectionItem } from '../../lib/oneentry/blocks/homepage-collections';
import type { DiscountBannerFromCms } from '../../lib/oneentry/blocks/discount-banner';
import type { CategorySectionFromCms } from '../../lib/oneentry/blocks/category-section';
import type { PageBlock } from '../../lib/oneentry/blocks/page-blocks';
import { CategorySection } from '../components/CategorySection';
import { MenCollection } from '../components/MenCollection';
import { WomenCollection } from '../components/WomenCollection';
import { PromoBlock } from '../components/PromoBlock';
import { NewArrivals } from '../components/NewArrivals';
import { DiscountBanner } from '../components/DiscountBanner';
import { Footer } from '../components/Footer';

function AnimatedSection({ children, className = '', immediate = false }: { children: React.ReactNode; className?: string; immediate?: boolean }) {
  // SSR renders `opacity-0 translate-y-7` for non-immediate sections and
  // `opacity-100` for the hero. The IntersectionObserver flips the flag as
  // each section enters the viewport, so the first render always matches
  // between server and client (no flash of visible-then-hidden that the old
  // sessionStorage gate produced).
  const [visible, setVisible] = useState(immediate);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (immediate) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [immediate]);

  // Safety net for bfcache restore — the observer might not re-fire when the
  // page comes back from the back/forward cache, so we force-reveal on
  // `pageshow` with the persisted flag.
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setVisible(true);
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  return (
    <div
      ref={ref}
      className={`${className ?? ''} transition-[opacity,transform] duration-[650ms] ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'
      }`}
    >
      {children}
    </div>
  );
}

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
        {pageBlocks.map((block, idx) => {
          const key = `${block.marker}-${idx}`;
          // Hero slider, when admin places it in the page-blocks list, sits
          // flush against the top (no extra margin). All other blocks get the
          // standard vertical rhythm.
          const wrapperCls = block.marker === 'hero_slider'
            ? ''
            : 'mt-8 md:mt-12 lg:mt-16';
          // Map an OE block marker/type to a storefront component. Falls back
          // to a no-op when nothing matches so unknown blocks don't crash the
          // page. Adding a new marker on the admin side requires a tiny entry
          // here; the rest stays automatic.
          switch (block.marker) {
            case 'hero_slider':
              return (
                <AnimatedSection key={key} className={wrapperCls} immediate>
                  <HeroSlider initialSlides={initialHeroSlides} />
                </AnimatedSection>
              );
            case 'category_section':
              return (
                <AnimatedSection key={key} className={wrapperCls}>
                  <CategorySection
                    initialChips={initialCategorySection?.chips}
                    initialCategories={initialCategorySection?.categories}
                  />
                </AnimatedSection>
              );
            case 'promo_block':
              return (
                <AnimatedSection key={key} className={wrapperCls}>
                  <PromoBlock initialItems={initialPromoItems} />
                </AnimatedSection>
              );
            case 'discount_banner':
              return (
                <AnimatedSection key={key} className={wrapperCls}>
                  <DiscountBanner initialBanner={initialDiscountBanner} />
                </AnimatedSection>
              );
            case 'men_collection':
            case 'homepage_best_sellers':
              return (
                <AnimatedSection key={key} className={wrapperCls}>
                  <MenCollection products={block.products} title={block.title} />
                </AnimatedSection>
              );
            case 'women_collection':
            case 'homepage_new_arrivals':
              return (
                <AnimatedSection key={key} className={wrapperCls}>
                  <WomenCollection products={block.products} title={block.title} />
                </AnimatedSection>
              );
            case 'new_arrivals':
            case 'homepage_sale':
              return (
                <AnimatedSection key={key} className={wrapperCls}>
                  <NewArrivals products={block.products} title={block.title} />
                </AnimatedSection>
              );
            default:
              // Generic fallback for any product-list block we don't have a
              // dedicated component for: render through NewArrivals (gray
              // accent, neutral copy).
              if (block.products.length > 0) {
                return (
                  <AnimatedSection key={key} className={wrapperCls}>
                    <NewArrivals products={block.products} title={block.title} />
                  </AnimatedSection>
                );
              }
              return null;
          }
        })}
      </main>

      <Footer />
    </div>
  );
}
