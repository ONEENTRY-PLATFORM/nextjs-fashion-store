import type { Metadata, Viewport } from 'next'
import { locale } from 'next/root-params'
import { Suspense } from 'react'
import '../globals.css'
import { Providers } from '../../src/app/components/system/Providers'
import { ScrollToTop } from '../../src/app/components/system/ScrollToTop'
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL, OG_IMAGE, TWITTER_HANDLE } from '../../src/app/data/seoData'
import { A11Y_LABELS } from '../../src/app/data/commonLabels'
// One dictionary for the whole storefront: every attribute marker the CMS
// knows, flattened to `marker → value`. Screens no longer carry their own
// label set — see `src/lib/oneentry/dictionary.ts`.
import { getDictionary } from '../../src/lib/oneentry/dictionary'
import { loadMenu } from '../../src/lib/oneentry/menus/menus'
import { loadSignUpFormSchema } from '../../src/lib/oneentry/auth/sign-up-form'
// Footer newsletter renders on every route, so its OE form travels with the
// root layout rather than a per-page provider.
import { loadFormContent } from '../../src/lib/oneentry/forms/placeholders'
import { loadLocales } from '../../src/lib/oneentry/locales'
import {
  DEFAULT_SHORT_LOCALE,
  SHORT_LOCALES,
  buildLanguageAlternates,
  htmlLang,
} from '../../src/lib/oneentry/locale'

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
    // One entry per routed locale, plus `x-default` pointing at the unprefixed
    // default. Built from the locale list so enabling a locale cannot leave a
    // stale hreflang behind.
    languages: buildLanguageAlternates(SITE_URL),
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

/**
 * One static branch per routed locale. Reads the same list as `proxy.ts`, so a
 * locale enabled in `NEXT_PUBLIC_LOCALES` gets its pages generated on the next
 * build with no code change.
 * @returns {Array<{locale: string}>} Locale params to prerender.
 */
export function generateStaticParams(): Array<{ locale: string }> {
  return SHORT_LOCALES.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Root parameter: readable from any Server Component without prop drilling,
  // and — unlike `headers()` — it does not opt the tree into dynamic rendering.
  const shortLocale = (await locale()) ?? DEFAULT_SHORT_LOCALE;
  const [
    dict,
    footerMenu,
    headerMenu,
    signUpFormSchema,
    subscribeForm,
    reviewFeedbackForm,
    reviewRatingForm,
    cmsLocales,
  ] = await Promise.all([
    getDictionary(),
    loadMenu('footer'),
    loadMenu('header'),
    loadSignUpFormSchema(),
    loadFormContent('subscribe_new_drops'),
    // Review copy lives on the OE forms themselves (labels, option list,
    // success/failure messages), so the modal reads it from there rather than
    // from a system-text set. Loaded here because `FormPlaceholdersProvider`
    // is a single map — a nested provider on the PDP would drop the
    // newsletter form's copy for that subtree.
    loadFormContent('review_feedback'),
    loadFormContent('review_rating'),
    loadLocales(),
  ]);
  return (
    <html lang={htmlLang(shortLocale)}>
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
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-9999 focus:px-4 focus:py-2 focus:bg-black focus:text-white focus:text-xs focus:tracking-widest focus:uppercase"
        >
          {A11Y_LABELS.skipToContent}
        </a>
        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>
        <Providers
          dict={dict}
          footerMenu={footerMenu?.pages ?? []}
          headerMenu={headerMenu?.pages ?? []}
          signUpFormSchema={signUpFormSchema}
          forms={{
            subscribe_new_drops: subscribeForm,
            review_feedback: reviewFeedbackForm,
            review_rating: reviewRatingForm,
          }}
          cmsLocales={cmsLocales}
        >
          {children}
        </Providers>
      </body>
    </html>
  )
}
