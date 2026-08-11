import { ProductCardSkeleton } from '@/app/components/product/ProductCardSkeleton';

/**
 * Vertical rhythm between homepage blocks — mirrors `wrapperCls` in
 * `PageBlocksRenderer` so the skeleton's sections land where the real ones do.
 * The hero is the exception: as the first block it sits flush against the top.
 */
const SECTION_GAP = 'mt-8 md:mt-12 lg:mt-16';

/**
 * Placeholder for one of the product carousels (`homepage_new_arrivals`,
 * `homepage_sale`, `homepage_best_sellers`) — a left-aligned eyebrow +
 * heading with a "view all" link on the right, then a row of cards on the
 * same `w-1/2 md:w-1/3 lg:w-1/5` track `<HorizontalScroller>` lays out.
 *
 * @param   root0       - Props.
 * @param   root0.cards - How many card placeholders to paint (5 fill a wide row).
 * @returns               The carousel skeleton section.
 */
function CarouselSkeleton({ cards = 5 }: { cards?: number }) {
  return (
    <section className={SECTION_GAP} data-testid="home-carousel-skeleton" aria-hidden="true">
      <div className="mx-auto mb-6 flex max-w-384 items-center justify-between px-4 lg:px-8">
        <div>
          <div className="mb-2 h-3 w-24 animate-pulse rounded bg-gray-100" />
          <div className="h-6 w-56 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="flex overflow-hidden border-t border-white">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="w-1/2 shrink-0 border-r border-b border-white md:w-1/3 lg:w-1/5">
            <ProductCardSkeleton />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Homepage-shaped loading placeholder.
 *
 * The segment-wide fallback (`app/[locale]/loading.tsx`) paints a catalog
 * grid, which is nothing like the homepage: hero → category tiles → carousel →
 * two promo photos → carousels → discount banner. Showing it on `/` made the
 * swap to the real page read as a layout jump, so the homepage got its own
 * fallback (`app/[locale]/(home)/loading.tsx`) built on this component.
 *
 * Block order follows `HOMEPAGE_MARKER_ORDER` in `app/[locale]/(home)/page.tsx`;
 * the section geometry is copied from the components each block renders
 * (`HeroSlider`, `CategorySection`, `WomenCollection`, `PromoBlock`,
 * `DiscountBanner`). Keep them in step — that agreement is the whole point.
 *
 * @returns The homepage skeleton.
 */
export function HomeSkeleton() {
  return (
    <div data-testid="home-loading">
      {/* ── Hero — 600px full-bleed slide, copy anchored bottom-left ──────── */}
      <div
        className="relative h-150 w-full animate-pulse overflow-hidden bg-gray-100"
        data-testid="home-hero-skeleton"
        aria-hidden="true"
      >
        <div className="absolute inset-0 flex items-end px-12 pb-16 md:px-20">
          <div className="flex w-full max-w-128 flex-col">
            {/* eyebrow / headline / subtext / CTA */}
            <div className="mb-3 h-4 w-32 rounded bg-gray-200" />
            <div className="mb-4 h-12 w-full rounded bg-gray-200 md:h-16" />
            <div className="mb-2 h-3 w-full max-w-96 rounded bg-gray-200" />
            <div className="mb-8 h-3 w-56 max-w-full rounded bg-gray-200" />
            <div className="h-12 w-44 self-start bg-gray-200" />
          </div>
        </div>
        {/* Prev / next arrows */}
        <div className="absolute top-1/2 left-4 size-10 -translate-y-1/2 bg-gray-200" />
        <div className="absolute top-1/2 right-4 size-10 -translate-y-1/2 bg-gray-200" />
        {/* Dot indicators — the first one is the wide, active dot */}
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
          <div className="h-1 w-6 bg-gray-300" />
          <div className="h-1 w-2 bg-gray-300" />
          <div className="h-1 w-2 bg-gray-300" />
        </div>
      </div>

      {/* ── Category section — centred heading, chips, 6-up tile grid ─────── */}
      <section className={SECTION_GAP} data-testid="home-category-skeleton" aria-hidden="true">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mx-auto mb-6 h-7 w-64 animate-pulse rounded bg-gray-200" />
          <div className="mb-6 flex gap-2 overflow-hidden pb-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-9 w-24 shrink-0 animate-pulse rounded-md bg-gray-100"
                style={{ animationDelay: `${i * 55}ms` }}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-2/3 animate-pulse bg-gray-100" style={{ animationDelay: `${i * 55}ms` }} />
            ))}
          </div>
        </div>
      </section>

      {/* ── New-arrivals carousel ─────────────────────────────────────────── */}
      <CarouselSkeleton />

      {/* ── Promo block — two full-bleed 4:5 photos ───────────────────────── */}
      <section className={`${SECTION_GAP} w-full`} data-testid="home-promo-skeleton" aria-hidden="true">
        <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="aspect-4/5 animate-pulse bg-gray-100" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      </section>

      {/* ── Sale + best-sellers carousels ─────────────────────────────────── */}
      <CarouselSkeleton />
      <CarouselSkeleton />

      {/* ── Discount banner — 480px full-bleed, centred copy ──────────────── */}
      <section
        className={`${SECTION_GAP} relative h-120 w-full animate-pulse bg-gray-100`}
        data-testid="home-banner-skeleton"
        aria-hidden="true"
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4">
          <div className="h-8 w-32 bg-gray-200" />
          <div className="h-20 w-80 max-w-full rounded bg-gray-200" />
          <div className="h-7 w-56 max-w-full rounded bg-gray-200" />
          <div className="h-3 w-72 max-w-full rounded bg-gray-200" />
          <div className="mt-2 h-13 w-52 bg-gray-200" />
        </div>
      </section>
    </div>
  );
}
