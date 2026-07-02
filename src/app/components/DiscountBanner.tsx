'use client'
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';
import type { DiscountBannerFromCms } from '../../lib/oneentry/blocks/discount-banner';

export function DiscountBanner({ initialBanner }: { initialBanner?: DiscountBannerFromCms | null } = {}) {
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!initialBanner) return null;
  const banner = initialBanner;

  if (!mounted) {
    return (
      <section className="relative w-full bg-gray-100 animate-pulse h-[480px]" aria-hidden="true" />
    );
  }

  return (
    <section
      className="relative w-full overflow-hidden h-[480px]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Background Image */}
      <Image
        src={banner.image}
        alt={banner.alt}
        fill
        sizes="100vw"
        priority
        className={`object-cover object-[center_30%] transition-transform duration-700 ${hovered ? 'scale-[1.03]' : 'scale-100'}`}
      />
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/55 transition-opacity duration-300" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4 text-center">
        {/* Badge */}
        <span className="px-5 py-2 text-white text-xs tracking-widest uppercase font-medium bg-primary-men">
          {banner.badge}
        </span>

        {/* Main Text */}
        <h2 className="text-white text-[clamp(3.5rem,9vw,7.5rem)] font-semibold tracking-[-0.03em] leading-[0.95]">
          {banner.discountText}
        </h2>
        <p className="text-white tracking-[0.2em] uppercase font-semibold text-[clamp(1.25rem,3vw,2rem)]">
          {banner.category}
        </p>
        <p className="text-white/70 max-w-sm text-base leading-relaxed">
          {banner.description}
        </p>

        {/* CTA Button */}
        <Link
          href={banner.href}
          className={`mt-2 flex items-center gap-2 px-10 py-4 text-sm tracking-widest uppercase font-medium border-2 border-white transition-all duration-200 no-underline ${
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