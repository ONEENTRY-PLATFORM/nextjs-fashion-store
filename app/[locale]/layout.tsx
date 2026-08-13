import '../globals.css';

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { locale } from 'next/root-params';
import { Suspense } from 'react';

import { Footer } from '@/app/components/footer/Footer';
import { Header } from '@/app/components/header/Header';
import { PageContent, TransitionProvider } from '@/app/components/system/PageTransition';
import { Providers } from '@/app/components/system/Providers';
import { ScrollToTop } from '@/app/components/system/ScrollToTop';
import { OG_IMAGE, SITE_URL } from '@/app/data/seoData';
import { loadSignUpFormSchema } from '@/lib/oneentry/auth/sign-up-form';
// One dictionary for the whole storefront: every attribute marker the CMS knows, flattened to `marker → value`. Screens no longer carry their own label set.
import { getDictionary, getSiteSettings, translate } from '@/lib/oneentry/dictionary';
// Site-wide OE forms only.
import { loadFormContent } from '@/lib/oneentry/forms/placeholders';
import { CMS_MEDIA_ORIGIN } from '@/lib/oneentry/index';
import {
  buildLanguageAlternates,
  DEFAULT_SHORT_LOCALE,
  htmlLang,
  localizeHref,
  SHORT_LOCALES,
  toCmsLocale,
} from '@/lib/oneentry/locale';
import { loadLocales } from '@/lib/oneentry/locales';
import { loadMenu } from '@/lib/oneentry/menus/menus';
import { themeCssVariables } from '@/lib/oneentry/site-settings';

export const A11Y_LABELS = {
  skipToContent: 'Skip to content',
  errorLoadingImage: 'Error loading image',
} as const;

/** The storefront's typeface. */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#111111',
};

/** Root metadata. */
export async function generateMetadata(): Promise<Metadata> {
  const shortLocale = (await locale()) ?? DEFAULT_SHORT_LOCALE;
  // Brand name, description, share-image alt and the X handle are editor-owned (OE `site_settings`); the origin is not — see `SITE_URL`.
  const { brand, og } = await getSiteSettings();
  return {
    title: {
      default: brand.siteName,
      template: `%s | ${brand.siteName}`,
    },
    description: brand.siteDescription,
    metadataBase: new URL(SITE_URL),
    openGraph: {
      siteName: brand.siteName,
      // OE code (`en_US`, `de_DE`) is already the underscore form Open Graph wants — the hyphenated `htmlLang` spelling belongs to `<html lang>`.
      locale: toCmsLocale(shortLocale),
      type: 'website',
      images: [{ ...OG_IMAGE, alt: og.imageAlt }],
    },
    twitter: {
      site: brand.twitterHandle,
      creator: brand.twitterHandle,
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
      // Self-referencing per locale: the German homepage must not declare the English one as its canonical, or the translation drops out of the index.
      canonical: `${SITE_URL}${localizeHref('/', shortLocale) === '/' ? '' : localizeHref('/', shortLocale)}`,
      // One entry per routed locale, plus `x-default` pointing at the unprefixed default.
      languages: buildLanguageAlternates(SITE_URL),
    },
    // Only files that exist.
    icons: {
      icon: [
        { url: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
        { url: '/favicon.ico', sizes: '48x48' },
      ],
      shortcut: '/favicon.ico',
    },
  };
}

/** One static branch per routed locale. */
export function generateStaticParams(): Array<{ locale: string }> {
  return SHORT_LOCALES.map((locale) => ({ locale }));
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Root parameter: readable from any Server Component without prop drilling, and — unlike `headers()` — it does not opt the tree into dynamic rendering.
  const shortLocale = (await locale()) ?? DEFAULT_SHORT_LOCALE;
  const [
    dict,
    siteSettings,
    footerMenu,
    bottomMenu,
    headerMenu,
    signUpFormSchema,
    subscribeForm,
    reviewFeedbackForm,
    reviewRatingForm,
    cmsLocales,
  ] = await Promise.all([
    getDictionary(),
    // Same dictionary underneath, parsed: the palette below has to be written into the document, and the currency has to be installed for the server formatters, before anything renders.
    getSiteSettings(),
    loadMenu('footer'),
    // The footer's link columns live in `bottom_menu` (grouping custom items with the info pages under them); `footer` holds the flat legal row.
    loadMenu('bottom_menu'),
    loadMenu('header'),
    loadSignUpFormSchema(),
    // Footer newsletter — rendered on every route.
    loadFormContent('subscribe_new_drops'),
    // Review copy lives on the OE forms themselves (labels, option list, success/failure messages), so the modal reads it from there rather than from a system-text set.
    loadFormContent('review_feedback'),
    loadFormContent('review_rating'),
    loadLocales(),
  ]);
  return (
    // The brand palette rides on `<html>` as custom properties.
    <html
      lang={htmlLang(shortLocale)}
      className={inter.variable}
      style={themeCssVariables(siteSettings.theme) as React.CSSProperties}
    >
      <head>
        {/* The dev-only performance.measure guard that used to sit here now
            lives in `instrumentation-client.ts`: a locale switch re-renders
            this layout on the client, and React never executes a `<script>`
            it renders there — it only warns about it. */}
        {/* The CMS media origin serves every photo on the site, the LCP hero
            included, so its connection is worth opening before the parser gets
            to the first `<img>`. The Google Fonts hints that used to sit here
            were removed: Tailwind v4 strips the remote `@import` in
            `globals.css` at build time, so no request is ever made to those
            origins and the two handshakes were pure overhead. Unsplash keeps
            the DNS hint only — it is a fallback source used by a handful of
            routes, never on the pages that matter for LCP. */}
        {CMS_MEDIA_ORIGIN ? <link rel="preconnect" href={CMS_MEDIA_ORIGIN} /> : null}
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      {/* Column layout so the persistent chrome (header, footer) frames a
          content area that grows to fill the viewport — pages no longer carry
          their own `min-h-screen`, which would now stack on top of the chrome
          instead of containing it. */}
      <body className="flex min-h-screen flex-col bg-white font-sans">
        <a
          href="#main-content"
          data-testid="skip-to-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-9999 focus:bg-black focus:px-4 focus:py-2 focus:text-xs focus:tracking-widest focus:text-white focus:uppercase"
        >
          {translate(dict, 'header_aria_skip_to_content', A11Y_LABELS.skipToContent)}
        </a>
        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>
        <Providers
          dict={dict}
          footerMenu={footerMenu?.pages ?? []}
          footerColumnsMenu={bottomMenu?.pages ?? []}
          headerMenu={headerMenu?.pages ?? []}
          signUpFormSchema={signUpFormSchema}
          forms={{
            subscribe_new_drops: subscribeForm,
            review_feedback: reviewFeedbackForm,
            review_rating: reviewRatingForm,
          }}
          cmsLocales={cmsLocales}
        >
          {/* Persistent chrome. It used to be rendered by every page component,
              so each navigation unmounted and remounted it — the header blinked
              out, the route skeleton painted a grey bar in its place, and the
              layout jumped. Mounted here it survives navigations untouched, and
              only the content between them animates (`PageContent`). The
              provider sits above the chrome so header/footer links and
              programmatic `router.push` calls run through the same
              leave/enter sequence. */}
          <TransitionProvider>
            <Header />
            <PageContent>{children}</PageContent>
            <Footer />
          </TransitionProvider>
        </Providers>
      </body>
    </html>
  );
}
