'use client'
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  MapPin, Phone, Clock, ChevronRight,
  Navigation, Mail, AtSign,
} from 'lucide-react';
import type { Store } from '../../data/stores';
import { STORE_CARD_LABELS as L } from '../../data/storesLabels';

export function StoreCard({ store }: { store: Store }) {
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
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, closeModal]);

  return (
    <div className="flex flex-col bg-white font-[Inter,sans-serif] outline outline-1 outline-black">
      {/* Image */}
      <div className="relative overflow-hidden aspect-[16/9] bg-gray-100">
        {store.image && (
          <Image
            src={store.image}
            alt={store.name}
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 hover:scale-105"
          />
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          {store.tag && (
            <span
              className={`px-2 py-1 text-white text-xs tracking-widest uppercase ${
                store.tag === 'NEW' ? 'bg-[var(--accent-men)]' : 'bg-black'
              }`}
            >
              {store.tag}
            </span>
          )}
          {store.isflagship && !store.tag && (
            <span className="px-2 py-1 text-white text-xs tracking-widest uppercase bg-black">
              {L.flagshipBadge}
            </span>
          )}
        </div>
      </div>

      {/* Info panel — fixed height, never expands */}
      <div className="px-5 pt-5 pb-10 flex flex-col h-[200px]">
        <p className="text-xs tracking-widest uppercase mb-1 text-[var(--accent)]">
          {store.city}
        </p>
        <h3 className="text-base uppercase tracking-wider mb-4 font-bold truncate">
          {store.name}
        </h3>

        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-start gap-2.5">
            <MapPin size={13} className="mt-0.5 flex-shrink-0 text-gray-400" />
            <span className="text-sm text-gray-600 truncate">
              {store.address}, {store.postcode}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Phone size={13} className="flex-shrink-0 text-gray-400" />
            <a href={`tel:${store.phone}`} className="text-sm text-gray-600 hover:text-black transition-colors">
              {store.phone}
            </a>
          </div>
          {store.hours[0] && (
            <div className="flex items-center gap-2.5">
              <Clock size={13} className="flex-shrink-0 text-gray-400" />
              <span className="text-sm text-gray-600">{store.hours[0].time} {L.monSatSuffix}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-auto mb-4">
          <a
            href={store.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs tracking-widest uppercase text-white focus-visible:outline-none transition-opacity hover:opacity-80 flex-1 justify-center bg-black font-bold"
          >
            <Navigation size={12} />
            {L.directions}
          </a>
          <button
            onClick={openModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs tracking-widest uppercase focus-visible:outline-none transition-colors hover:bg-gray-50 flex-1 justify-center border border-black font-semibold"
          >
            {L.moreInfo}
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 font-[Inter,sans-serif]">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[6px]" onClick={closeModal} />

          <div className="relative bg-white w-full flex flex-col md:flex-row overflow-hidden max-w-[780px] max-h-[90vh] outline outline-1 outline-black z-[1]">
            {/* Left — store photo */}
            <div className="md:w-2/5 flex-shrink-0 relative min-h-[220px]">
              <Image
                src={store.image}
                alt={store.name}
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover"
              />
              {store.tag && (
                <span
                  className={`absolute top-4 left-4 px-2 py-1 text-white text-xs tracking-widest uppercase ${
                    store.tag === 'NEW' ? 'bg-[var(--accent-men)]' : 'bg-black'
                  }`}
                >
                  {store.tag}
                </span>
              )}
            </div>

            {/* Right — scrollable info */}
            <div className="md:w-3/5 flex flex-col overflow-y-auto max-h-[90vh]">
              <div className="flex items-start justify-between px-7 pt-7 pb-5 flex-shrink-0 border-b border-[#e6e6e6]">
                <div>
                  <p className="text-xs tracking-[0.25em] uppercase mb-1 text-[var(--accent)] font-semibold">
                    {store.city}
                  </p>
                  <h2 className="text-xl uppercase tracking-wider font-bold">
                    {store.name}
                  </h2>
                </div>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors focus-visible:outline-none flex-shrink-0 ml-4"
                  aria-label={L.modalCloseLabel}
                >
                  <span className="text-lg leading-none font-light">✕</span>
                </button>
              </div>

              <div className="px-7 py-6 flex flex-col gap-7">
                <div>
                  <p className="text-xs tracking-widest uppercase mb-3 font-bold">{L.sectionLocation}</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-3">
                      <MapPin size={14} className="mt-0.5 flex-shrink-0 text-gray-400" />
                      <span className="text-sm text-gray-700">{store.address}, {store.postcode}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone size={14} className="flex-shrink-0 text-gray-400" />
                      <a href={`tel:${store.phone}`} className="text-sm text-gray-700 hover:text-black transition-colors">
                        {store.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail size={14} className="flex-shrink-0 text-gray-400" />
                      <a href={`mailto:${store.email}`} className="text-sm text-gray-700 hover:text-black transition-colors">
                        {store.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                      <AtSign size={14} className="flex-shrink-0 text-gray-400" />
                      <span className="text-sm text-gray-700">{store.instagram}</span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-[#e6e6e6]" />

                <div>
                  <p className="text-xs tracking-widest uppercase mb-3 font-bold">{L.sectionHours}</p>
                  <div className="flex flex-col gap-2">
                    {store.hours.map(h => (
                      <div key={h.day} className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{h.day}</span>
                        <span className="font-semibold">{h.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-[#e6e6e6]" />

                <div>
                  <p className="text-xs tracking-widest uppercase mb-3 font-bold">{L.sectionServices}</p>
                  <div className="flex flex-wrap gap-2">
                    {store.services.map(s => (
                      <span
                        key={s}
                        className="px-3 py-1.5 text-xs tracking-wide bg-[#F4F4F4] text-[#333]"
                      >
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
                    className="flex items-center gap-2 px-5 py-3 text-xs tracking-widest uppercase text-white focus-visible:outline-none hover:opacity-80 transition-opacity flex-1 justify-center bg-black font-bold"
                  >
                    <Navigation size={13} />
                    {L.ctaGetDirections}
                  </a>
                  <button
                    onClick={closeModal}
                    className="flex items-center gap-2 px-5 py-3 text-xs tracking-widest uppercase focus-visible:outline-none hover:bg-gray-50 transition-colors flex-1 justify-center border border-black font-semibold"
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
