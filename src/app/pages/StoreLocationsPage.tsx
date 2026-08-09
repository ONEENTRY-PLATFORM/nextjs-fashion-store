'use client';
import { ChevronRight, ExternalLink, MapPin, Search } from 'lucide-react';
import { useState } from 'react';

import { PageBlocksRenderer } from '@/app/components/blocks/PageBlocksRenderer';
import { Footer } from '@/app/components/footer/Footer';
import { Header } from '@/app/components/header/Header';
import CmsImage from '@/app/components/ui/CmsImage';
import { ACCENT_MEN, ACCENT_WOMEN as ACCENT, BANNER_BG } from '@/app/constants/colors';
import type { Store } from '@/app/data/stores';
import { STORE_LOCATIONS_LABELS } from '@/app/data/storesLabels';
import { useRouter } from '@/lib/i18n/navigation';
import type { PageBlock } from '@/lib/oneentry/blocks/page-blocks';
import type { StoreLocationsPageFromCms } from '@/lib/oneentry/catalog/store-locations-page';
import { useDict, useList, useT } from '@/lib/oneentry/labels/DictContext';

import { StoreCard } from './stores/StoreCard';

type StoreLocationsPageProps = {
  initialStores?: Store[];
  cmsPage?: StoreLocationsPageFromCms | null;
  /** OE-attached blocks for the `stores` page. Rendered above the hero. */
  pageBlocks?: PageBlock[];
};

