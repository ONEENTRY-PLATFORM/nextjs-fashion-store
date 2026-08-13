'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Provider } from 'react-redux';

import { CartUnavailableNotice } from '@/app/components/cart/CartUnavailableNotice';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import { AuthProvider, useAuth } from '@/app/context/AuthContext';
import { configureCurrency } from '@/app/data/currencyConfig';
import { type AppStore, loadCatalogFromStorage, makeStore } from '@/app/store';
import { type CatalogsState, hydrateCatalogs } from '@/app/store/catalogSlice';
import { useLocale, useRouter } from '@/lib/i18n/navigation';
import { setLang } from '@/lib/oneentry';
import type { SignUpFormSchema } from '@/lib/oneentry/auth/sign-up-form';
import { SignUpFormSchemaProvider } from '@/lib/oneentry/auth/SignUpFormSchemaContext';
import type { Dictionary } from '@/lib/oneentry/dictionary';
import { FormPlaceholdersProvider } from '@/lib/oneentry/forms/FormPlaceholdersContext';
import type { FormContent } from '@/lib/oneentry/forms/placeholders';
import { DictProvider, useT } from '@/lib/oneentry/labels/DictContext';
import { toCmsLocale } from '@/lib/oneentry/locale';
import type { CmsLocale } from '@/lib/oneentry/locales';
import { LocalesProvider } from '@/lib/oneentry/LocalesContext';
import { FooterMenuProvider } from '@/lib/oneentry/menus/FooterMenuContext';
import { HeaderMenuProvider } from '@/lib/oneentry/menus/HeaderMenuContext';
import type { MenuPageNode } from '@/lib/oneentry/menus/menus';
import { parseSiteSettings } from '@/lib/oneentry/site-settings';
import { SiteSettingsProvider } from '@/lib/oneentry/SiteSettingsContext';

import { PageViewTracker } from './PageViewTracker';
import { ServiceWorkerRegistrar } from './ServiceWorkerRegistrar';

/** No-op placeholder kept for backwards compatibility. */
function WishlistSyncEffect() {
  const { isLoggedIn } = useAuth();
  void isLoggedIn;

  return null;
}

/** OAuth failure banner copy, keyed by the `?googleAuthError=` code family. */
export const OAUTH_ERROR_LABELS = {
  accessDenied: 'Google sign-in was cancelled. Please try again.',
  token: "We couldn't verify your Google account. Please try again.",
  state: 'Sign-in session expired. Please try again.',
  generic: "We couldn't complete Google sign-in. Please try again.",
} as const;

/** Surface the `?googleAuthError=…` param the OAuth callback route sets on failure. Map the `?googleAuthError=…` query into a friendly banner shown on the LoginModal. */
function humaniseGoogleAuthError(
  code: string,
  copy: { accessDenied: string; token: string; state: string; generic: string },
): string {
  const c = code.toLowerCase();
  if (c === 'access_denied') return copy.accessDenied;
  if (c.includes('token')) return copy.token;
  if (c.includes('state')) return copy.state;
  return copy.generic;
}

function GoogleAuthErrorSurface() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { openLoginModal, setAuthError } = useAuth();
  const lCancelled = useT('sign_in_google_cancelled', OAUTH_ERROR_LABELS.accessDenied);
  const lToken = useT('sign_in_google_token_failed', OAUTH_ERROR_LABELS.token);
  const lState = useT('sign_in_google_state_expired', OAUTH_ERROR_LABELS.state);
  const lGeneric = useT('sign_in_google_generic_error', OAUTH_ERROR_LABELS.generic);
  // Stable identity so the effect below doesn't re-run on every render.
  const oauthCopy = useMemo(
    () => ({ accessDenied: lCancelled, token: lToken, state: lState, generic: lGeneric }),
    [lCancelled, lToken, lState, lGeneric],
  );
  const rawErr = searchParams?.get('googleAuthError');
  useEffect(() => {
    if (!rawErr) return;
    setAuthError(humaniseGoogleAuthError(rawErr, oauthCopy));
    openLoginModal();
    // Drop the query param without a full navigation.
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('googleAuthError');
      router.replace(url.pathname + url.search);
    } else {
      router.replace(pathname ?? '/');
    }
  }, [oauthCopy, rawErr, openLoginModal, setAuthError, router, pathname]);
  return null;
}

