import NextImage, { type ImageProps } from 'next/image';
import type { Ref } from 'react';

/** Props of {@link CmsImage}. */
export type CmsImageProps = Omit<ImageProps, 'placeholder' | 'blurDataURL'> & {
  /** Base64 data URI from the OE preview template, via `getImage().blur`. */
  blur?: string;
  /** Forwarded to the underlying `<img>`. */
  ref?: Ref<HTMLImageElement>;
};

/** `next/image` for CMS pictures, with the blur placeholder wired up safely. */
export default function CmsImage({ blur, ...rest }: CmsImageProps) {
  return (
    <NextImage
      {...rest}
      data-blur={blur ? 'on' : 'off'}
      {...(blur ? { placeholder: 'blur' as const, blurDataURL: blur } : {})}
    />
  );
}
