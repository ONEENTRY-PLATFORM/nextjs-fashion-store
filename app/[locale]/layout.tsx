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
import { A11Y_LABELS } from '@/app/data/commonLabels';
import { OG_IMAGE, SITE_URL } from '@/app/data/seoData';
import { loadSignUpFormSchema } from '@/lib/oneentry/auth/sign-up-form';
// One dictionary for the whole storefront: every attribute marker the CMS
// knows, flattened to `marker → value`. Screens no longer carry their own
// label set — see `src/lib/oneentry/dictionary.ts`.
import { getDictionary, getSiteSettings } from '@/lib/oneentry/dictionary';
// Site-wide OE forms only. Everything here renders on every route, so the copy
// travels with the root layout rather than a per-page provider; route-scoped
// forms mount their own `FormPlaceholdersProvider` next to the page that needs
// them (see `app/[locale]/product/[id]/page.tsx`, `account`, `checkout`).
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

/**
 * The storefront's typeface.
 *
 * Loaded through `next/font` rather than the remote `@import` that used to sit
 * at the top of `globals.css`: Tailwind v4 strips remote imports from the built
 * CSS, so that request was never made and every screen rendered in the system
 * sans while asking for Inter. `next/font` self-hosts the files, which also
 * removes two cross-origin handshakes from the critical path, and publishes the
 * family as `--font-inter` — wired to Tailwind's `font-sans` in `globals.css`.
 */
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

/**
 * Root metadata. A function rather than a constant so `og:locale` can name the
 * locale actually being served — a German page advertising `en_GB` is worse
 * than no tag, because crawlers trust it over the visible copy.
 *
 * @returns Site-wide metadata for the rendering locale.
 */
export async function generateMetadata(): Promise<Metadata> {
  const shortLocale = (await locale()) ?? DEFAULT_SHORT_LOCALE;
  // Brand name, description, share-image alt and the X handle are editor-owned
  // (OE `site_settings`); the origin is not — see `SITE_URL`.
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
      // OE code (`en_US`, `de_DE`) is already the underscore form Open Graph
      // wants — the hyphenated `htmlLang` spelling belongs to `<html lang>`.
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
      // Self-referencing per locale: the German homepage must not declare the
      // English one as its canonical, or the translation drops out of the index.
      canonical: `${SITE_URL}${localizeHref('/', shortLocale) === '/' ? '' : localizeHref('/', shortLocale)}`,
      // One entry per routed locale, plus `x-default` pointing at the unprefixed
      // default. Built from the locale list so enabling a locale cannot leave a
      // stale hreflang behind.
      languages: buildLanguageAlternates(SITE_URL),
    },
    // Only files that exist. The list used to name three PNGs under
    // `/icons/` that were never committed; because a missing route still
    // answers 200 with the not-found *page*, every visit downloaded ~28 KB of
    // gzipped HTML as its favicon — on a high-priority connection, in the
    // middle of the LCP window. `app/icon.svg` and `app/favicon.ico` are real,
    // and Next serves both from its file conventions.
    icons: {
      icon: [
        { url: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
        { url: '/favicon.ico', sizes: '48x48' },
      ],
      shortcut: '/favicon.ico',
    },
  };
}

/**
 * One static branch per routed locale. Reads the same list as `proxy.ts`, so a
 * locale switched on in the OneEntry project settings gets its pages generated
 * on the next build with no code change.
 *
 * @returns Locale params to prerender.
 */
export function generateStaticParams(): Array<{ locale: string }> {
  return SHORT_LOCALES.map((locale) => ({ locale }));
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Root parameter: readable from any Server Component without prop drilling,
  // and — unlike `headers()` — it does not opt the tree into dynamic rendering.
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
    // Same dictionary underneath, parsed: the palette below has to be written
    // into the document, and the currency has to be installed for the server
    // formatters, before anything renders.
    getSiteSettings(),
    loadMenu('footer'),
    // The footer's link columns live in `bottom_menu` (grouping custom items
    // with the info pages under them); `footer` holds the flat legal row. They
    // stay separate all the way to the component — a column whose links an
    // editor has not filled in yet is childless, and merging the two would let
    // it fall through into the legal row.
    loadMenu('bottom_menu'),
    loadMenu('header'),
    loadSignUpFormSchema(),
    // Footer newsletter — rendered on every route.
    loadFormContent('subscribe_new_drops'),
    // Review copy lives on the OE forms themselves (labels, option list,
    // success/failure messages), so the modal reads it from there rather than
    // from a system-text set. Site-wide because `WriteReviewModal` opens from
    // `QuickViewModal` as well, and the header mounts that one on every route —
    // not only from the PDP.
    loadFormContent('review_feedback'),
    loadFormContent('review_rating'),
    loadLocales(),
  ]);
  return (
    // The brand palette rides on `<html>` as custom properties. Server-rendered
    // rather than injected by a client effect, so a CMS colour is in force on
    // the very first paint instead of replacing the shipped one a frame later.
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
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-9999 focus:bg-black focus:px-4 focus:py-2 focus:text-xs focus:tracking-widest focus:text-white focus:uppercase"
        >
          {A11Y_LABELS.skipToContent}
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
