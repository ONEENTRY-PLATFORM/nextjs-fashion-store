/**
 * Raw picture shape used by OneEntry across a couple of endpoints. Both fields
 * are optional because the SDK types are stricter than what actually ships on
 * the wire — some responses only carry `previewLink`, some only `downloadLink`.
 *
 * `previewLink` is typed loosely on purpose: files uploaded through a preview
 * template ship it as `{ [level]: [blurDataUri, previewUrl] }` rather than a
 * string. Assigning that object to an `<img src>` yields `"[object Object]"`
 * and a 404, so it must never be returned as a URL.
 */
export type RawPicture = { downloadLink?: string; previewLink?: unknown };

/**
 * Extract a single image URL from OneEntry's `previewImage` payload.
 *
 * OE ships the field as an **array** of picture objects on the wire, even
 * though the SDK types it as a single `IPicture | null`. Older tenants may
 * still return the bare object; the tolerant extractor handles both.
 * Priority: `downloadLink` wins over `previewLink`, and `previewLink` only
 * counts when it is still the legacy string form.
 *
 * Lives in its own file so it can be imported from unit tests — sibling
 * `actions.ts` is marked `'use server'` and therefore may only export async
 * functions (Next.js server-actions rule).
 *
 * @param v - Raw OE picture payload.
 * @returns An absolute URL, or `''` when there is no usable image.
 */
export function pickImage(v: RawPicture | RawPicture[] | null | undefined): string {
  if (!v) return '';
  const pic = Array.isArray(v) ? v[0] : v;
  if (!pic) return '';
  if (pic.downloadLink) return pic.downloadLink;
  return typeof pic.previewLink === 'string' ? pic.previewLink : '';
}
