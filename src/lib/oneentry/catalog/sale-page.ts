import { unstable_cache } from 'next/cache';
import { getApi, isError, isOneEntryEnabled } from '../index';
import type { Lang } from '../system-text';
import { DEFAULT_LOCALE } from '../locale';

export interface SalePageFromCms {
  hero: {
    eyebrow: string;
    /** Rich HTML from OE `text` attribute (`htmlValue`) — rendered via
     *  `dangerouslySetInnerHTML` when meaningful. Empty string when the
     *  admin's rich-text editor value is blank (OE returns `"<p><br></p>"`
     *  for empty fields — normalized to `''` here). */
    contentHtml: string;
    /** Plain-text version of the same `text` attribute (`plainValue`).
     *  Used as fallback when `contentHtml` is empty — the SaleHero splits
     *  it line-by-line to fill the original title / discount / subtitle
     *  slots so the banner keeps its visual weight even if the admin
     *  filled only the plain-text field. */
    contentPlain: string;
    ctaLabel: string;
    timerLabel: string;
    /** Free-form caption under the countdown (e.g. "Ends March 15…"). Empty
     *  when the admin left it blank — caller falls back to formatting the
     *  parsed `saleEndsAt` timestamp. */
    timerEndsText: string;
    image: string;
  };
  promo: {
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    ctaHref: string;
    image: string;
  };
  /** Epoch ms parsed from `page_sale_top_banner_timer.value.fullDate`, or
   *  `null` when the admin cleared the field. Callers fall back to the
   *  hard-coded `SALE_END_DATE` so the countdown never renders blank. */
  saleEndsAt: number | null;
}

type RawAttr = { value?: unknown };
type RawPage = {
  attributeValues?: Record<string, Record<string, RawAttr>> | Record<string, RawAttr>;
};

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');
const extractImage = (v: unknown): string => {
  if (!Array.isArray(v) || v.length === 0) return '';
  const first = v[0] as { downloadLink?: unknown };
  return typeof first?.downloadLink === 'string' ? first.downloadLink : '';
};
const extractHtml = (v: unknown): string => {
  if (!Array.isArray(v) || v.length === 0) return '';
  const first = v[0] as { htmlValue?: unknown };
  const html = typeof first?.htmlValue === 'string' ? first.htmlValue : '';
  // OE's rich-text editor persists `"<p><br></p>"` (and similar
  // whitespace-only shells) for empty fields — treat those as blank so
  // the consumer falls back to plainValue / static labels instead of
  // rendering a visually-empty div and collapsing the banner.
  const stripped = html.replace(/<[^>]+>/g, '').replace(/\s+/g, '');
  return stripped.length > 0 ? html : '';
};
const extractPlain = (v: unknown): string => {
  if (!Array.isArray(v) || v.length === 0) return '';
  const first = v[0] as { plainValue?: unknown };
  return typeof first?.plainValue === 'string' ? first.plainValue : '';
};
const extractFullDate = (v: unknown): number | null => {
  if (!v || typeof v !== 'object') return null;
  const iso = (v as { fullDate?: unknown }).fullDate;
  if (typeof iso !== 'string') return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
};

async function fetchSalePage(lang: Lang): Promise<SalePageFromCms | null> {
  if (!isOneEntryEnabled) return null;
  try {
    const result = await getApi().Pages.getPageByUrl('sale', lang);
    if (isError(result)) return null;
    const page = result as unknown as RawPage;
    const av = page.attributeValues ?? {};
    // Handle both wrapped (`{ en_US: {...} }`) and flat (`{ marker: {...} }`).
    const wrapped = (av as Record<string, Record<string, RawAttr>>)[lang];
    const attrs: Record<string, RawAttr> = (wrapped && typeof wrapped === 'object')
      ? wrapped
      : (av as Record<string, RawAttr>);
    const s = (k: string): string => asString(attrs[k]?.value);
    return {
      hero: {
        eyebrow:       s('page_sale_top_banner_lable'),
        contentHtml:   extractHtml(attrs['page_sale_top_banner_text']?.value),
        contentPlain:  extractPlain(attrs['page_sale_top_banner_text']?.value),
        ctaLabel:      s('page_sale_top_banner_cta'),
        timerLabel:    s('page_sale_top_banner_timer_lable'),
        timerEndsText: s('page_sale_top_banner_timer_text'),
        image:         extractImage(attrs['page_sale_top_banner_picture']?.value),
      },
      promo: {
        eyebrow:  s('page_sale_footer_banner_lable'),
        title:    s('page_sale_footer_banner_title'),
        subtitle: s('page_sale_footer_banner_sub_title'),
        ctaLabel: s('page_sale_footer_banner_cta'),
        ctaHref:  s('page_sale_footer_banner_cta_link'),
        image:    extractImage(attrs['page_sale_footer_banner_picture']?.value),
      },
      saleEndsAt: extractFullDate(attrs['page_sale_top_banner_timer']?.value),
    };
  } catch {
    return null;
  }
}

/** Cached loader — refresh every 60s so admin edits to the sale banner
 *  surface without a manual redeploy, but hot page loads still hit cache. */
export const loadSalePage = unstable_cache(
  (lang: Lang = DEFAULT_LOCALE) => fetchSalePage(lang),
  ['oe-sale-page'],
  { revalidate: 60, tags: ['oe-page'] },
);
