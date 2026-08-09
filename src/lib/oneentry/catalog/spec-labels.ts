import { currentCmsLocale } from '@/lib/oneentry/current-locale';
import { getSystemSet, type Lang, readSystemValue } from '@/lib/oneentry/system-text';

import { PRODUCT_SPEC_FALLBACK_LABELS, type ProductSpecKey } from './adapt';

/** OE marker of the system-text set holding the PDP specification row labels. */
const SPEC_LABELS_MARKER = 'product_specs';

/** `ProductSpecKey` → attribute marker inside {@link SPEC_LABELS_MARKER}. */
const SPEC_LABEL_KEYS: Record<ProductSpecKey, string> = {
  composition: 'product_specs_composition',
  lining: 'product_specs_lining',
  fit: 'product_specs_fit',
  style: 'product_specs_style',
  season: 'product_specs_season',
  brandOrigin: 'product_specs_brand_origin',
  sku: 'product_specs_sku',
};

/**
 * Read the PDP Specifications row labels from the admin panel.
 *
 * Pass the result to `adaptCatalogProductToPdpProduct` — the adapter itself
 * stays synchronous so tests and non-OE callers keep working. Keys the admin
 * left empty fall back to {@link PRODUCT_SPEC_FALLBACK_LABELS}, and an OE
 * outage yields the fallbacks wholesale rather than blank rows.
 */
export async function loadProductSpecLabels(langArg?: Lang): Promise<Record<ProductSpecKey, string>> {
  const lang = langArg ?? (await currentCmsLocale());
  const schema = await getSystemSet(SPEC_LABELS_MARKER, lang);
  const out = { ...PRODUCT_SPEC_FALLBACK_LABELS };
  for (const [key, marker] of Object.entries(SPEC_LABEL_KEYS) as [ProductSpecKey, string][]) {
    const value = readSystemValue(schema?.[marker], lang);
    if (value && value.length > 0) out[key] = value;
  }
  return out;
}
