'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { CategorySection } from '@/app/components/home/CategorySection';
import { DiscountBanner } from '@/app/components/home/DiscountBanner';
import { HeroSlider } from '@/app/components/home/HeroSlider';
import { MenCollection } from '@/app/components/home/MenCollection';
import { NewArrivals } from '@/app/components/home/NewArrivals';
import { PromoBlock } from '@/app/components/home/PromoBlock';
import { WomenCollection } from '@/app/components/home/WomenCollection';
import type { Product } from '@/app/components/product/ProductCard';
import { ACCENT_WOMEN } from '@/app/constants/colors';
import { useAuth } from '@/app/context/AuthContext';
import { RecentlyViewedSection } from '@/app/pages/product/RecentlyViewedSection';
import type { RootState } from '@/app/store';
import { getOrCreateGuestId } from '@/app/utils/guest-id';
import { loadCartComplementProductsAction } from '@/lib/oneentry/blocks/cart-complement-action';
import type { CategorySectionFromCms } from '@/lib/oneentry/blocks/category-section';
import type { DiscountBannerFromCms } from '@/lib/oneentry/blocks/discount-banner';
import type { HeroSlideFromCms } from '@/lib/oneentry/blocks/hero-slides';
import type { HomepageCollectionItem } from '@/lib/oneentry/blocks/homepage-collections';
import type { PageBlock } from '@/lib/oneentry/blocks/page-blocks';
import { sectionChromeFromBlock } from '@/lib/oneentry/blocks/section-chrome';

import { GenericCommonBlock } from './GenericCommonBlock';
import { GenericSliderBlock } from './GenericSliderBlock';

/** Renders `<RecentlyViewedSection>` seeded from the Redux `recentlyViewed` trail. Client-side loader for `cart_complement_block` products. */
function CartComplementBlockSlot({ marker, title }: { marker: string; title: string }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    let cancelled = false;
    const guestId = isLoggedIn ? undefined : getOrCreateGuestId();
    loadCartComplementProductsAction(marker, guestId)
      .then((items) => {
        if (!cancelled) setProducts(items);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [marker, isLoggedIn]);

  if (!products || products.length === 0) return null;
  return <NewArrivals products={products} title={title} />;
}

function RecentlyViewedBlockSlot() {
  const items = useSelector((s: RootState) => s.recentlyViewed.items);
  const unique: Product[] = (() => {
    const seen = new Set<string>();
    const out: Product[] = [];
    for (const p of items) {
      const key = (p.name || p.id).toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    return out;
  })();
  if (unique.length === 0) return null;
  return <RecentlyViewedSection products={unique} accentColor={ACCENT_WOMEN} />;
}

/** Fade-and-lift-in section. */
function AnimatedSection({
  children,
  className = '',
  immediate = false,
}: {
  children: React.ReactNode;
  className?: string;
  immediate?: boolean;
}) {
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
      { threshold: 0.05, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [immediate]);

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
      className={`${className ?? ''} transition-[opacity,transform] duration-650 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-7 opacity-0'
      }`}
    >
      {children}
    </div>
  );
}

/** Render a list of OE-attached blocks in admin-defined order. */
export function PageBlocksRenderer({
  blocks,
  initialHeroSlides,
  initialPromoItems,
  initialDiscountBanner,
  initialCategorySection,
}: {
  blocks: PageBlock[];
  initialHeroSlides?: HeroSlideFromCms[];
  initialPromoItems?: HomepageCollectionItem[];
  initialDiscountBanner?: DiscountBannerFromCms | null;
  initialCategorySection?: CategorySectionFromCms;
}) {
  return (
    <>
      {blocks.map((block, idx) => {
        const key = `${block.marker}-${idx}`;
        // Hero, when placed as the first block, sits flush against the top.
        const wrapperCls = block.marker === 'hero_slider' ? '' : 'mt-8 md:mt-12 lg:mt-16';
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
                <PromoBlock initialItems={initialPromoItems} priority={idx === 0} />
              </AnimatedSection>
            );
          case 'discount_banner':
            return (
              <AnimatedSection key={key} className={wrapperCls}>
                <DiscountBanner initialBanner={initialDiscountBanner} priority={idx === 0} />
              </AnimatedSection>
            );
          case 'men_collection':
          case 'homepage_best_sellers':
            return (
              <AnimatedSection key={key} className={wrapperCls}>
                <MenCollection products={block.products} title={block.title} chrome={sectionChromeFromBlock(block)} />
              </AnimatedSection>
            );
          case 'women_collection':
          case 'homepage_new_arrivals':
            return (
              <AnimatedSection key={key} className={wrapperCls}>
                <WomenCollection products={block.products} title={block.title} chrome={sectionChromeFromBlock(block)} />
              </AnimatedSection>
            );
          case 'new_arrivals':
          case 'homepage_sale':
            return (
              <AnimatedSection key={key} className={wrapperCls}>
                <NewArrivals products={block.products} title={block.title} chrome={sectionChromeFromBlock(block)} />
              </AnimatedSection>
            );
          default:
            // OE block type `recently_viewed_block` (admin marker is usually `recently_viewed`, but we route by `type` so custom markers still work).
            if (block.type === 'recently_viewed_block') {
              return (
                <div key={key} className={wrapperCls}>
                  <RecentlyViewedBlockSlot />
                </div>
              );
            }
            // `cart_complement_block` needs the caller's OE context (access token or guest id) to resolve — `<CartComplementBlockSlot>` does that client-side.
            if (block.type === 'cart_complement_block') {
              return (
                <div key={key} className={wrapperCls}>
                  <CartComplementBlockSlot marker={block.marker} title={block.title} />
                </div>
              );
            }
            // Generic banner for OE `common_block` type — reads `attributeValues` heuristically (image / eyebrow / title / subtitle / description / CTA).
            if (block.type === 'common_block') {
              return (
                <div key={key} className={wrapperCls}>
                  <GenericCommonBlock attributeValues={block.attributeValues} title={block.title} />
                </div>
              );
            }
            // Generic carousel for OE `slider_block` type — reads each slide's `attributeValues` heuristically.
            if (block.type === 'slider_block') {
              return (
                <div key={key} className={wrapperCls}>
                  <GenericSliderBlock slides={block.slides} title={block.title} />
                </div>
              );
            }
            if (block.products.length > 0) {
              return (
                <div key={key} className={wrapperCls}>
                  <NewArrivals products={block.products} title={block.title} chrome={sectionChromeFromBlock(block)} />
                </div>
              );
            }
            // Block has a title but no products and no dedicated component.
            if (block.title) {
              return (
                <section key={key} className={`${wrapperCls} px-4 py-6 lg:px-8`}>
                  <h2 className="text-[clamp(1rem,2vw,1.25rem)] font-bold tracking-widest uppercase">{block.title}</h2>
                </section>
              );
            }
            return null;
        }
      })}
    </>
  );
}
