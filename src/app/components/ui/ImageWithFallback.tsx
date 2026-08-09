'use client';
import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';

import CmsImage from './CmsImage';

/**
 * Bag SVG — matches the placeholder used in ProductCard
 */
function BagPlaceholder({ grayscale }: { grayscale?: boolean }) {
  return (
    <div
      className={`flex size-full items-center justify-center bg-[#f2f1ef] ${grayscale ? 'opacity-60 grayscale' : ''}`}
    >
      <Image src="/icons/ui/bag-placeholder.svg" alt="" width={48} height={48} unoptimized />
    </div>
  );
}

interface ImageWithFallbackProps extends Omit<ImageProps, 'onError' | 'placeholder' | 'blurDataURL'> {
  grayscale?: boolean;
  /** Base64 LQIP from the CMS, when the caller has one. */
  blur?: string;
}

/**
 * Drop-in replacement for next/image that shows the standard bag placeholder
 * on load error — same as ProductCard in the catalog.
 *
 * Delegates to {@link CmsImage} so the "blur only when there is a data URI"
 * guard lives in exactly one place; passing `placeholder="blur"` without a
 * `blurDataURL` makes Next throw on remote sources.
 */
export function ImageWithFallback({ grayscale, alt, blur, ...props }: ImageWithFallbackProps) {
  const [error, setError] = useState(false);

  // next/image throws on empty/missing src — short-circuit to the placeholder
  // when the source isn't ready (eg. cart/wishlist items that haven't been
  // enriched yet).
  const src = props.src;
  const hasSrc = typeof src === 'string' ? src.length > 0 : Boolean(src);
  if (!hasSrc || error) return <BagPlaceholder grayscale={grayscale} />;

  return <CmsImage {...props} alt={alt} blur={blur} onError={() => setError(true)} />;
}
