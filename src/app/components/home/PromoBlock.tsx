'use client';
import Image from 'next/image';
import { useState } from 'react';

import type { PromoItem } from '@/app/data/promoBlocks';
import { useMounted } from '@/app/hooks/useMounted';
import { Link } from '@/lib/i18n/navigation';
import type { HomepageCollectionItem } from '@/lib/oneentry/blocks/homepage-collections';

function PromoCard({ item, priority = false }: { item: PromoItem; priority?: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={item.href}
      className="relative block aspect-4/5 overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Image
        src={item.image}
        alt={item.title}
        fill
        sizes="(max-width: 640px) 100vw, 50vw"
        priority={priority}
        className={`object-cover transition-transform duration-700 ease-out ${hovered ? 'scale-1.07' : 'scale-100'}`}
      />
      {/* Gradient Overlay */}
      <div
        className={`absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.7)_0%,rgba(0,0,0,0.1)_60%,transparent_100%)] transition-opacity duration-300 ${
          hovered ? 'opacity-90' : 'opacity-70'
        }`}
      />
      {/* Content */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-end px-4 pb-8 transition-transform duration-300 ${
          hovered ? '-translate-y-2' : 'translate-y-0'
        }`}
      >
        <h3 className="leading-1.15 mb-2 text-center font-sans text-[clamp(1.75rem,3.5vw,2.75rem)] font-semibold text-white">
          {item.title}
        </h3>
        <p className="mb-4 text-[0.8125rem] tracking-widest text-white/80 uppercase">{item.subtitle}</p>
        <span
          className={`rounded-lg border border-white/80 px-6 py-2 text-xs font-medium tracking-widest uppercase backdrop-blur-xs transition-all duration-200 ${
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
  const mounted = useMounted();

  // Hooks first, early returns after — see `rules-of-hooks`.
  if (items.length === 0) return null;

  if (!mounted) {
    return (
      <section className="w-full" aria-hidden="true">
        <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="aspect-4/5 animate-pulse bg-gray-100 [animation-delay:var(--delay)]"
              style={{ '--delay': `${i * 100}ms` } as React.CSSProperties}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="w-full font-sans">
      <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
        {items.map((item, i) => (
          <PromoCard key={item.id} item={item} priority={i === 0} />
        ))}
      </div>
    </section>
  );
}
