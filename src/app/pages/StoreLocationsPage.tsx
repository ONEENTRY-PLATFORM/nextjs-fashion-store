'use client'
import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { MapPin, ExternalLink, Search, ChevronRight } from 'lucide-react';
import type { Store } from '../data/stores';
import { StoreCard } from './stores/StoreCard';
import { STORE_LOCATIONS_LABELS as L } from '../data/storesLabels';
import { useStoresT } from '../../lib/oneentry/labels/StoresLabelsContext';
import type { StoreLocationsPageFromCms } from '../../lib/oneentry/catalog/store-locations-page';
import { PageBlocksRenderer } from '../components/PageBlocksRenderer';
import type { PageBlock } from '../../lib/oneentry/blocks/page-blocks';

import { ACCENT_WOMEN as ACCENT, ACCENT_MEN, BANNER_BG } from '../constants/colors';

type StoreLocationsPageProps = {
  initialStores?: Store[];
  cmsPage?: StoreLocationsPageFromCms | null;
  /** OE-attached blocks for the `stores` page. Rendered above the hero. */
  pageBlocks?: PageBlock[];
};

export function StoreLocationsPage({ initialStores, cmsPage, pageBlocks }: StoreLocationsPageProps = {}) {
  const router = useRouter();
  const stores = initialStores ?? [];
  const flagshipStore: Store | undefined = stores.find(s => s.isflagship) ?? stores[0];
  const heroImage = cmsPage?.hero.image || 'https://images.unsplash.com/photo-1582461420964-9e1ecbbbd138?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1920&q=80';
  const heroEyebrow = cmsPage?.hero.eyebrow || L.heroEyebrow;
  const heroTitle = cmsPage?.hero.title || L.heroTitle;
  const heroText = cmsPage?.hero.text || `${stores.length} ${L.heroSubtitleSuffix}`;
  const flagshipSubtitle = cmsPage?.flagshipCallout.subtitle || L.flagshipEyebrow;
  const flagshipTitle = cmsPage?.flagshipCallout.title || L.flagshipName;
  const flagshipText = cmsPage?.flagshipCallout.text || L.flagshipBody;
  const flagshipMapUrl = cmsPage?.flagshipCallout.directionsHref || flagshipStore?.mapUrl || '#';
  const allCities = [L.cityAll, ...Array.from(new Set(stores.map(s => s.city)))];
  const [selectedCity, setSelectedCity] = useState<string>(L.cityAll);
  const [searchQuery, setSearchQuery] = useState('');
  const lSearch       = useStoresT('store_location', 'store_location_search',             L.searchPlaceholder);
  const lFound        = useStoresT('store_location', 'store_location_found',              L.storesFoundPlural);
  const lAllOffer     = useStoresT('store_location', 'store_location_all_stores_offer',   L.allStoresOffer);
  const lFooterText   = useStoresT('store_location', 'store_location_footer_text',        L.shopOnlineCopy);
  const lFooterLink   = useStoresT('store_location', 'store_location_footer_link',        L.shopOnlineCta);
  const lBookStyling  = useStoresT('store_location', 'store_location_footer_banner_cta',  L.flagshipBookStyling);

  const filtered = stores.filter(s => {
    const matchCity = selectedCity === L.cityAll || s.city === selectedCity;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q) || s.postcode.toLowerCase().includes(q);
    return matchCity && matchSearch;
  });

  return (
    <div
      className="min-h-screen bg-white font-[Inter,sans-serif]"
      style={{
        '--accent': ACCENT,
        '--accent-men': ACCENT_MEN,
        '--banner-bg': BANNER_BG,
      } as React.CSSProperties}
    >
      <Header />

      {/* Hero */}
      <div className="relative flex flex-col items-center justify-center text-center overflow-hidden h-[320px] bg-[var(--banner-bg)]">
        {/* Background photo */}
        <Image
          src={heroImage}
          alt={L.heroImageAlt}
          fill
          sizes="100vw"
          priority
          className="object-cover object-center"
        />
        {/* Dark overlay for text legibility */}
        <div className="absolute inset-0 bg-black/[0.52]" />

        <div className="relative z-10 px-4">
          <p className="text-xs tracking-[0.3em] uppercase mb-3 text-[var(--accent)] font-semibold">
            {heroEyebrow}
          </p>
          <h1 className="hero-h1 uppercase tracking-[0.15em] mb-4 text-white">
            {heroTitle}
          </h1>
          <p className="text-sm tracking-wide max-w-md mx-auto text-white/75">
            {heroText}
          </p>
        </div>
        {/* Decorative lines */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-black" />
      </div>

      <main id="main-content" className="w-full py-10 pb-20">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-8 tracking-wide px-4 lg:px-8">
          <button onClick={() => router.push('/')} className="hover:text-black transition-colors focus-visible:outline-none">
            {L.breadcrumbHome}
          </button>
          <ChevronRight size={12} />
          <span className="text-black font-semibold">{L.breadcrumbCurrent}</span>
        </nav>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8 px-4 lg:px-8">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2.5 flex-1 max-w-xs border border-black">
            <Search size={14} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder={lSearch}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 text-sm bg-transparent focus-visible:outline-none placeholder-gray-400"
            />
          </div>

          {/* City filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {allCities.map(city => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-4 py-2 text-xs tracking-widest uppercase transition-all duration-200 focus-visible:outline-none border border-black ${
                  selectedCity === city
                    ? 'bg-black text-white font-bold'
                    : 'bg-transparent text-black font-medium'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-xs tracking-widest uppercase text-gray-400 mb-6 px-4 lg:px-8 font-medium">
          {filtered.length} {filtered.length === 1 ? L.storesFoundSingular : lFound}
        </p>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white mb-16">
            {filtered.map(store => (
              <div key={store.id} className="bg-white">
                <StoreCard store={store} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <MapPin size={40} strokeWidth={1} className="text-[var(--accent)] mb-4" />
            <h3 className="text-base uppercase tracking-wider mb-2 font-bold">{L.emptyHeading}</h3>
            <p className="text-sm text-gray-400">{L.emptyHint}</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCity(L.cityAll); }}
              className="mt-6 px-6 py-2.5 text-xs tracking-widest uppercase text-white focus-visible:outline-none hover:opacity-80 transition-opacity bg-black font-bold"
            >
              {L.clearFilters}
            </button>
          </div>
        )}

        {/* In-store services strip */}
        <div className="px-8 py-8 mb-12 bg-[var(--banner-bg)]">
          <p className="text-xs tracking-[0.3em] uppercase text-center mb-6 font-bold">
            {lAllOffer}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white">
            {L.services.map(item => (
              <div
                key={item.label}
                className="bg-white flex flex-col items-center justify-center py-8 gap-3 text-center px-4"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs tracking-wider uppercase font-semibold">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Flagship callout */}
        {flagshipStore && (
        <div className="flex flex-col md:flex-row overflow-hidden mb-12 outline outline-1 outline-black">
          <div className="md:w-1/2 relative overflow-hidden min-h-[280px] bg-gray-100">
            {flagshipStore.image && (
              <Image
                src={flagshipStore.image}
                alt={L.flagshipImageAlt}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            )}
          </div>
          <div className="md:w-1/2 flex flex-col justify-center px-8 py-10 bg-[var(--banner-bg)]">
            <p className="text-xs tracking-[0.3em] uppercase mb-2 text-[var(--accent)] font-semibold">
              {flagshipSubtitle}
            </p>
            <h2 className="text-2xl uppercase tracking-wider mb-4 font-bold">
              {flagshipTitle}
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-6 max-w-sm">
              {flagshipText}
            </p>
            <div className="flex gap-3">
              <a
                href={flagshipMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-3 text-white text-xs tracking-widest uppercase focus-visible:outline-none hover:opacity-80 transition-opacity bg-black font-bold"
              >
                <ExternalLink size={12} />
                {L.flagshipDirections}
              </a>
              <button
                className="flex items-center gap-2 px-5 py-3 text-xs tracking-widest uppercase focus-visible:outline-none hover:bg-white transition-colors border border-black font-semibold"
              >
                {lBookStyling}
              </button>
            </div>
          </div>
        </div>
        )}

        {/* CTA */}
        <div className="text-center px-4">
          <p className="text-sm text-gray-400 mb-4 tracking-wide">
            {lFooterText}
          </p>
          <button
            onClick={() => router.push(L.shopOnlineHref)}
            className="inline-flex items-center gap-2 text-sm tracking-widest uppercase focus-visible:outline-none hover:gap-3 transition-all font-bold"
          >
            {lFooterLink} <ChevronRight size={15} />
          </button>
        </div>
      </main>

      {/* OE-attached blocks for the `stores` page — rendered at the
          bottom below the store list. Empty → nothing renders. */}
      {pageBlocks && pageBlocks.length > 0 && (
        <PageBlocksRenderer blocks={pageBlocks} />
      )}

      <Footer />
    </div>
  );
}
