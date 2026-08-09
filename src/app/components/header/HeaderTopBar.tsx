'use client';
import { ChevronDownIcon, GlobeAltIcon, MapPinIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { useRouter as useNextRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { FALLBACK_LANGUAGE_LABEL, HEADER_REGIONS, STORE_LOCATIONS_HREF, SUPPORT_PHONE } from '@/app/data/headerConfig';
import { useLocale, usePathnameWithoutLocale, useRouter } from '@/lib/i18n/navigation';
import { useList, useT } from '@/lib/oneentry/labels/DictContext';
import { localizeHref, SHORT_LOCALES, toShortCode } from '@/lib/oneentry/locale';
import { useCmsLocales } from '@/lib/oneentry/LocalesContext';

export function HeaderTopBar() {
  const router = useRouter();
  // Switching locale is the one navigation that must NOT be locale-prefixed by
  // the wrapper: it builds the target prefix itself.
  const rawRouter = useNextRouter();
  const activeLocale = useLocale();
  const barePath = usePathnameWithoutLocale();
  const [cityOpen, setCityOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  // Copy from the OE `header` set; local constants are the offline fallback.
  const lRegion = useT('header_default_region', 'Europe');
  const regions = useList('header_regions', HEADER_REGIONS);
  const lPhone = useT('header_support_phone', SUPPORT_PHONE);
  const lStores = useT('header_store_locations', 'Store Locations');

  // Languages are the project's active locales, not a curated list — adding a
  // locale in the admin panel surfaces it here with no code change.
  //
  // Narrowed to the locales the storefront actually *routes*
  // (`NEXT_PUBLIC_LOCALES`): a language the CMS publishes but the app has no
  // URL for would render a switcher entry that leads nowhere, which is worse
  // than not offering it.
  const cmsLocales = useCmsLocales();
  const locales = cmsLocales.filter((l) => SHORT_LOCALES.includes(toShortCode(l.code)));
  const activeLanguage =
    locales.find((l) => toShortCode(l.code) === activeLocale)?.shortCode.toUpperCase() ??
    activeLocale.toUpperCase() ??
    FALLBACK_LANGUAGE_LABEL;

  useEffect(() => {
    if (!cityOpen && !langOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCityOpen(false);
        setLangOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [cityOpen, langOpen]);

  return (
    <div className="hidden bg-black text-white md:block" data-testid="header-top-bar">
      <div className="mx-auto flex h-10 max-w-384 items-center justify-between px-8 text-xs lg:px-12">
        <div className="flex items-center gap-6">
          <div className="relative">
            <button
              onClick={() => {
                setCityOpen(!cityOpen);
                setLangOpen(false);
              }}
              className="flex items-center gap-1 transition-opacity hover:opacity-80"
              data-testid="header-region-toggle"
            >
              <GlobeAltIcon className="size-5" />
              <span>{lRegion}</span>
              <ChevronDownIcon className="size-4" />
            </button>
            {cityOpen && (
              <div className="absolute top-full left-0 z-50 mt-1 min-w-35 border border-gray-200 bg-white text-black shadow-lg">
                {regions.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCityOpen(false)}
                    className="block w-full px-3 py-2 text-left text-xs transition-colors hover:bg-gray-100"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Rendered only when there is more than one routed locale. A single
              locale has nothing to switch to, and a control that is present but
              inert reads as broken — worse than absent. */}
          {locales.length > 1 && (
            <div className="relative">
              <button
                onClick={() => {
                  setLangOpen(!langOpen);
                  setCityOpen(false);
                }}
                className="flex items-center gap-1 transition-opacity hover:opacity-80"
                data-testid="header-language-toggle"
              >
                <span>{activeLanguage}</span>
                <ChevronDownIcon className="size-4" />
              </button>
              {langOpen && (
                <div className="absolute top-full left-0 z-50 mt-1 min-w-25 border border-gray-200 bg-white text-black shadow-lg">
                  {locales.map((l) => {
                    const short = toShortCode(l.code);
                    const isActive = short === activeLocale;
                    return (
                      <button
                        key={l.code}
                        onClick={() => {
                          setLangOpen(false);
                          if (isActive) return;
                          // Same page, other language: keep the shopper where
                          // they are instead of dumping them on the homepage.
                          // Built from the *bare* path and pushed on the raw
                          // router, because `localizeHref` has already applied
                          // the target prefix here.
                          rawRouter.push(localizeHref(barePath, short));
                        }}
                        title={l.nativeName || l.name}
                        aria-current={isActive ? 'true' : undefined}
                        data-testid="header-language-option"
                        className={`block w-full px-3 py-2 text-left text-xs transition-colors ${
                          isActive ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-100'
                        }`}
                      >
                        {l.shortCode.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <PhoneIcon className="size-4" />
            <span>{lPhone}</span>
          </div>
          <button
            className="flex items-center gap-1.5 transition-opacity hover:opacity-80 focus-visible:outline-none"
            onClick={() => router.push(STORE_LOCATIONS_HREF)}
            data-testid="header-store-locations"
          >
            <MapPinIcon className="size-4" />
            <span>{lStores}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
