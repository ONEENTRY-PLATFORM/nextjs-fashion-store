/** Brand palette. */

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
