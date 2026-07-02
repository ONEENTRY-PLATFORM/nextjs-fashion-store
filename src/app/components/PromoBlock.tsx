'use client'
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { PromoItem } from '../data/promoBlocks';
import type { HomepageCollectionItem } from '../../lib/oneentry/blocks/homepage-collections';

function PromoCard({ item, priority = false }: { item: PromoItem; priority?: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={item.href}
      className="relative overflow-hidden block aspect-[4/5]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Image
        src={item.image}
        alt={item.title}
        fill
        sizes="(max-width: 640px) 100vw, 50vw"
        priority={priority}
        className={`object-cover transition-transform duration-700 ease-out ${
          hovered ? 'scale-[1.07]' : 'scale-100'
        }`}
      />
      {/* Gradient Overlay */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 bg-[linear-gradient(to_top,rgba(0,0,0,0.7)_0%,rgba(0,0,0,0.1)_60%,transparent_100%)] ${
          hovered ? 'opacity-90' : 'opacity-70'
        }`}
      />
      {/* Content */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-end pb-8 px-4 transition-transform duration-300 ${
          hovered ? '-translate-y-2' : 'translate-y-0'
        }`}
      >
        <h3 className="text-white text-center mb-2 text-[clamp(1.75rem,3.5vw,2.75rem)] font-semibold font-[Inter,sans-serif] leading-[1.15]">
          {item.title}
        </h3>
        <p className="text-white/80 tracking-widest uppercase mb-4 text-[0.8125rem]">{item.subtitle}</p>
        <span
          className={`px-6 py-2 text-xs tracking-widest uppercase font-medium transition-all duration-200 rounded-lg border border-white/80 backdrop-blur-[4px] ${
            hovered ? 'bg-white text-black' : 'bg-white/15 text-white'
          }`}
        >
          {item.cta}
        </span>
      </div>
    </Link>
  );
}

export function PromoBlock({ initialItems }: { initialItems?: HomepageCollectionItem[] } = {}) {
  const items: PromoItem[] = (initialItems ?? []).map((it) => ({
    id: String(it.id),
    title: it.title,
    subtitle: it.subtitle,
    image: it.image,
    cta: it.buttonText,
    href: it.link,
  }));
  if (items.length === 0) return null;
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <section className="w-full" aria-hidden="true">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="bg-gray-100 animate-pulse aspect-[4/5] [animation-delay:var(--delay)]"
              style={{ '--delay': `${i * 100}ms` } as React.CSSProperties}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="w-full font-[Inter,sans-serif]">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
        {items.map((item, i) => (
          <PromoCard key={item.id} item={item} priority={i === 0} />
        ))}
      </div>
    </section>
  );
}
