'use client';

import { createContext, type ReactNode, useContext } from 'react';

import { SITE_SETTINGS_FALLBACK, type SiteSettings } from './site-settings';

/**
 * Client-side handle on the CMS-owned site settings (brand, commerce terms,
 * socials, referral programme, palette).
 *
 * The values ride in on the same dictionary every label uses — see
 * `dictionary.ts` — so this provider costs no extra request. It exists because
 * the parsed shape is far more useful to a component than seven `useT` calls
 * with their own fallbacks, and because the numbers must agree with what the
 * server rendered into the structured data on the same page.
 *
 * With no provider mounted (Storybook, isolated unit tests) readers get the
 * shipped defaults rather than throwing.
 */
const Ctx = createContext<SiteSettings>(SITE_SETTINGS_FALLBACK);

/**
 * Publish the settings parsed from the dictionary.
 *
 * @param   props          - Provider props.
 * @param   props.data     - Parsed settings.
 * @param   props.children - Subtree that reads them.
 * @returns                  The provided subtree.
 */
export function SiteSettingsProvider({ data, children }: { data: SiteSettings; children: ReactNode }) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

/**
 * Read the site settings.
 *
 * @returns The CMS settings, or the shipped defaults outside a provider.
 */
export function useSiteSettings(): SiteSettings {
  return useContext(Ctx);
}
