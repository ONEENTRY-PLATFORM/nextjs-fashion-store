'use client'
import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import type { PageBlock } from '../../lib/oneentry/blocks/page-blocks';
import type { HeroSlideFromCms } from '../../lib/oneentry/blocks/hero-slides';
import type { HomepageCollectionItem } from '../../lib/oneentry/blocks/homepage-collections';
import type { DiscountBannerFromCms } from '../../lib/oneentry/blocks/discount-banner';
import type { CategorySectionFromCms } from '../../lib/oneentry/blocks/category-section';
import { HeroSlider } from './HeroSlider';
import { CategorySection } from './CategorySection';
import { PromoBlock } from './PromoBlock';
import { DiscountBanner } from './DiscountBanner';
import { MenCollection } from './MenCollection';
import { WomenCollection } from './WomenCollection';
import { NewArrivals } from './NewArrivals';
import { RecentlyViewedSection } from '../pages/product/RecentlyViewedSection';
import { ACCENT_WOMEN } from '../constants/colors';
import type { Product } from './ProductCard';
import { loadCartComplementProductsAction } from '../../lib/oneentry/blocks/cart-complement-action';
import { useAuth } from '../context/AuthContext';
import { getOrCreateGuestId } from '../utils/guest-id';
import { GenericCommonBlock } from './blocks/GenericCommonBlock';
import { GenericSliderBlock } from './blocks/GenericSliderBlock';

/** Renders `<RecentlyViewedSection>` seeded from the Redux `recentlyViewed`
 *  trail (same source of truth as HomePage / PDP / Favorites). Deduped by
 *  product name/id so different variants of the same item (Pink XL / White M)
 *  don't each surface as a separate tile. Hidden entirely when the trail is
 *  empty — a brand-new visitor hasn't viewed anything yet. */
/** Client-side loader for `cart_complement_block` products. OE's
 *  `Blocks.getCartComplement` resolves cross-sell against the caller's real
 *  session (user access token or guest `x-guest-id`) — impossible from the
 *  shared server singleton, which carries only the app token. So we call
 *  it on mount via a server action that reads the access cookie and
 *  forwards the client's `oe_guest_id` (from localStorage). Empty result →
 *  hides the block entirely. */
function CartComplementBlockSlot({ marker, title }: { marker: string; title: string }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    let cancelled = false;
    const guestId = isLoggedIn ? undefined : getOrCreateGuestId();
    loadCartComplementProductsAction(marker, guestId)
      .then((items) => { if (!cancelled) setProducts(items); })
      .catch(() => { if (!cancelled) setProducts([]); });
    return () => { cancelled = true; };
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

/** Fade-and-lift-in section — matches HomePage's original animation so
 *  blocks look identical regardless of where they're rendered. */
function AnimatedSection({ children, className = '', immediate = false }: { children: React.ReactNode; className?: string; immediate?: boolean }) {
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

/**
 * Render a list of OE-attached blocks in admin-defined order (already sorted
 * by `position` upstream in `loadPageBlocksByUrl` / `loadPageBlocksById` /
 * `loadProductBlocks`). Maps each block's `marker` to a storefront component;
 * unknown markers with resolved products render through `NewArrivals` (safe
 * generic layout), unknown markers with no products render nothing.
 *
 * `initialHeroSlides` / `initialPromoItems` / `initialDiscountBanner` /
 * `initialCategorySection` are the homepage's dedicated pre-fetched payloads.
 * When rendering on non-homepage routes, leave them undefined — the child
 * components will fetch client-side on mount.
 */
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
        // Every other block gets the standard vertical rhythm.
        const wrapperCls = block.marker === 'hero_slider'
          ? ''
          : 'mt-8 md:mt-12 lg:mt-16';
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
            // OE block type `recently_viewed_block` (admin marker is
            // usually `recently_viewed`, but we route by `type` so custom
            // markers still work). Data comes from Redux (client-side
            // trail), so we hide the section entirely when the visitor
            // hasn't viewed anything yet. Not wrapped in AnimatedSection
            // because these blocks often sit below the initial viewport
            // (e.g. bottom of checkout pages) — the observer wouldn't
            // fire until the user scrolled to it, leaving an empty gap
            // in the layout for the first ~1500px of scroll.
            if (block.type === 'recently_viewed_block') {
              return (
                <div key={key} className={wrapperCls}>
                  <RecentlyViewedBlockSlot />
                </div>
              );
            }
            // `cart_complement_block` needs the caller's OE context
            // (access token or guest id) to resolve — `<CartComplementBlockSlot>`
            // does that client-side. Hides itself when the response
            // is empty, so no header noise on the storefront.
            if (block.type === 'cart_complement_block') {
              return (
                <div key={key} className={wrapperCls}>
                  <CartComplementBlockSlot marker={block.marker} title={block.title} />
                </div>
              );
            }
            // Generic banner for OE `common_block` type — reads
            // `attributeValues` heuristically (image / eyebrow / title /
            // subtitle / description / CTA). Lets admins attach any new
            // `common_block` marker to any page and have it render
            // without code changes.
            if (block.type === 'common_block') {
              return (
                <div key={key} className={wrapperCls}>
                  <GenericCommonBlock
                    attributeValues={block.attributeValues}
                    title={block.title}
                  />
                </div>
              );
            }
            // Generic carousel for OE `slider_block` type — reads each
            // slide's `attributeValues` heuristically. Homepage keeps
            // `hero_slider` marker with its dedicated `<HeroSlider>`
            // (auto-advance + gender toggle); other slider markers hit
            // this branch.
            if (block.type === 'slider_block') {
              return (
                <div key={key} className={wrapperCls}>
                  <GenericSliderBlock
                    slides={block.slides}
                    title={block.title}
                  />
                </div>
              );
            }
            if (block.products.length > 0) {
              return (
                <div key={key} className={wrapperCls}>
                  <NewArrivals products={block.products} title={block.title} />
                </div>
              );
            }
            // Block has a title but no products and no dedicated component.
            // Render the header only so admins still see the block was
            // accepted by the storefront instead of silently dropped —
            // matches OE's "block is on the page" mental model.
            if (block.title) {
              return (
                <section key={key} className={`${wrapperCls} px-4 lg:px-8 py-6`}>
                  <h2 className="tracking-widest uppercase text-[clamp(1rem,2vw,1.25rem)] font-bold">
                    {block.title}
                  </h2>
                </section>
              );
            }
            return null;
        }
      })}
    </>
  );
}
