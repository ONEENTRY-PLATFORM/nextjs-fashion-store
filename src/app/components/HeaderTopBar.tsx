'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  GlobeAltIcon, ChevronDownIcon, PhoneIcon, MapPinIcon,
} from '@heroicons/react/24/outline';
import {
  HEADER_REGIONS, HEADER_LANGUAGES, SUPPORT_PHONE,
  DEFAULT_REGION_LABEL, DEFAULT_LANGUAGE_LABEL,
  STORE_LOCATIONS_LABEL, STORE_LOCATIONS_HREF,
} from '../data/headerConfig';

export function HeaderTopBar() {
  const router = useRouter();
  const [cityOpen, setCityOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    if (!cityOpen && !langOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setCityOpen(false); setLangOpen(false); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [cityOpen, langOpen]);

  return (
    <div className="bg-black text-white hidden md:block">
      <div className="max-w-screen-2xl mx-auto px-8 lg:px-12 h-10 flex items-center justify-between text-xs">
        <div className="flex items-center gap-6">
          <div className="relative">
            <button
              onClick={() => { setCityOpen(!cityOpen); setLangOpen(false); }}
              className="flex items-center gap-1 hover:opacity-80 transition-opacity"
            >
              <GlobeAltIcon className="w-5 h-5" />
              <span>{DEFAULT_REGION_LABEL}</span>
              <ChevronDownIcon className="w-4 h-4" />
            </button>
            {cityOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white text-black shadow-lg z-50 min-w-[140px] border border-gray-200">
                {HEADER_REGIONS.map((c) => (
                  <button key={c} onClick={() => setCityOpen(false)} className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors">
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => { setLangOpen(!langOpen); setCityOpen(false); }}
              className="flex items-center gap-1 hover:opacity-80 transition-opacity"
            >
              <span>{DEFAULT_LANGUAGE_LABEL}</span>
              <ChevronDownIcon className="w-4 h-4" />
            </button>
            {langOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white text-black shadow-lg z-50 min-w-[100px] border border-gray-200">
                {HEADER_LANGUAGES.map((l) => (
                  <button key={l} onClick={() => setLangOpen(false)} className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors">
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <PhoneIcon className="w-4 h-4" />
            <span>{SUPPORT_PHONE}</span>
          </div>
          <button
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity focus-visible:outline-none"
            onClick={() => router.push(STORE_LOCATIONS_HREF)}
          >
            <MapPinIcon className="w-4 h-4" />
            <span>{STORE_LOCATIONS_LABEL}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
