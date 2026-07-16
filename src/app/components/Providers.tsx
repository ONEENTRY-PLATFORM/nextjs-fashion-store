'use client'

import React, { useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Provider } from 'react-redux';
import { AuthProvider } from '../context/AuthContext'
import { makeStore, loadCatalogFromStorage, type AppStore } from '../store'
import { hydrateCatalogs, type CatalogsState } from '../store/catalogSlice'
import { useAuth } from '../context/AuthContext'
import { ServiceWorkerRegistrar } from './ServiceWorkerRegistrar'
import { ErrorBoundary } from './ErrorBoundary'
import { PageViewTracker } from './PageViewTracker'
import { CartUnavailableNotice } from './CartUnavailableNotice'
import { ProductCardLabelsProvider } from '../../lib/oneentry/labels/ProductCardLabelsContext'
import type { ProductCardDict } from '../../lib/oneentry/labels/product-card-types'
import { SignInLabelsProvider } from '../../lib/oneentry/labels/SignInLabelsContext'
import type { SignInDict } from '../../lib/oneentry/labels/sign-in-types'
import { CreateAccountLabelsProvider } from '../../lib/oneentry/labels/CreateAccountLabelsContext'
import type { CreateAccountDict } from '../../lib/oneentry/labels/create-account-types'
import { InterfaceControlsLabelsProvider } from '../../lib/oneentry/labels/InterfaceControlsLabelsContext'
import type { InterfaceControlsDict } from '../../lib/oneentry/labels/interface-controls-types'
import { YourBagLabelsProvider } from '../../lib/oneentry/labels/YourBagLabelsContext'
import type { YourBagDict } from '../../lib/oneentry/labels/your-bag-types'
import { FooterMenuProvider } from '../../lib/oneentry/menus/FooterMenuContext'
import { HeaderMenuProvider } from '../../lib/oneentry/menus/HeaderMenuContext'
import type { MenuPageNode } from '../../lib/oneentry/menus/menus'
import { SignUpFormSchemaProvider } from '../../lib/oneentry/auth/SignUpFormSchemaContext'
import type { SignUpFormSchema } from '../../lib/oneentry/auth/sign-up-form'

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
function humaniseGoogleAuthError(code: string): string {
  const c = code.toLowerCase();
  if (c === 'access_denied') return 'Google sign-in was cancelled. Please try again.';
  if (c.includes('token')) return "We couldn't verify your Google account. Please try again.";
  if (c.includes('state')) return 'Sign-in session expired. Please try again.';
  return "We couldn't complete Google sign-in. Please try again.";
}

function GoogleAuthErrorSurface() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { openLoginModal, setAuthError } = useAuth();
  const rawErr = searchParams?.get('googleAuthError');
  useEffect(() => {
    if (!rawErr) return;
    setAuthError(humaniseGoogleAuthError(rawErr));
    openLoginModal();
    // Drop the query param without a full navigation.
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('googleAuthError');
      router.replace(url.pathname + url.search);
    } else {
      router.replace(pathname ?? '/');
    }
  }, [rawErr, openLoginModal, setAuthError, router, pathname]);
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
  headerMenu = [],
  signUpFormSchema,
}: {
  children: React.ReactNode;
  productCardLabels?: ProductCardDict;
  signInLabels?: SignInDict;
  createAccountLabels?: CreateAccountDict;
  interfaceControlsLabels?: InterfaceControlsDict;
  yourBagLabels?: YourBagDict;
  footerMenu?: MenuPageNode[];
  headerMenu?: MenuPageNode[];
  signUpFormSchema?: SignUpFormSchema;
}) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  useEffect(() => {
    const catalog = loadCatalogFromStorage();
    if (catalog && storeRef.current) {
      storeRef.current.dispatch(hydrateCatalogs(catalog as CatalogsState));
    }
  }, []);

  return (
    <Provider store={storeRef.current}>
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
        {/* `useSearchParams()` inside `GoogleAuthErrorSurface` opts the tree
             into per-request rendering; without a Suspense boundary the
             static prerender of `/_not-found` (and any other 404 fallback)
             fails at build time with "missing-suspense-with-csr-bailout".
             The component itself renders nothing — the boundary's fallback
             is intentionally empty. */}
        <Suspense fallback={null}>
          <GoogleAuthErrorSurface />
        </Suspense>
        <PageViewTracker />
        <CartUnavailableNotice />
        <ProductCardLabelsProvider data={productCardLabels}>
          <SignInLabelsProvider data={signInLabels}>
            <CreateAccountLabelsProvider data={createAccountLabels}>
              <InterfaceControlsLabelsProvider data={interfaceControlsLabels}>
                <YourBagLabelsProvider data={yourBagLabels}>
                  <FooterMenuProvider data={footerMenu}>
                    <HeaderMenuProvider data={headerMenu}>
                      <SignUpFormSchemaProvider data={signUpFormSchema}>
                        <ErrorBoundary>{children}</ErrorBoundary>
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
