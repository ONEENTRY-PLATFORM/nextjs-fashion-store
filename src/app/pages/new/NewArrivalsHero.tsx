'use client'
import Image from 'next/image';
import { NEW_ARRIVALS_HERO_LABELS as L } from '../../data/newArrivalsLabels';
import type { NewArrivalsPageFromCms } from '../../../lib/oneentry/catalog/new-arrivals-page';

const FALLBACK_HERO_IMAGE = 'https://images.unsplash.com/photo-1699579091591-f64e682f8ed5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuZXclMjBhcnJpdmFscyUyMGZhc2hpb24lMjBlZGl0b3JpYWwlMjBsdXh1cnklMjBjbG90aGluZ3xlbnwxfHx8fDE3NzI0NTIzODV8MA&ixlib=rb-4.1.0&q=80&w=1080';

interface NewArrivalsHeroProps {
  /** OE `new` page attributes. When present, drives image, eyebrow, heading
   *  and subheading. Missing fields fall back to static `L.*` labels. */
  cms?: NewArrivalsPageFromCms | null;
}

export function NewArrivalsHero({ cms }: NewArrivalsHeroProps = {}) {
  const heroImage  = cms?.hero.image      || FALLBACK_HERO_IMAGE;
  const eyebrow    = cms?.hero.eyebrow    || L.eyebrow;
  const heading    = cms?.hero.heading    || L.heading;
  const subheading = cms?.hero.subheading || L.subheading;
  return (
    <div className="relative overflow-hidden border-b border-gray-100 min-h-[480px]">
      <Image
        src={heroImage}
        alt={L.imageAlt}
        fill
        sizes="100vw"
        priority
        className="object-cover object-center brightness-[0.48]"
      />

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 lg:px-8 py-24 md:py-32">
        <p className="text-xs tracking-[0.35em] uppercase text-white/70 mb-3">
          {eyebrow}
        </p>
        <h1 className="hero-h1 tracking-[0.18em] uppercase text-white">
          {heading}
        </h1>
        <div className="mx-auto mt-5 mb-0 h-px bg-white/40 w-10" />
        <p className="mt-5 text-xs tracking-[0.25em] uppercase text-white/60">
          {subheading}
        </p>
      </div>
    </div>
  );
}
