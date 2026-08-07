'use client'

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Provider } from 'react-redux';
import { AuthProvider } from '../../context/AuthContext'
import { makeStore, loadCatalogFromStorage, type AppStore } from '../../store'
import { hydrateCatalogs, type CatalogsState } from '../../store/catalogSlice'
import { useAuth } from '../../context/AuthContext'
import { ServiceWorkerRegistrar } from './ServiceWorkerRegistrar'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import { PageViewTracker } from './PageViewTracker'
import { CartUnavailableNotice } from '../cart/CartUnavailableNotice'
import { ProductCardLabelsProvider } from '../../../lib/oneentry/labels/ProductCardLabelsContext'
import type { ProductCardDict } from '../../../lib/oneentry/labels/product-card-types'
import { SignInLabelsProvider } from '../../../lib/oneentry/labels/SignInLabelsContext'
import type { SignInDict } from '../../../lib/oneentry/labels/sign-in-types'
import { CreateAccountLabelsProvider } from '../../../lib/oneentry/labels/CreateAccountLabelsContext'
import type { CreateAccountDict } from '../../../lib/oneentry/labels/create-account-types'
import { InterfaceControlsLabelsProvider } from '../../../lib/oneentry/labels/InterfaceControlsLabelsContext'
import type { InterfaceControlsDict } from '../../../lib/oneentry/labels/interface-controls-types'
import { YourBagLabelsProvider } from '../../../lib/oneentry/labels/YourBagLabelsContext'
import type { YourBagDict } from '../../../lib/oneentry/labels/your-bag-types'
import { FooterMenuProvider } from '../../../lib/oneentry/menus/FooterMenuContext'
import { SystemPagesLabelsProvider } from '../../../lib/oneentry/labels/SystemPagesLabelsContext'
import type { SystemPagesDict } from '../../../lib/oneentry/labels/system-pages-types'
import { useSignInT } from '../../../lib/oneentry/labels/SignInLabelsContext';
import { OAUTH_ERROR_LABELS } from '../../data/authLabels';
import { HeaderMenuProvider } from '../../../lib/oneentry/menus/HeaderMenuContext'
import type { MenuPageNode } from '../../../lib/oneentry/menus/menus'
import { SignUpFormSchemaProvider } from '../../../lib/oneentry/auth/SignUpFormSchemaContext'
import type { SignUpFormSchema } from '../../../lib/oneentry/auth/sign-up-form'
import { FormPlaceholdersProvider } from '../../../lib/oneentry/forms/FormPlaceholdersContext'
import type { FormContent } from '../../../lib/oneentry/forms/placeholders'
import { HeaderLabelsProvider } from '../../../lib/oneentry/labels/HeaderLabelsContext'
import type { HeaderDict } from '../../../lib/oneentry/labels/header-types'
import { FooterLabelsProvider } from '../../../lib/oneentry/labels/FooterLabelsContext'
import type { FooterDict } from '../../../lib/oneentry/labels/footer-types'
import type { CmsLocale } from '../../../lib/oneentry/locales'

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
  const lCancelled = useSignInT('sign_in_google_cancelled',     OAUTH_ERROR_LABELS.accessDenied);
  const lToken     = useSignInT('sign_in_google_token_failed',  OAUTH_ERROR_LABELS.token);
  const lState     = useSignInT('sign_in_google_state_expired', OAUTH_ERROR_LABELS.state);
  const lGeneric   = useSignInT('sign_in_google_generic_error', OAUTH_ERROR_LABELS.generic);
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
  productCardLabels = {},
  signInLabels = {},
  createAccountLabels = {},
  interfaceControlsLabels = {},
  yourBagLabels = {},
  footerMenu = [],
  systemPagesLabels = {},
  headerMenu = [],
  signUpFormSchema,
  forms = {},
  headerLabels = {},
  footerLabels = {},
  cmsLocales = [],
}: {
  children: React.ReactNode;
  productCardLabels?: ProductCardDict;
  signInLabels?: SignInDict;
  createAccountLabels?: CreateAccountDict;
  interfaceControlsLabels?: InterfaceControlsDict;
  yourBagLabels?: YourBagDict;
  footerMenu?: MenuPageNode[];
  systemPagesLabels?: SystemPagesDict;
  headerMenu?: MenuPageNode[];
  signUpFormSchema?: SignUpFormSchema;
  /** OE form content keyed by marker — layout-wide forms only (the footer
   *  newsletter renders on every route). Route-scoped forms mount their own
   *  `FormPlaceholdersProvider` closer to the page. */
  forms?: Record<string, FormContent>;
  /** OE `header` system-text set. */
  headerLabels?: HeaderDict;
  /** OE `footer` system-text set — branding copy for the global footer. */
  footerLabels?: FooterDict;
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
        <ProductCardLabelsProvider data={productCardLabels}>
          <SignInLabelsProvider data={signInLabels}>
            <CreateAccountLabelsProvider data={createAccountLabels}>
              <InterfaceControlsLabelsProvider data={interfaceControlsLabels}>
                <YourBagLabelsProvider data={yourBagLabels}>
                  <FooterMenuProvider data={footerMenu}>
                    <HeaderMenuProvider data={headerMenu}>
                      <SignUpFormSchemaProvider data={signUpFormSchema}>
                        <FormPlaceholdersProvider forms={forms}>
                          <HeaderLabelsProvider data={{ labels: headerLabels, locales: cmsLocales }}>
                            <FooterLabelsProvider data={footerLabels}>
                              <SystemPagesLabelsProvider data={systemPagesLabels}>
                              {/* Both of these read label contexts, so they
                                   must sit *inside* the providers — mounted
                                   above them they silently rendered the
                                   offline fallbacks.
                                   `useSearchParams()` inside
                                   `GoogleAuthErrorSurface` opts the tree into
                                   per-request rendering; without a Suspense
                                   boundary the static prerender of
                                   `/_not-found` fails at build time with
                                   "missing-suspense-with-csr-bailout". The
                                   component renders nothing — the fallback is
                                   intentionally empty. */}
                              <Suspense fallback={null}>
                                <GoogleAuthErrorSurface />
                              </Suspense>
                              <CartUnavailableNotice />
                              <ErrorBoundary>{children}</ErrorBoundary>
                              </SystemPagesLabelsProvider>
                            </FooterLabelsProvider>
                          </HeaderLabelsProvider>
                        </FormPlaceholdersProvider>
                      </SignUpFormSchemaProvider>
                    </HeaderMenuProvider>
                  </FooterMenuProvider>
                </YourBagLabelsProvider>
              </InterfaceControlsLabelsProvider>
            </CreateAccountLabelsProvider>
          </SignInLabelsProvider>
        </ProductCardLabelsProvider>
      </AuthProvider>
    </Provider>
  )
}
