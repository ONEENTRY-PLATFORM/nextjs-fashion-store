'use client'
import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';

/** Bag SVG — matches the placeholder used in ProductCard */
function BagPlaceholder({ grayscale }: { grayscale?: boolean }) {
  return (
    <div
      className={`w-full h-full flex items-center justify-center bg-[#f2f1ef] ${grayscale ? 'grayscale opacity-60' : ''}`}
    >
      <Image src="/icons/ui/bag-placeholder.svg" alt="" width={48} height={48} unoptimized />
    </div>
  );
}

interface ImageWithFallbackProps extends Omit<ImageProps, 'onError'> {
  grayscale?: boolean;
}

/**
 * Drop-in replacement for next/image that shows the standard bag placeholder
 * on load error — same as ProductCard in the catalog.
 */
export function ImageWithFallback({ grayscale, ...props }: ImageWithFallbackProps) {
  const [error, setError] = useState(false);

  // next/image throws on empty/missing src — short-circuit to the placeholder
  // when the source isn't ready (eg. cart/wishlist items that haven't been
  // enriched yet).
  const src = props.src;
  const hasSrc = typeof src === 'string' ? src.length > 0 : Boolean(src);
  if (!hasSrc || error) return <BagPlaceholder grayscale={grayscale} />;

  return (
    <Image
      {...props}
      onError={() => setError(true)}
    />
  );
}
