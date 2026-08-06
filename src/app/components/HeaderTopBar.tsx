'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  GlobeAltIcon, ChevronDownIcon, PhoneIcon, MapPinIcon,
} from '@heroicons/react/24/outline';
import {
  HEADER_REGIONS, SUPPORT_PHONE,
  FALLBACK_LANGUAGE_LABEL, STORE_LOCATIONS_HREF,
} from '../data/headerConfig';
import { useHeaderT, useHeaderList, useCmsLocales } from '../../lib/oneentry/labels/HeaderLabelsContext';

export function HeaderTopBar() {
  const router = useRouter();
  const [cityOpen, setCityOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  // Copy from the OE `header` set; local constants are the offline fallback.
  const lRegion = useHeaderT('header_default_region', 'Europe');
  const regions = useHeaderList('header_regions', HEADER_REGIONS);
  const lPhone = useHeaderT('header_support_phone', SUPPORT_PHONE);
  const lStores = useHeaderT('header_store_locations', 'Store Locations');

  // Languages are the project's active locales, not a curated list — adding a
  // locale in the admin panel surfaces it here with no code change.
  const locales = useCmsLocales();
  const activeLanguage = locales[0]?.shortCode.toUpperCase() ?? FALLBACK_LANGUAGE_LABEL;

  useEffect(() => {
    if (!cityOpen && !langOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setCityOpen(false); setLangOpen(false); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [cityOpen, langOpen]);

  return (
    <div className="bg-black text-white hidden md:block" data-testid="header-top-bar">
      <div className="max-w-384 mx-auto px-8 lg:px-12 h-10 flex items-center justify-between text-xs">
        <div className="flex items-center gap-6">
          <div className="relative">
            <button
              onClick={() => { setCityOpen(!cityOpen); setLangOpen(false); }}
              className="flex items-center gap-1 hover:opacity-80 transition-opacity"
              data-testid="header-region-toggle"
            >
              <GlobeAltIcon className="w-5 h-5" />
              <span>{lRegion}</span>
              <ChevronDownIcon className="w-4 h-4" />
            </button>
            {cityOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white text-black shadow-lg z-50 min-w-35 border border-gray-200">
                {regions.map((c) => (
                  <button key={c} onClick={() => setCityOpen(false)} className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors">
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Only render the switcher when the tenant publishes more than one
              locale — a single-locale project has nothing to switch to. */}
          <div className="relative">
            <button
              onClick={() => { setLangOpen(!langOpen); setCityOpen(false); }}
              className="flex items-center gap-1 hover:opacity-80 transition-opacity"
              data-testid="header-language-toggle"
              disabled={locales.length < 2}
            >
              <span>{activeLanguage}</span>
              {locales.length > 1 && <ChevronDownIcon className="w-4 h-4" />}
            </button>
            {langOpen && locales.length > 1 && (
              <div className="absolute top-full left-0 mt-1 bg-white text-black shadow-lg z-50 min-w-25 border border-gray-200">
                {locales.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLangOpen(false)}
                    title={l.nativeName || l.name}
                    className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors"
                  >
                    {l.shortCode.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <PhoneIcon className="w-4 h-4" />
            <span>{lPhone}</span>
          </div>
          <button
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity focus-visible:outline-none"
            onClick={() => router.push(STORE_LOCATIONS_HREF)}
            data-testid="header-store-locations"
          >
            <MapPinIcon className="w-4 h-4" />
            <span>{lStores}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
