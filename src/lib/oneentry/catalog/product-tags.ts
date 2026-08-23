/**
 * Cache tags for product data.
 *
 * Kept in its own module so the post-order Server Action (`auth/revalidate-action.ts`) can name a
 * tag without importing the whole catalog layer — the same split `forms/load-form.ts` needed.
 */

/**
 * Tag for one product. Every PDP-facing loader carries this alongside {@link PRODUCTS_TAG}, so an
 * order can drop the two or three products it actually moved instead of the entire catalog: a
 * blanket flush invalidates every PDP, and the next crawler pass then rewrites all of them on
 * Vercel's ISR store.
 */
export const productTag = (id: number): string => `oe-product-${id}`;

/** Blanket tag, kept for a deliberate full-catalog flush (a price import, a CMS webhook). Order placement no longer uses it. */
export const PRODUCTS_TAG = 'oe-products';
