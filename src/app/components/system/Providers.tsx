'use client'

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { Provider } from 'react-redux';
import { AuthProvider } from '../../context/AuthContext'
import { makeStore, loadCatalogFromStorage, type AppStore } from '../../store'
import { hydrateCatalogs, type CatalogsState } from '../../store/catalogSlice'
import { useAuth } from '../../context/AuthContext'
import { ServiceWorkerRegistrar } from './ServiceWorkerRegistrar'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import { PageViewTracker } from './PageViewTracker'
import { CartUnavailableNotice } from '../cart/CartUnavailableNotice'
import { DictProvider, useT } from '../../../lib/oneentry/labels/DictContext'
import type { Dictionary } from '../../../lib/oneentry/dictionary'
import { LocalesProvider } from '../../../lib/oneentry/LocalesContext'
import { FooterMenuProvider } from '../../../lib/oneentry/menus/FooterMenuContext'
import { OAUTH_ERROR_LABELS } from '../../data/authLabels';
import { HeaderMenuProvider } from '../../../lib/oneentry/menus/HeaderMenuContext'
import type { MenuPageNode } from '../../../lib/oneentry/menus/menus'
import { SignUpFormSchemaProvider } from '../../../lib/oneentry/auth/SignUpFormSchemaContext'
import type { SignUpFormSchema } from '../../../lib/oneentry/auth/sign-up-form'
import { FormPlaceholdersProvider } from '../../../lib/oneentry/forms/FormPlaceholdersContext'
import type { FormContent } from '../../../lib/oneentry/forms/placeholders'
import type { CmsLocale } from '../../../lib/oneentry/locales'
import { useRouter } from '../../../lib/i18n/navigation';

/**
 * No-op placeholder kept for backwards compatibility. Real wishlist
 * hydration happens in `WishlistContext` from /me/wishlist via
 * `useAuth().user.wishlistItems`.
 */
function WishlistSyncEffect() {
  const { isLoggedIn } = useAuth();
  void isLoggedIn;

  return null;
}

/** Surface the `?googleAuthError=…` param the OAuth callback route sets on
 *  failure (see `app/auth/callback/google/route.ts:22-38`). Without this
 *  the shopper lands back on `/` with the login modal already closed and
 *  no explanation for why sign-in didn't take. We re-open the modal so
 *  they can retry, and strip the query param so a hard refresh doesn't
 *  loop the modal open. */
/** Map the `?googleAuthError=…` query into a friendly banner shown on
 *  the LoginModal. OE's callback route surfaces codes like
 *  `access_denied` / `token_exchange_failed` — translate the common ones
 *  and default to the raw code when we don't have a matching phrase. */
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
  const lCancelled = useT('sign_in_google_cancelled',     OAUTH_ERROR_LABELS.accessDenied);
  const lToken     = useT('sign_in_google_token_failed',  OAUTH_ERROR_LABELS.token);
  const lState     = useT('sign_in_google_state_expired', OAUTH_ERROR_LABELS.state);
  const lGeneric   = useT('sign_in_google_generic_error', OAUTH_ERROR_LABELS.generic);
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
  headerMenu = [],
  signUpFormSchema,
  forms = {},
  cmsLocales = [],
}: {
  children: React.ReactNode;
  /** The whole CMS dictionary, flat `marker → value`. Loaded once in the root
   *  layout; every screen reads it through `useT` / `useDict` / `useList`. */
  dict?: Dictionary;
  footerMenu?: MenuPageNode[];
  headerMenu?: MenuPageNode[];
  signUpFormSchema?: SignUpFormSchema;
  /** OE form content keyed by marker — layout-wide forms only (the footer
   *  newsletter renders on every route). Route-scoped forms mount their own
   *  `FormPlaceholdersProvider` closer to the page. */
  forms?: Record<string, FormContent>;
  /** Active project locales — drives the header language switcher. */
  cmsLocales?: CmsLocale[];
}) {
  // Lazy `useState` initializer rather than the write-a-ref-during-render
  // idiom: the initializer runs exactly once and is render-safe, whereas
  // touching `ref.current` during render is flagged (React must be free to
  // re-run render without side effects).
  const [store] = useState<AppStore>(() => makeStore());

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
      <div
        id="aria-live-polite"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <div
        id="aria-live-assertive"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
      <AuthProvider>
        <WishlistSyncEffect />
        <PageViewTracker />
        <DictProvider data={dict}>
          <LocalesProvider data={cmsLocales}>
            <FooterMenuProvider data={footerMenu}>
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
        </DictProvider>
      </AuthProvider>
    </Provider>
  )
}
