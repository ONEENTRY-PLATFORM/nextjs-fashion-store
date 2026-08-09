/**
 * Brand palette.
 *
 * Each constant is a CSS `var()` reference, not a literal: the live colours are
 * editor-owned (OE `site_settings` → `Theme — …`) and the root layout publishes
 * them as `--brand-*` custom properties on `<html>`
 * (see `themeCssVariables` in `src/lib/oneentry/site-settings.ts`). The second
 * argument to each `var()` is the shipped colour, so a subtree rendered outside
 * the layout — Storybook, a unit test, the OG image renderer — still paints.
 *
 * Consequence worth knowing: these values are only usable where CSS is parsed
 * (inline `style`, custom-property declarations, Tailwind arbitrary values).
 * Somewhere that needs an actual hex — a canvas, an SVG presentation attribute,
 * a `<meta name="theme-color">` — must read {@link BRAND_COLOR_FALLBACKS} or,
 * better, the resolved palette from `useSiteSettings().theme`.
 */

import { SITE_SETTINGS_FALLBACK } from '@/lib/oneentry/site-settings';

/** Shipped hex values, for the few places that cannot take a `var()`. */
export const BRAND_COLOR_FALLBACKS = SITE_SETTINGS_FALLBACK.theme;

/** Brand accent color for women's sections */
export const ACCENT_WOMEN = `var(--brand-accent-women, ${BRAND_COLOR_FALLBACKS.accentWomen})`;

/** Brand accent color for men's sections */
export const ACCENT_MEN = `var(--brand-accent-men, ${BRAND_COLOR_FALLBACKS.accentMen})`;

/** Sale / error / discount color */
export const SALE_COLOR = `var(--brand-sale, ${BRAND_COLOR_FALLBACKS.sale})`;

/** Neutral banner / section background */
export const BANNER_BG = `var(--brand-banner-bg, ${BRAND_COLOR_FALLBACKS.bannerBg})`;

/** "Buy now" / success green */
export const BUY_GREEN = `var(--brand-buy, ${BRAND_COLOR_FALLBACKS.buy})`;
/** "Buy now" hover green */
export const BUY_GREEN_HOVER = `var(--brand-buy-hover, ${BRAND_COLOR_FALLBACKS.buyHover})`;

/** SALE nav highlight yellow */
export const SALE_YELLOW = `var(--brand-sale-yellow, ${BRAND_COLOR_FALLBACKS.saleYellow})`;
