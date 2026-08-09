import NextImage, { type ImageProps } from 'next/image';
import type { Ref } from 'react';

/**
 * Props of {@link CmsImage} — everything `next/image` takes, except that the
 * blur placeholder is expressed as a single optional `blur` string instead of
 * the `placeholder` / `blurDataURL` pair.
 */
export type CmsImageProps = Omit<ImageProps, 'placeholder' | 'blurDataURL'> & {
  /** Base64 data URI from the OE preview template, via `getImage().blur`. */
  blur?: string;
  /**
   * Forwarded to the underlying `<img>`; callers use it to read `complete`
   *  for images the browser served straight from cache.
   */
  ref?: Ref<HTMLImageElement>;
};

/**
 * `next/image` for CMS pictures, with the blur placeholder wired up safely.
 *
 * Why a wrapper rather than passing the two props at each call site: Next
 * **throws** when `placeholder="blur"` is set on a remote image without a
 * `blurDataURL`, and OneEntry only ships one for files uploaded through a
 * preview template. Older uploads, mock fixtures and local SVGs have none, so
 * every call site would need the same conditional-spread guard. Centralising it
 * means a missing blur silently degrades to `placeholder="empty"` instead of
 * crashing the route.
 *
 * `data-blur` is emitted so E2E can assert the placeholder is actually live
 * without reaching into Next's internals.
 *
 * @param props - `next/image` props plus the optional `blur`.
 * @param [props.blur] - Base64 data URI for the placeholder.
 * @returns The image element.
 */
export default function CmsImage({ blur, ...rest }: CmsImageProps) {
  return (
    <NextImage
      {...rest}
      data-blur={blur ? 'on' : 'off'}
      {...(blur ? { placeholder: 'blur' as const, blurDataURL: blur } : {})}
    />
  );
}
