import { cache } from 'react';
import { loadProductById } from './products';
import type { ProductReview } from '../../../app/data/productCatalog';

interface RawFormDataItem {
  id: number;
  time?: string;
  userIdentifier?: string;
  formData?: { en_US?: Array<{ marker: string; type: string; value: unknown }> };
}

interface RawFormDataResp {
  items?: RawFormDataItem[];
  total?: number;
}

const FEEDBACK_MARKER = 'review_feedback';
const FEEDBACK_MODULE_CONFIG = 13;
const RATING_MARKER = 'review_rating';
const RATING_MODULE_CONFIG = 12;

async function fetchFormData(
  marker: string,
  configId: number,
  productId: number,
  limit: number,
): Promise<RawFormDataItem[]> {
  const url = process.env.ONEENTRY_URL;
  const appToken = process.env.ONEENTRY_TOKEN;
  if (!url || !appToken) return [];
  try {
    const res = await fetch(
      `${url}/api/content/form-data/marker/${marker}?formModuleConfigId=${configId}&isExtended=1&langCode=en_US&offset=0&limit=${limit}`,
      {
        method: 'POST',
        headers: {
          'x-app-token': appToken,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({ entityIdentifier: productId }),
        cache: 'no-store',
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as RawFormDataResp;
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

function value(it: RawFormDataItem, marker: string): unknown {
  return it.formData?.en_US?.find((f) => f.marker === marker)?.value;
}

/** Extract plain text from OE `text` type field which stores values as
 *  `[{ plainValue }]` or `[{ htmlValue }]` or `[{ mdValue }]`. */
function textValue(raw: unknown): string {
  if (!Array.isArray(raw) || raw.length === 0) return '';
  const cell = raw[0] as { plainValue?: unknown; htmlValue?: unknown; mdValue?: unknown };
  if (typeof cell.plainValue === 'string') return cell.plainValue;
  if (typeof cell.htmlValue === 'string') {
    return cell.htmlValue.replace(/<[^>]+>/g, '').trim();
  }
  if (typeof cell.mdValue === 'string') return cell.mdValue;
  return '';
}

/** Deterministic size picker: same review id → same size on every render.
 *  Cycles through the product's available sizes so different reviewers see
 *  different sizes, instead of all showing the same first entry. */
function pickSize(reviewId: number, sizes: string[]): string {
  if (sizes.length === 0) return '';
  return sizes[reviewId % sizes.length];
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * Fetch reviews for a product from OE form-data and adapt to the storefront
 * `ProductReview` shape. Joins the `review_feedback` (headline+name+email+
 * occasions) and `review_rating` (numeric rating) records by chronological
 * proximity — the seeder posts the rating immediately before the feedback,
 * so the closest rating timestamped just before each feedback is the right
 * one in 99% of cases. Falls back to averaged-rating when proximity match
 * is ambiguous.
 */
export const loadProductReviews = cache(
  async (productId: number, limit = 100): Promise<ProductReview[]> => {
    if (!Number.isFinite(productId) || productId <= 0) return [];
    const [feedbacks, ratings, product] = await Promise.all([
      fetchFormData(FEEDBACK_MARKER, FEEDBACK_MODULE_CONFIG, productId, limit),
      fetchFormData(RATING_MARKER, RATING_MODULE_CONFIG, productId, limit),
      loadProductById(productId),
    ]);
    // Earlier seed iterations left behind feedback records with no body
    // (just headline + occasions). Hide those so the storefront only renders
    // the newer, properly-filled reviews.
    const withBody = feedbacks.filter((fb) => textValue(value(fb, 'body')).length > 0);
    if (withBody.length === 0) return [];

    const sizes = product?.sizes ?? [];

    // Group all ratings for this product by user — same person may have
    // posted multiple ratings over several seed iterations. We pair each
    // feedback with the rating that's closest in time *from the same user*,
    // which yields the rating that was emitted in the same submission run.
    const ratingsPerUser = new Map<string, Array<{ rating: number; time: number }>>();
    for (const r of ratings) {
      const user = String(r.userIdentifier ?? '').trim();
      if (!user) continue;
      const rating = Number(value(r, 'rating')) || 0;
      if (rating < 1 || rating > 5) continue;
      const time = r.time ? new Date(r.time).getTime() : 0;
      const arr = ratingsPerUser.get(user) ?? [];
      arr.push({ rating, time });
      ratingsPerUser.set(user, arr);
    }
    const allRatings = [...ratingsPerUser.values()].flat();
    const fallbackRating = (() => {
      if (allRatings.length === 0) return 5;
      const sum = allRatings.reduce((s, r) => s + r.rating, 0);
      return Math.max(1, Math.min(5, Math.round(sum / allRatings.length)));
    })();
    const used = new Set<string>();
    function pickRating(user: string, fbTime: number): number {
      const arr = ratingsPerUser.get(user);
      if (!arr || arr.length === 0) return fallbackRating;
      let best = -1;
      let bestDelta = Number.POSITIVE_INFINITY;
      for (let i = 0; i < arr.length; i += 1) {
        const key = `${user}:${i}`;
        if (used.has(key)) continue;
        const delta = Math.abs(arr[i].time - fbTime);
        if (delta < bestDelta) {
          bestDelta = delta;
          best = i;
        }
      }
      if (best === -1) return fallbackRating;
      used.add(`${user}:${best}`);
      return arr[best].rating;
    }

    return withBody.map((fb): ProductReview => {
      const user = String(fb.userIdentifier ?? '').trim();
      const fbTime = fb.time ? new Date(fb.time).getTime() : 0;
      const rating = pickRating(user, fbTime);
      return {
        id: fb.id,
        author: String(value(fb, 'name') ?? 'Anonymous'),
        rating,
        date: fmtDate(fb.time),
        title: String(value(fb, 'headline') ?? ''),
        body: textValue(value(fb, 'body')),
        size: pickSize(fb.id, sizes),
        helpful: 0,
        verified: true,
      };
    });
  },
);
