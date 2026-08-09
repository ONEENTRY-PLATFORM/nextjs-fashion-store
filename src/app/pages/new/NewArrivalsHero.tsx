'use client';
import CmsImage from '@/app/components/ui/CmsImage';
import { NEW_ARRIVALS_HERO_LABELS } from '@/app/data/newArrivalsLabels';
import type { NewArrivalsPageFromCms } from '@/lib/oneentry/catalog/new-arrivals-page';
import { useDict } from '@/lib/oneentry/labels/DictContext';

const FALLBACK_HERO_IMAGE =
  'https://images.unsplash.com/photo-1699579091591-f64e682f8ed5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuZXclMjBhcnJpdmFscyUyMGZhc2hpb24lMjBlZGl0b3JpYWwlMjBsdXh1cnklMjBjbG90aGluZ3xlbnwxfHx8fDE3NzI0NTIzODV8MA&ixlib=rb-4.1.0&q=80&w=1080';

interface NewArrivalsHeroProps {
  /**
   * OE `new` page attributes. When present, drives image, eyebrow, heading
   *  and subheading. Missing fields fall back to static `L.*` labels.
   */
  cms?: NewArrivalsPageFromCms | null;
}

export function NewArrivalsHero({ cms }: NewArrivalsHeroProps = {}) {
  const L = useDict('new_arrivals_page_hero_', NEW_ARRIVALS_HERO_LABELS);
  const heroImage = cms?.hero.image || FALLBACK_HERO_IMAGE;
  // Only the CMS picture has an LQIP; the bundled fallback has none.
  const heroBlur = cms?.hero.image ? cms.hero.imageBlur : undefined;
  const eyebrow = cms?.hero.eyebrow || L.eyebrow;
  const heading = cms?.hero.heading || L.heading;
  const subheading = cms?.hero.subheading || L.subheading;
  return (
    <div className="relative min-h-120 overflow-hidden border-b border-gray-100">
      <CmsImage
        src={heroImage}
        blur={heroBlur}
        alt={L.imageAlt}
        fill
        sizes="100vw"
        priority
        className="object-cover object-center brightness-[0.48]"
      />

      <div className="relative z-10 flex flex-col items-center justify-center px-4 py-24 text-center md:py-32 lg:px-8">
        <p className="mb-3 text-xs tracking-[0.35em] text-white/70 uppercase">{eyebrow}</p>
        <h1 className="hero-h1 tracking-[0.18em] text-white uppercase">{heading}</h1>
        <div className="mx-auto mt-5 mb-0 h-px w-10 bg-white/40" />
        <p className="mt-5 text-xs tracking-[0.25em] text-white/60 uppercase">{subheading}</p>
      </div>
    </div>
  );
}
