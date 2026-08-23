import type { IPicture } from 'oneentry/types';

/** `IPicture` as it really arrives: fields can be missing, and `previewLink` is not always a string — a template upload ships an object there, which must never reach an `<img src>`. */
export type RawPicture = Partial<Omit<IPicture, 'previewLink'>> & { previewLink?: unknown };

/** Extract a single image URL from OneEntry's `previewImage` payload. */
export function pickImage(v: RawPicture | RawPicture[] | null | undefined): string {
  if (!v) return '';
  const pic = Array.isArray(v) ? v[0] : v;
  if (!pic) return '';
  if (pic.downloadLink) return pic.downloadLink;
  return typeof pic.previewLink === 'string' ? pic.previewLink : '';
}
