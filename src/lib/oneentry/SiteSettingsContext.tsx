'use client';

import { createContext, type ReactNode, useContext } from 'react';

import { SITE_SETTINGS_FALLBACK, type SiteSettings } from './site-settings';

/** Client-side handle on the CMS-owned site settings. */
const Ctx = createContext<SiteSettings>(SITE_SETTINGS_FALLBACK);

/** Publish the settings parsed from the dictionary. */
export function SiteSettingsProvider({ data, children }: { data: SiteSettings; children: ReactNode }) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

/** Read the site settings. */
export function useSiteSettings(): SiteSettings {
  return useContext(Ctx);
}