export function Providers({
  children,
  dict = {},
  footerMenu = [],
  footerColumnsMenu = [],
  headerMenu = [],
  signUpFormSchema,
  forms = {},
  cmsLocales = [],
}: {
  children: React.ReactNode;
  /** The whole CMS dictionary, flat `marker → value`. Loaded once in the root layout. */
  dict?: Dictionary;
  /** `footer` menu — the legal row under the copyright line. */
  footerMenu?: MenuPageNode[];
  /** `bottom_menu` — the footer's link columns. */
  footerColumnsMenu?: MenuPageNode[];
  headerMenu?: MenuPageNode[];
  signUpFormSchema?: SignUpFormSchema;
  /** OE form content keyed by marker — layout-wide forms only: the footer newsletter, plus the two review forms. */
  forms?: Record<string, FormContent>;
  /** Active project locales — drives the header language switcher. */
  cmsLocales?: CmsLocale[];
}) {
  // Lazy `useState` initializer rather than the write-a-ref-during-render idiom: the initializer runs exactly once and is render-safe, whereas touching `ref.current` during render is flagged.
  const [store] = useState<AppStore>(() => makeStore());

  // Settings are derived from the same dictionary the labels use, so they cost no extra request.
  const siteSettings = useMemo(() => {
    const parsed = parseSiteSettings(dict);
    configureCurrency(parsed.currency);
    return parsed;
  }, [dict]);

  // Tell the browser SDK which locale the shopper is on; without it every user-scoped call keeps the constructor default.
  const shortLocale = useLocale();
  useMemo(() => setLang(toCmsLocale(shortLocale)), [shortLocale]);

  useEffect(() => {
    const catalog = loadCatalogFromStorage();
    if (catalog) {
      store.dispatch(hydrateCatalogs(catalog as CatalogsState));
    }
  }, [store]);

  return (
    <Provider store={store}>
      <ServiceWorkerRegistrar />
      {/* Global ARIA live regions for screen reader announcements */}
      <div id="aria-live-polite" aria-live="polite" aria-atomic="true" className="sr-only" />
      <div id="aria-live-assertive" aria-live="assertive" aria-atomic="true" className="sr-only" />
      <AuthProvider>
        <WishlistSyncEffect />
        <PageViewTracker />
        <DictProvider data={dict}>
          <SiteSettingsProvider data={siteSettings}>
            <LocalesProvider data={cmsLocales}>
              <FooterMenuProvider columns={footerColumnsMenu} legal={footerMenu}>
                <HeaderMenuProvider data={headerMenu}>
                  <SignUpFormSchemaProvider data={signUpFormSchema}>
                    <FormPlaceholdersProvider forms={forms}>
                      {/* `GoogleAuthErrorSurface` reads the dictionary, so it
                         must sit *inside* `DictProvider` — mounted above it,
                         it silently rendered the offline fallbacks.
                         `useSearchParams()` inside it also opts the tree into
                         per-request rendering; without a Suspense boundary the
                         static prerender of `/_not-found` fails at build time
                         with "missing-suspense-with-csr-bailout". The
                         component renders nothing — the fallback is
                         intentionally empty. */}
                      <Suspense fallback={null}>
                        <GoogleAuthErrorSurface />
                      </Suspense>
                      <CartUnavailableNotice />
                      <ErrorBoundary>{children}</ErrorBoundary>
                    </FormPlaceholdersProvider>
                  </SignUpFormSchemaProvider>
                </HeaderMenuProvider>
              </FooterMenuProvider>
            </LocalesProvider>
          </SiteSettingsProvider>
        </DictProvider>
      </AuthProvider>
    </Provider>
  );
}
