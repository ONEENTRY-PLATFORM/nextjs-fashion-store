'use client';
import { ShoppingBag } from 'lucide-react';
import { useState } from 'react';

import CmsImage from '@/app/components/ui/CmsImage';
import { useMounted } from '@/app/hooks/useMounted';
import { Link } from '@/lib/i18n/navigation';
import type { DiscountBannerFromCms } from '@/lib/oneentry/blocks/discount-banner';

/*
  `priority` is decided by the caller, not by this component. Blocks are ordered
  in the admin panel, so no block can know on its own whether it is the LCP
  candidate; claiming `priority` unconditionally preloaded a below-the-fold
  banner in competition with the real hero image.
*/
export function DiscountBanner({
  initialBanner,
  priority = false,
}: { initialBanner?: DiscountBannerFromCms | null; priority?: boolean } = {}) {
  const [hovered, setHovered] = useState(false);
  const mounted = useMounted();

  if (!initialBanner) return null;
  const banner = initialBanner;

  if (!mounted) {
    return <section className="relative h-120 w-full animate-pulse bg-gray-100" aria-hidden="true" />;
  }

  return (
    <section
      className="relative h-120 w-full overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Background Image */}
      <CmsImage
        src={banner.image}
        blur={banner.imageBlur}
        alt={banner.alt}
        fill
        sizes="100vw"
        priority={priority}
        className={`object-cover object-[center_30%] transition-transform duration-700 ${hovered ? 'scale-1.03' : 'scale-100'}`}
      />
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/55 transition-opacity duration-300" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4 text-center">
        {/* Badge */}
        <span className="bg-primary-men px-5 py-2 text-xs font-medium tracking-widest text-white uppercase">
          {banner.badge}
        </span>

        {/* Main Text */}
        <h2 className="leading-0.95 text-[clamp(3.5rem,9vw,7.5rem)] font-semibold tracking-[-0.03em] text-white">
          {banner.discountText}
        </h2>
        <p className="text-[clamp(1.25rem,3vw,2rem)] font-semibold tracking-[0.2em] text-white uppercase">
          {banner.category}
        </p>
        <p className="max-w-sm text-base leading-relaxed text-white/70">{banner.description}</p>

        {/* CTA Button */}
        <Link
          href={banner.href}
          className={`mt-2 flex items-center gap-2 border-2 border-white px-10 py-4 text-sm font-medium tracking-widest uppercase no-underline transition-all duration-200 ${
            hovered ? 'bg-white text-black' : 'bg-transparent text-white hover:bg-white/10'
          }`}
        >
          <ShoppingBag size={16} />
          {banner.cta}
        </Link>
      </div>
    </section>
  );
}
