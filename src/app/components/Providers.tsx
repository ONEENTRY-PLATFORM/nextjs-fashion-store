'use client'

import React, { useRef, useEffect } from 'react';
import { Provider } from 'react-redux';
import { AuthProvider } from '../context/AuthContext'
import { makeStore, loadCatalogFromStorage, type AppStore } from '../store'
import { hydrateCatalogs, type CatalogsState } from '../store/catalogSlice'
import { useAuth } from '../context/AuthContext'
import { ServiceWorkerRegistrar } from './ServiceWorkerRegistrar'
import { ErrorBoundary } from './ErrorBoundary'
import { PageViewTracker } from './PageViewTracker'
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
 * No-op placeholder kept for backwards compatibility. The real wishlist
 * hydration now happens in `WishlistContext` from /me/wishlist via
 * `useAuth().user.wishlistItems`. The mock USER_DATASET.wishlist injection
 * was removed so the account tab never shows fake products.
 */
function WishlistSyncEffect() {
  const { isLoggedIn } = useAuth();
  void isLoggedIn;

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
        <PageViewTracker />
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
