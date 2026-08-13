/** Header configuration. */

// ── Routing (code-owned) ─────────────────────────────────────────────────────
export const STORE_LOCATIONS_HREF = '/stores';
export const ACCOUNT_HREF = '/account';
export const WISHLIST_HREF = '/favorites';

export const GENDER_NAV_HREFS: Record<string, string> = {
  women: '/women/clothing',
  men: '/men/clothing',
};

// ── Gender accent colours (code-owned) ───────────────────────────────────────
export { ACCENT_MEN as MEN_COLOR, ACCENT_WOMEN as WOMEN_COLOR } from '@/app/constants/colors';

// ── Shared fallbacks (used by more than one component) ───────────────────────

// ── Structural fallbacks (rendered by a map) ─────────────────────────────────

/** Shown when the CMS returns no locales at all, so the switcher is never blank. */
export const FALLBACK_LANGUAGE_LABEL = 'EN';

