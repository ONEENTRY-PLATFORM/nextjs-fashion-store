import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { Providers } from '../src/app/components/Providers'
import { ScrollToTop } from '../src/app/components/ScrollToTop'
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL, OG_IMAGE, TWITTER_HANDLE } from '../src/app/data/seoData'
import { A11Y_LABELS } from '../src/app/data/commonLabels'
import { loadProductCardSystemTexts } from '../src/lib/oneentry/labels/product-card-labels'
import { loadSignInSystemTexts } from '../src/lib/oneentry/labels/sign-in-labels'
import { loadCreateAccountSystemTexts } from '../src/lib/oneentry/labels/create-account-labels'
import { loadInterfaceControlsSystemTexts } from '../src/lib/oneentry/labels/interface-controls-labels'
import { loadYourBagSystemTexts } from '../src/lib/oneentry/labels/your-bag-labels'
import { loadMenu } from '../src/lib/oneentry/menus/menus'
import { loadSignUpFormSchema } from '../src/lib/oneentry/auth/sign-up-form'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#111111',
}

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    siteName: SITE_NAME,
    locale: 'en_GB',
    type: 'website',
    images: [OG_IMAGE],
  },
  twitter: {
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
    card: 'summary_large_image',
    images: [OG_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      'en-GB': SITE_URL,
      'x-default': SITE_URL,
    },
  },
  icons: {
    icon: [
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [
    productCardLabels,
    signInLabels,
    createAccountLabels,
    interfaceControlsLabels,
    yourBagLabels,
    footerMenu,
    signUpFormSchema,
  ] = await Promise.all([
    loadProductCardSystemTexts(),
    loadSignInSystemTexts(),
    loadCreateAccountSystemTexts(),
    loadInterfaceControlsSystemTexts(),
    loadYourBagSystemTexts(),
    loadMenu('footer'),
    loadSignUpFormSchema(),
  ]);
  return (
    <html lang="en-GB">
      <head>
        {process.env.NODE_ENV !== 'production' && (
          // Swallows a React 19 dev-build regression where the Components
          // performance track calls performance.measure() with a negative
          // start timestamp during first hydration of App Router pages,
          // producing an uncaught TypeError. Production builds are unaffected
          // because react-dom-client.production.js does not emit these marks.
          <script
            dangerouslySetInnerHTML={{
              __html:
                "(function(){if(typeof performance==='undefined'||!performance.measure)return;var o=performance.measure.bind(performance);performance.measure=function(n,a,b){try{return o(n,a,b);}catch(e){if(e&&e.name==='TypeError'&&/negative time stamp/i.test(e.message))return;throw e;}};})();",
            }}
          />
        )}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-black focus:text-white focus:text-xs focus:tracking-widest focus:uppercase"
        >
          {A11Y_LABELS.skipToContent}
        </a>
        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>
        <Providers
          productCardLabels={productCardLabels}
          signInLabels={signInLabels}
          createAccountLabels={createAccountLabels}
          interfaceControlsLabels={interfaceControlsLabels}
          yourBagLabels={yourBagLabels}
          footerMenu={footerMenu?.pages ?? []}
          signUpFormSchema={signUpFormSchema}
        >
          {children}
        </Providers>
      </body>
    </html>
  )
}
