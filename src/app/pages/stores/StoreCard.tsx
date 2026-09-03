'use client';
import { AtSign, ChevronRight, Clock, Mail, MapPin, Navigation, Phone } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import CmsImage from '@/app/components/ui/CmsImage';
import type { Store } from '@/app/data/stores';
import { useDict } from '@/lib/oneentry/labels/DictContext';

export const STORE_CARD_LABELS = {
  flagshipBadge: 'FLAGSHIP',
  monSatSuffix: '(Mon–Sat)',
  directions: 'Directions',
  moreInfo: 'More Info',
  // Modal
  modalCloseLabel: 'Close',
  sectionLocation: 'Location',
  sectionHours: 'Opening Hours',
  sectionServices: 'In-Store Services',
  ctaGetDirections: 'Get Directions',
  ctaClose: 'Close',
} as const;

const L_FALLBACK = STORE_CARD_LABELS;

export function StoreCard({ store }: { store: Store }) {
  const L = useDict('store_location_card_', L_FALLBACK);
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = () => {
    setModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    document.body.style.overflow = '';
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, closeModal]);

  return (
    <div className="flex flex-col bg-white font-sans outline-1 outline-black">
      {/* Image */}
      <div className="relative aspect-video overflow-hidden bg-gray-100">
        {store.image && (
          <CmsImage
            src={store.image}
            blur={store.imageBlur}
            alt={store.name}
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 hover:scale-105"
          />
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          {store.tag && (
            <span
              className={`px-2 py-1 text-xs tracking-widest text-white uppercase ${
                store.tag === 'NEW' ? 'bg-(--accent-men)' : 'bg-black'
              }`}
            >
              {store.tag}
            </span>
          )}
          {store.isflagship && !store.tag && (
            <span className="bg-black px-2 py-1 text-xs tracking-widest text-white uppercase">{L.flagshipBadge}</span>
          )}
        </div>
      </div>

      {/* Info panel — fixed height, never expands */}
      <div className="flex h-50 flex-col px-5 pt-5 pb-10">
        <p className="mb-1 text-xs tracking-widest text-accent uppercase">{store.city}</p>
        <h3 className="mb-4 truncate text-base font-bold tracking-wider uppercase">{store.name}</h3>

        <div className="mb-4 flex flex-col gap-2">
          <div className="flex items-start gap-2.5">
            <MapPin size={13} className="mt-0.5 shrink-0 text-gray-400" />
            <span className="truncate text-sm text-gray-600">
              {store.address}, {store.postcode}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Phone size={13} className="shrink-0 text-gray-400" />
            <a href={`tel:${store.phone}`} className="text-sm text-gray-600 transition-colors hover:text-black">
              {store.phone}
            </a>
          </div>
          {store.hours[0] && (
            <div className="flex items-center gap-2.5">
              <Clock size={13} className="shrink-0 text-gray-400" />
              <span className="text-sm text-gray-600">
                {store.hours[0].time} {L.monSatSuffix}
              </span>
            </div>
          )}
        </div>

        <div className="mt-auto mb-4 flex gap-2">
          <a
            href={store.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 bg-black px-3 py-2 text-xs font-bold tracking-widest text-white uppercase transition-opacity hover:opacity-80 focus-visible:outline-none"
          >
            <Navigation size={12} />
            {L.directions}
          </a>
          <button
            onClick={openModal}
            className="flex flex-1 items-center justify-center gap-1.5 border border-black px-3 py-2 text-xs font-semibold tracking-widest uppercase transition-colors hover:bg-gray-50 focus-visible:outline-none"
          >
            {L.moreInfo}
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-500 flex items-center justify-center p-4 font-sans">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[6px]" onClick={closeModal} />

          <div className="relative z-1 flex max-h-[90vh] w-full max-w-195 flex-col overflow-hidden bg-white outline-1 outline-black md:flex-row">
            {/* Left — store photo */}
            <div className="relative min-h-55 shrink-0 md:w-2/5">
              <CmsImage
                src={store.image}
                blur={store.imageBlur}
                alt={store.name}
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover"
              />
              {store.tag && (
                <span
                  className={`absolute top-4 left-4 px-2 py-1 text-xs tracking-widest text-white uppercase ${
                    store.tag === 'NEW' ? 'bg-(--accent-men)' : 'bg-black'
                  }`}
                >
                  {store.tag}
                </span>
              )}
            </div>

            {/* Right — scrollable info */}
            <div className="flex max-h-[90vh] flex-col overflow-y-auto md:w-3/5">
              <div className="flex shrink-0 items-start justify-between border-b border-[#e6e6e6] px-7 pt-7 pb-5">
                <div>
                  <p className="mb-1 text-xs font-semibold tracking-[0.25em] text-accent uppercase">{store.city}</p>
                  <h2 className="text-xl font-bold tracking-wider uppercase">{store.name}</h2>
                </div>
                <button
                  onClick={closeModal}
                  className="ml-4 flex size-8 shrink-0 items-center justify-center transition-colors hover:bg-gray-100 focus-visible:outline-none"
                  aria-label={L.modalCloseLabel}
                >
                  <span className="text-lg leading-none font-light">✕</span>
                </button>
              </div>

              <div className="flex flex-col gap-7 px-7 py-6">
                <div>
                  <p className="mb-3 text-xs font-bold tracking-widest uppercase">{L.sectionLocation}</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-3">
                      <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" />
                      <span className="text-sm text-gray-700">
                        {store.address}, {store.postcode}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone size={14} className="shrink-0 text-gray-400" />
                      <a
                        href={`tel:${store.phone}`}
                        className="text-sm text-gray-700 transition-colors hover:text-black"
                      >
                        {store.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail size={14} className="shrink-0 text-gray-400" />
                      <a
                        href={`mailto:${store.email}`}
                        className="text-sm text-gray-700 transition-colors hover:text-black"
                      >
                        {store.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                      <AtSign size={14} className="shrink-0 text-gray-400" />
                      <span className="text-sm text-gray-700">{store.instagram}</span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-[#e6e6e6]" />

                <div>
                  <p className="mb-3 text-xs font-bold tracking-widest uppercase">{L.sectionHours}</p>
                  <div className="flex flex-col gap-2">
                    {store.hours.map((h) => (
                      <div key={h.day} className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{h.day}</span>
                        <span className="font-semibold">{h.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-[#e6e6e6]" />

                <div>
                  <p className="mb-3 text-xs font-bold tracking-widest uppercase">{L.sectionServices}</p>
                  <div className="flex flex-wrap gap-2">
                    {store.services.map((s) => (
                      <span key={s} className="bg-[#F4F4F4] px-3 py-1.5 text-xs tracking-wide text-[#333]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-1 pb-2">
                  <a
                    href={store.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 bg-black px-5 py-3 text-xs font-bold tracking-widest text-white uppercase transition-opacity hover:opacity-80 focus-visible:outline-none"
                  >
                    <Navigation size={13} />
                    {L.ctaGetDirections}
                  </a>
                  <button
                    onClick={closeModal}
                    className="flex flex-1 items-center justify-center gap-2 border border-black px-5 py-3 text-xs font-semibold tracking-widest uppercase transition-colors hover:bg-gray-50 focus-visible:outline-none"
                  >
                    {L.ctaClose}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