export function StoreLocationsPage({ initialStores, cmsPage, pageBlocks }: StoreLocationsPageProps = {}) {
  const L = useDict('store_pages_', STORE_LOCATIONS_LABELS);
  const router = useRouter();
  const stores = initialStores ?? [];
  const flagshipStore: Store | undefined = stores.find((s) => s.isflagship) ?? stores[0];
  const heroImage =
    cmsPage?.hero.image ||
    'https://images.unsplash.com/photo-1582461420964-9e1ecbbbd138?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1920&q=80';
  // Only the CMS picture has an LQIP; the Unsplash fallback above has none.
  const heroBlur = cmsPage?.hero.image ? cmsPage.hero.imageBlur : undefined;
  const heroEyebrow = cmsPage?.hero.eyebrow || L.heroEyebrow;
  const heroTitle = cmsPage?.hero.title || L.heroTitle;
  const heroText = cmsPage?.hero.text || `${stores.length} ${L.heroSubtitleSuffix}`;
  const flagshipSubtitle = cmsPage?.flagshipCallout.subtitle || L.flagshipEyebrow;
  const flagshipTitle = cmsPage?.flagshipCallout.title || L.flagshipName;
  const flagshipText = cmsPage?.flagshipCallout.text || L.flagshipBody;
  const flagshipMapUrl = cmsPage?.flagshipCallout.directionsHref || flagshipStore?.mapUrl || '#';
  const allCities = [L.cityAll, ...Array.from(new Set(stores.map((s) => s.city)))];
  const [selectedCity, setSelectedCity] = useState<string>(L.cityAll);
  const [searchQuery, setSearchQuery] = useState('');
  const lSearch = useT('store_location_search', L.searchPlaceholder);
  const lFound = useT('store_location_found', L.storesFoundPlural);
  const lAllOffer = useT('store_location_all_stores_offer', L.allStoresOffer);
  const lFooterText = useT('store_location_footer_text', L.shopOnlineCopy);
  const lFooterLink = useT('store_location_footer_link', L.shopOnlineCta);
  const lBookStyling = useT('store_location_footer_banner_cta', L.flagshipBookStyling);
  // The services strip is a `{icon, label}` array, and `useDict` passes
  // non-string entries through untouched — they are structure, not copy. So the
  // labels travel as a comma-separated marker of their own (the same shape
  // `header_regions` uses) while the emoji stay in code: they are decoration
  // keyed by position, not wording an editor should have to retype.
  const serviceLabels = useList(
    'store_pages_services',
    STORE_LOCATIONS_LABELS.services.map((s) => s.label),
  );
  const services = serviceLabels.map((label, i) => ({
    label,
    icon: STORE_LOCATIONS_LABELS.services[i]?.icon ?? '',
  }));

  const filtered = stores.filter((s) => {
    const matchCity = selectedCity === L.cityAll || s.city === selectedCity;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.postcode.toLowerCase().includes(q);
    return matchCity && matchSearch;
  });

  return (
    <div
      className="min-h-screen bg-white font-[Inter,sans-serif]"
      style={
        {
          '--accent': ACCENT,
          '--accent-men': ACCENT_MEN,
          '--banner-bg': BANNER_BG,
        } as React.CSSProperties
      }
    >
      <Header />

      {/* Hero */}
      <div className="relative flex h-80 flex-col items-center justify-center overflow-hidden bg-(--banner-bg) text-center">
        {/* Background photo */}
        <CmsImage
          src={heroImage}
          blur={heroBlur}
          alt={L.heroImageAlt}
          fill
          sizes="100vw"
          priority
          className="object-cover object-center"
        />
        {/* Dark overlay for text legibility */}
        <div className="absolute inset-0 bg-black/[0.52]" />

        <div className="relative z-10 px-4">
          <p className="mb-3 text-xs font-semibold tracking-[0.3em] text-accent uppercase">{heroEyebrow}</p>
          <h1 className="hero-h1 mb-4 tracking-[0.15em] text-white uppercase">{heroTitle}</h1>
          <p className="mx-auto max-w-md text-sm tracking-wide text-white/75">{heroText}</p>
        </div>
        {/* Decorative lines */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-black" />
      </div>

      <main id="main-content" className="w-full py-10 pb-20">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 px-4 text-xs tracking-wide text-gray-400 lg:px-8">
          <button
            onClick={() => router.push('/')}
            className="transition-colors hover:text-black focus-visible:outline-none"
          >
            {L.breadcrumbHome}
          </button>
          <ChevronRight size={12} />
          <span className="font-semibold text-black">{L.breadcrumbCurrent}</span>
        </nav>

        {/* Controls */}
        <div className="mb-8 flex flex-col gap-3 px-4 sm:flex-row lg:px-8">
          {/* Search */}
          <div className="flex max-w-xs flex-1 items-center gap-2 border border-black px-3 py-2.5">
            <Search size={14} className="shrink-0 text-gray-400" />
            <input
              type="text"
              placeholder={lSearch}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm placeholder-gray-400 focus-visible:outline-none"
            />
          </div>

          {/* City filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            {allCities.map((city) => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`border border-black px-4 py-2 text-xs tracking-widest uppercase transition-all duration-200 focus-visible:outline-none ${
                  selectedCity === city ? 'bg-black font-bold text-white' : 'bg-transparent font-medium text-black'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="mb-6 px-4 text-xs font-medium tracking-widest text-gray-400 uppercase lg:px-8">
          {filtered.length} {filtered.length === 1 ? L.storesFoundSingular : lFound}
        </p>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="mb-16 grid grid-cols-1 gap-px bg-white sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((store) => (
              <div key={store.id} className="bg-white">
                <StoreCard store={store} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
            <MapPin size={40} strokeWidth={1} className="mb-4 text-accent" />
            <h3 className="mb-2 text-base font-bold tracking-wider uppercase">{L.emptyHeading}</h3>
            <p className="text-sm text-gray-400">{L.emptyHint}</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCity(L.cityAll);
              }}
              className="mt-6 bg-black px-6 py-2.5 text-xs font-bold tracking-widest text-white uppercase transition-opacity hover:opacity-80 focus-visible:outline-none"
            >
              {L.clearFilters}
            </button>
          </div>
        )}

        {/* In-store services strip */}
        <div className="mb-12 bg-(--banner-bg) p-8" data-testid="stores-services-strip">
          <p className="mb-6 text-center text-xs font-bold tracking-[0.3em] uppercase">{lAllOffer}</p>
          <div className="grid grid-cols-2 gap-px bg-white sm:grid-cols-4">
            {services.map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center justify-center gap-3 bg-white px-4 py-8 text-center"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs font-semibold tracking-wider uppercase">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Flagship callout */}
        {flagshipStore && (
          <div className="mb-12 flex flex-col overflow-hidden outline-1 outline-black md:flex-row">
            <div className="relative min-h-70 overflow-hidden bg-gray-100 md:w-1/2">
              {flagshipStore.image && (
                <CmsImage
                  src={flagshipStore.image}
                  blur={flagshipStore.imageBlur}
                  alt={L.flagshipImageAlt}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex flex-col justify-center bg-(--banner-bg) px-8 py-10 md:w-1/2">
              <p className="mb-2 text-xs font-semibold tracking-[0.3em] text-accent uppercase">{flagshipSubtitle}</p>
              <h2 className="mb-4 text-2xl font-bold tracking-wider uppercase">{flagshipTitle}</h2>
              <p className="mb-6 max-w-sm text-sm leading-relaxed text-gray-600">{flagshipText}</p>
              <div className="flex gap-3">
                <a
                  href={flagshipMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-black px-5 py-3 text-xs font-bold tracking-widest text-white uppercase transition-opacity hover:opacity-80 focus-visible:outline-none"
                >
                  <ExternalLink size={12} />
                  {L.flagshipDirections}
                </a>
                <button className="flex items-center gap-2 border border-black px-5 py-3 text-xs font-semibold tracking-widest uppercase transition-colors hover:bg-white focus-visible:outline-none">
                  {lBookStyling}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="px-4 text-center">
          <p className="mb-4 text-sm tracking-wide text-gray-400">{lFooterText}</p>
          <button
            onClick={() => router.push(L.shopOnlineHref)}
            className="inline-flex items-center gap-2 text-sm font-bold tracking-widest uppercase transition-all hover:gap-3 focus-visible:outline-none"
          >
            {lFooterLink} <ChevronRight size={15} />
          </button>
        </div>
      </main>

      {/* OE-attached blocks for the `stores` page — rendered at the
          bottom below the store list. Empty → nothing renders. */}
      {pageBlocks && pageBlocks.length > 0 && <PageBlocksRenderer blocks={pageBlocks} />}

      <Footer />
    </div>
  );
}
