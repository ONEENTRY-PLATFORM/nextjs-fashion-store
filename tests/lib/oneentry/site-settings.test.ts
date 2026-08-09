import { beforeEach, describe, expect, it } from 'vitest';

import { configureCurrency, CURRENCY, CURRENCY_FALLBACK } from '@/app/data/currencyConfig';
import { parseSiteSettings, SITE_SETTINGS_FALLBACK, themeCssVariables } from '@/lib/oneentry/site-settings';

const P = 'site_settings_';

describe('parseSiteSettings', () => {
  it('returns the shipped defaults when the CMS has nothing', () => {
    expect(parseSiteSettings(null)).toEqual(SITE_SETTINGS_FALLBACK);
    expect(parseSiteSettings({})).toEqual(SITE_SETTINGS_FALLBACK);
  });

  it('reads brand, currency and commerce terms', () => {
    const settings = parseSiteSettings({
      [`${P}site_name`]: 'Nuevo',
      [`${P}currency_code`]: 'EUR',
      [`${P}currency_symbol`]: '€',
      [`${P}free_shipping_threshold`]: '75',
      [`${P}return_window_days`]: '14',
      [`${P}delivery_country`]: 'DE',
    });
    expect(settings.brand.siteName).toBe('Nuevo');
    expect(settings.currency).toEqual({ code: 'EUR', symbol: '€' });
    expect(settings.commerce.freeShippingThreshold).toBe(75);
    expect(settings.commerce.returnWindowDays).toBe(14);
    expect(settings.commerce.deliveryCountry).toBe('DE');
  });

  it('falls back per field, so a half-filled set keeps the shipped rest', () => {
    const settings = parseSiteSettings({ [`${P}site_name`]: 'Nuevo' });
    expect(settings.brand.siteDescription).toBe(SITE_SETTINGS_FALLBACK.brand.siteDescription);
    expect(settings.commerce).toEqual(SITE_SETTINGS_FALLBACK.commerce);
  });

  it('keeps the shipped number when an editor types prose into a numeric field', () => {
    // `$NaN` on a shipping offer is worse than a stale figure.
    const settings = parseSiteSettings({ [`${P}free_shipping_threshold`]: 'free!' });
    expect(settings.commerce.freeShippingThreshold).toBe(SITE_SETTINGS_FALLBACK.commerce.freeShippingThreshold);
  });

  it('accepts a comma decimal separator on money fields', () => {
    expect(parseSiteSettings({ [`${P}standard_shipping_price`]: '4,50' }).commerce.standardShippingPrice).toBe(4.5);
  });

  it('splits comma-separated lists and drops blanks', () => {
    const settings = parseSiteSettings({ [`${P}org_area_served`]: ' GB , , DE ' });
    expect(settings.org.areaServed).toEqual(['GB', 'DE']);
  });

  it('treats a blanked social URL as "remove this network"', () => {
    // Every other field falls back when blank; a social link must not, or an
    // editor could never take a dead profile out of the structured data.
    const settings = parseSiteSettings({ [`${P}social_facebook`]: '', [`${P}social_tiktok`]: 'https://x.example' });
    expect(settings.socials.facebook).toBeUndefined();
    expect(settings.socials.tiktok).toBe('https://x.example');
    // Absent from the dictionary entirely (no CMS) still means "shipped".
    expect(settings.socials.instagram).toBe(SITE_SETTINGS_FALLBACK.socials.instagram);
  });

  it('rejects a malformed colour rather than emitting an invalid CSS value', () => {
    const settings = parseSiteSettings({
      [`${P}color_accent_men`]: 'dark red',
      [`${P}color_accent_women`]: '#0f0',
    });
    expect(settings.theme.accentMen).toBe(SITE_SETTINGS_FALLBACK.theme.accentMen);
    expect(settings.theme.accentWomen).toBe('#0f0');
  });

  it('derives the referral switch from the credit amount', () => {
    expect(parseSiteSettings({}).referral.enabled).toBe(false);
    expect(parseSiteSettings({ [`${P}referral_credit_amount`]: '25' }).referral).toMatchObject({
      creditAmount: 25,
      enabled: true,
    });
  });
});

describe('themeCssVariables', () => {
  it('publishes brand-prefixed names so component-local aliases cannot self-reference', () => {
    const vars = themeCssVariables(SITE_SETTINGS_FALLBACK.theme);
    expect(Object.keys(vars).every((name) => name.startsWith('--brand-'))).toBe(true);
    expect(vars['--brand-accent-women']).toBe(SITE_SETTINGS_FALLBACK.theme.accentWomen);
  });
});

describe('configureCurrency', () => {
  beforeEach(() => {
    configureCurrency(CURRENCY_FALLBACK);
  });

  it('formats with the configured symbol', () => {
    configureCurrency({ symbol: '€', code: 'EUR' });
    expect(CURRENCY.format(35)).toBe('€35');
    expect(CURRENCY.format(35.5)).toBe('€35.5');
    expect(CURRENCY.formatInteger(10)).toBe('€10');
    expect(CURRENCY.code).toBe('EUR');
  });

  it('strips the configured symbol back off', () => {
    configureCurrency({ symbol: '€', code: 'EUR' });
    expect(CURRENCY.strip('€1,250.00')).toBe('1250.00');
  });

  it('ignores blank fields instead of wiping the symbol', () => {
    configureCurrency({ symbol: '€', code: 'EUR' });
    configureCurrency({ symbol: '  ', code: '' });
    expect(CURRENCY.symbol).toBe('€');
    expect(CURRENCY.code).toBe('EUR');
  });
});
