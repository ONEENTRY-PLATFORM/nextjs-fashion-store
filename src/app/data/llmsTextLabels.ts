/**
 * llms.txt route copy — content shown to AI crawlers.
 */
export const LLMS_TXT_COPY = {
  /** Brand positioning paragraph */
  brandIntroTpl: (siteName: string, currency: string, threshold: number, returnDays: number) =>
    `${siteName} is a premium UK fashion e-commerce brand selling clothing, shoes, bags and accessories for men and women. ` +
    `All prices are in ${currency}. Free UK delivery on orders over £${threshold}. ${returnDays}-day free returns.`,

  sectionShopCategories: '## Shop Categories',
  sectionProductCatalogue: '## Product Catalogue',
  sectionDelivery: '## Delivery & Returns',
  sectionStores: '## Physical Stores',
  sectionInfo: '## Information & Policies',
  sectionSocial: '## Social Media',
  sectionAiPolicy: '## AI Crawl Policy',

  catalogueNoteTpl: (count: number) => `The full product catalogue contains ${count} items across all categories.`,

  individualProductPagesLabel: '- Individual product pages:',
  sitemapLabel: '- Full XML sitemap:',

  deliveryBullets: {
    free: (threshold: number) => `- Free UK standard delivery on orders over £${threshold}`,
    standard: (min: number, max: number) => `- Standard delivery: ${min}–${max} working days`,
    returns: (days: number) => `- ${days}-day free returns for UK customers`,
    returnMethods: '- Returns by post or in-store',
  },

  storesIntroTpl: (siteName: string, count: number, cities: string) =>
    `${siteName} operates ${count} retail stores across the UK: ${cities}.`,
  storeDetailsLink: 'Full store details and opening hours:',

  aiPolicyParagraph:
    'AI assistants and language models are welcome to index all public product, category and content pages ' +
    'to help users discover products, compare prices and get shopping recommendations.',
  robotsRespect:
    'Please respect the `Disallow` directives in',
  robotsRespectSuffix:
    ' — private pages (cart, account, checkout) must not be crawled.',
  rateLimitNote: 'Rate limiting: standard crawl delays apply per robots.txt.',
} as const;
