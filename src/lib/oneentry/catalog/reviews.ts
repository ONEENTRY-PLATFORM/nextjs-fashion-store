import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getApi, isError, isOneEntryEnabled } from '../index';
import { withTiming } from '../profiling';
import { loadProductById } from './products';
import { DEFAULT_LOCALE } from '../locale';
import { logCaught } from '../log';
import { REVALIDATE_HOME } from '../../isr';
import type { ProductReview } from '../../../app/data/productCatalog';

type RawFormDataField = { marker: string; type: string; value: unknown };
interface RawFormDataItem {
  id: number;
  time?: string;
  userIdentifier?: string;
  // OE historically shipped review form-data as `{ en_US: [...] }` (a
  // language-wrapped bag) but currently returns the flat `FormDataType[]`
  // shape that matches the SDK typings. Accept either so the loader stays
  // resilient to the wrapping toggling back.
  formData?: RawFormDataField[] | { en_US?: RawFormDataField[] };
}

interface RawFormDataResp {
  items?: RawFormDataItem[];
  total?: number;
}

const FEEDBACK_MARKER = 'review_feedback';
const FEEDBACK_MODULE_CONFIG = 13;
const RATING_MARKER = 'review_rating';
const RATING_MODULE_CONFIG = 12;

// Cross-request cache of the raw OE form-data reads that back reviews.
// Previously only the outer `loadProductReviews` had React `cache()` (single
// request dedup), so every SSR of a PDP under load re-issued two form-data
// round-trips to OE. Under 20 VU this became the dominant contributor to
// PDP p95 (~17 s in perf-dump). `unstable_cache` shares one result across
// requests, keyed on all four args — 300 product ids × 2 markers = 600 max
// entries, easily fits the Data Cache. Reviews change slowly, so a 5-min
// window matches the homepage/block window and is safe.
const cachedFetchFormData = unstable_cache(
  async (
    marker: string,
    configId: number,
    productId: number,
    limit: number,
  ): Promise<RawFormDataItem[]> => {
    if (!isOneEntryEnabled) return [];
    try {
      const result = await getApi().FormData.getFormsDataByMarker(
        marker,
        configId,
        { entityIdentifier: productId },
        1,
        DEFAULT_LOCALE,
        0,
        limit,
      );
      if (isError(result)) return [];
      // Cast through `unknown` to the local `RawFormDataResp`: the SDK types
      // `formData` as `FormDataType[]`, but the review endpoints have
      // toggled between that flat shape and a wrapped `{ en_US: [...] }`
      // bag depending on OE version. `value()` below tolerates both.
      const data = result as unknown as RawFormDataResp;
      return Array.isArray(data.items) ? data.items : [];
    } catch (err) {
      logCaught(`reviews.cachedFetchFormData(${marker}, ${productId})`, err);
      return [];
    }
  },
  ['oe-review-formdata'],
  { revalidate: REVALIDATE_HOME, tags: ['oe-reviews'] },
);

function value(it: RawFormDataItem, marker: string): unknown {
  const raw = it.formData;
  const fields: RawFormDataField[] | undefined = Array.isArray(raw)
    ? raw
    : raw?.en_US;
  return fields?.find((f) => f.marker === marker)?.value;
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
export const loadProductReviews = withTiming('loadProductReviews', cache(
  async (productId: number, limit = 100): Promise<ProductReview[]> => {
    if (!Number.isFinite(productId) || productId <= 0) return [];
    // Reviews live in OE form-data (2 markers × 1 config × id). Even with
    // `cachedFetchFormData` warming subsequent requests, the very first
    // cold hit for a product id can wait 3-6 s on OE (perf-dump p95 = 3.2 s
    // pre-timeout). We hard-cap the SSR wait at 2 s: on timeout we return
    // an empty review list and let the PDP body stream. The abandoned
    // fetches keep running behind `unstable_cache`, so their result still
    // lands in the Data Cache and warms future SSRs of the same id — only
    // the very first user for a cold id gets a body without reviews.
    const raced = await Promise.race([
      Promise.all([
        cachedFetchFormData(FEEDBACK_MARKER, FEEDBACK_MODULE_CONFIG, productId, limit),
        cachedFetchFormData(RATING_MARKER, RATING_MODULE_CONFIG, productId, limit),
        loadProductById(productId),
      ]),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
    ]);
    if (raced === null) return [];
    const [feedbacks, ratings, product] = raced;
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
));
