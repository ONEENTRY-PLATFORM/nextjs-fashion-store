import { unstable_cache } from 'next/cache';
import type { FormDataType, IFormByMarkerDataEntity, IFormsByMarkerDataEntity } from 'oneentry/types';
import { cache } from 'react';

import type { ProductReview } from '@/app/data/productCatalog';
import { REVALIDATE_PRODUCT } from '@/lib/isr';
import { formDataValue } from '@/lib/oneentry/forms/form-data-entry';
import { getApi, isError, isOneEntryEnabled } from '@/lib/oneentry/index';
import { DEFAULT_LOCALE } from '@/lib/oneentry/locale';
import { logCaught } from '@/lib/oneentry/log';
import { withTiming } from '@/lib/oneentry/profiling';

import { loadProductById } from './products';

// OE historically shipped review form-data as `{ en_US: [...] }` (a language-wrapped bag) but currently returns the flat `FormDataType[]` shape the SDK declares. Both are still handled.
type RawFormDataItem = Omit<IFormByMarkerDataEntity, 'formData'> & {
  formData?: FormDataType[] | { en_US?: FormDataType[] };
};

type RawFormDataResp = Omit<IFormsByMarkerDataEntity, 'items'> & { items?: RawFormDataItem[] };

const FEEDBACK_MARKER = 'review_feedback';
const FEEDBACK_MODULE_CONFIG = 13;
const RATING_MARKER = 'review_rating';
const RATING_MODULE_CONFIG = 12;

// Cross-request cache of the raw OE form-data reads that back reviews.
const cachedFetchFormData = unstable_cache(
  async (marker: string, configId: number, productId: number, limit: number): Promise<RawFormDataItem[]> => {
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
      const data: RawFormDataResp = result;
      return Array.isArray(data.items) ? data.items : [];
    } catch (err) {
      logCaught(`reviews.cachedFetchFormData(${marker}, ${productId})`, err);
      return [];
    }
  },
  ['oe-review-formdata'],
  // Reviews only ever render on a PDP, so they follow the PDP window: on the homepage window this
  // was one of the two caches holding every product page at 5 minutes.
  { revalidate: REVALIDATE_PRODUCT, tags: ['oe-reviews'] },
);

function value(it: RawFormDataItem, marker: string): unknown {
  const raw = it.formData;
  return formDataValue(Array.isArray(raw) ? raw : raw?.en_US, marker);
}

/** Extract plain text from OE `text` type field which stores values as `[{ plainValue }]` or `[{ htmlValue }]` or `[{ mdValue }]`. */
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

/** Deterministic size picker: same review id → same size on every render. */
function pickSize(reviewId: number, sizes: string[]): string {
  if (sizes.length === 0) return '';
  return sizes[reviewId % sizes.length];
}

// `IFormByMarkerDataEntity.time` is `Date | string` — `new Date()` swallows either.
function fmtDate(iso: Date | string | undefined): string {
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

/** Fetch reviews for a product from OE form-data and adapt to the storefront `ProductReview` shape. */
export const loadProductReviews = withTiming(
  'loadProductReviews',
  cache(async (productId: number, limit = 100): Promise<ProductReview[]> => {
    if (!Number.isFinite(productId) || productId <= 0) return [];
    // Reviews live in OE form-data (2 markers × 1 config × id).
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
    // Earlier seed iterations left behind feedback records with no body (just headline + occasions).
    const withBody = feedbacks.filter((fb) => textValue(value(fb, 'body')).length > 0);
    if (withBody.length === 0) return [];

    const sizes = product?.sizes ?? [];

    // Group all ratings for this product by user — same person may have posted multiple ratings over several seed iterations.
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
  }),
);
