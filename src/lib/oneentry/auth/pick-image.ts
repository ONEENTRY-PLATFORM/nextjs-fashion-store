/**
 * Raw picture shape used by OneEntry across a couple of endpoints. Both fields
 * are optional because the SDK types are stricter than what actually ships on
 * the wire — some responses only carry `previewLink`, some only `downloadLink`.
 */
export type RawPicture = { downloadLink?: string; previewLink?: string };

/**
 * Extract a single image URL from OneEntry's `previewImage` payload.
 *
 * OE ships the field as an **array** of picture objects on the wire, even
 * though the SDK types it as a single `IPicture | null`. Older tenants may
 * still return the bare object; the tolerant extractor handles both.
 * Priority: `downloadLink` wins over `previewLink`.
 *
 * Lives in its own file so it can be imported from unit tests — sibling
 * `actions.ts` is marked `'use server'` and therefore may only export async
 * functions (Next.js server-actions rule).
 */
export function pickImage(v: RawPicture | RawPicture[] | null | undefined): string {
  if (!v) return '';
  const pic = Array.isArray(v) ? v[0] : v;
  if (!pic) return '';
  return pic.downloadLink || pic.previewLink || '';
}
