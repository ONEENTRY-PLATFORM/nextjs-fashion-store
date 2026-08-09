import '../globals.css';

import type { Metadata, Viewport } from 'next';
import { locale } from 'next/root-params';
import { Suspense } from 'react';

import { Providers } from '@/app/components/system/Providers';
import { ScrollToTop } from '@/app/components/system/ScrollToTop';
import { A11Y_LABELS } from '@/app/data/commonLabels';
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL, TWITTER_HANDLE } from '@/app/data/seoData';
import { loadSignUpFormSchema } from '@/lib/oneentry/auth/sign-up-form';
// One dictionary for the whole storefront: every attribute marker the CMS
// knows, flattened to `marker → value`. Screens no longer carry their own
// label set — see `src/lib/oneentry/dictionary.ts`.
import { getDictionary } from '@/lib/oneentry/dictionary';
// Site-wide OE forms only. Everything here renders on every route, so the copy
// travels with the root layout rather than a per-page provider; route-scoped
// forms mount their own `FormPlaceholdersProvider` next to the page that needs
// them (see `app/[locale]/product/[id]/page.tsx`, `account`, `checkout`).
import { loadFormContent } from '@/lib/oneentry/forms/placeholders';
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
  return {
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    metadataBase: new URL(SITE_URL),
    openGraph: {
      siteName: SITE_NAME,
      // OE code (`en_US`, `de_DE`) is already the underscore form Open Graph
      // wants — the hyphenated `htmlLang` spelling belongs to `<html lang>`.
      locale: toCmsLocale(shortLocale),
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
      // Self-referencing per locale: the German homepage must not declare the
      // English one as its canonical, or the translation drops out of the index.
      canonical: `${SITE_URL}${localizeHref('/', shortLocale) === '/' ? '' : localizeHref('/', shortLocale)}`,
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
      apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
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
    <html lang={htmlLang(shortLocale)}>
      <head>
        {/* The dev-only performance.measure guard that used to sit here now
            lives in `instrumentation-client.ts`: a locale switch re-renders
            this layout on the client, and React never executes a `<script>`
            it renders there — it only warns about it. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body>
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
          {children}
        </Providers>
      </body>
    </html>
  );
}
