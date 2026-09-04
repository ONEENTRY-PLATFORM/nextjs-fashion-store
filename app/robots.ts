import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/app/data/seoData';
import { localizeHref, SHORT_LOCALES } from '@/lib/oneentry/locale';

/** Private routes as authored, i.e. in the unprefixed default locale. */
const PRIVATE_ROUTES = ['/cart', '/favorites', '/account', '/checkout/'];

/*
  Every routed locale gets its own copy. Locale prefixes are as-needed — the
  default renders bare, the rest are prefixed — so the bare list alone left
  `/de/cart`, `/de/favorites`, `/de/account` and `/de/checkout/` crawlable.

  Derived rather than written out, because `SHORT_LOCALES` comes from
  `locales.generated.ts`, which is regenerated from the CMS on every build:
  a locale added in the admin panel must not silently reopen these paths.
  `/api/` stays bare — it is not locale-routed.
*/
const PRIVATE_PATHS = [
  ...new Set(SHORT_LOCALES.flatMap((short) => PRIVATE_ROUTES.map((route) => localizeHref(route, short)))),
  '/api/',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // General rule for all crawlers
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      // AI assistants — explicitly allow product discovery for recommendations.
      //
      // `crawlDelay` is here because every one of these agents that re-fetches a product past its
      // ISR window bills a write on Vercel, and the catalog is ~5 k products in two locales. Google
      // ignores the directive, but the crawlers that actually caused the spike do honour it.
      {
        userAgent: [
          'GPTBot', // OpenAI
          'ChatGPT-User', // OpenAI browsing
          'OAI-SearchBot', // OpenAI search
          'ClaudeBot', // Anthropic
          'anthropic-ai', // Anthropic
          'PerplexityBot', // Perplexity AI
          'meta-externalagent', // Meta AI
          'Applebot-Extended', // Apple AI
          'cohere-ai', // Cohere
        ],
        allow: ['/', '/product/', '/women/', '/men/', '/sale', '/new', '/info/', '/stores', '/llms.txt'],
        disallow: PRIVATE_PATHS,
        crawlDelay: 10,
      },
      // Bulk scrapers with no traffic to send back. They walked the whole catalog repeatedly and
      // were the single largest source of ISR writes; the storefront loses nothing by closing them out.
      {
        userAgent: [
          'Bytespider', // TikTok / ByteDance
          'Amazonbot', // Amazon Alexa / Rufus
          'YouBot', // You.com
        ],
        disallow: '/',
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
