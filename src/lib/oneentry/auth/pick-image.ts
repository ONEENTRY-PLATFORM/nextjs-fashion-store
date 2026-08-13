/** Raw picture shape used by OneEntry across a couple of endpoints. `previewLink` is loosely typed: template uploads ship an object there, which must never reach an `<img src>`. */
export type RawPicture = { downloadLink?: string; previewLink?: unknown };

/** Extract a single image URL from OneEntry's `previewImage` payload. */
export function pickImage(v: RawPicture | RawPicture[] | null | undefined): string {
  if (!v) return '';
  const pic = Array.isArray(v) ? v[0] : v;
  if (!pic) return '';
  if (pic.downloadLink) return pic.downloadLink;
  return typeof pic.previewLink === 'string' ? pic.previewLink : '';
}
