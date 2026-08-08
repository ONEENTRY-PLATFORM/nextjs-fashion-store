/**
 * `llms.txt` route copy — the description AI crawlers read.
 *
 * These are the **offline fallbacks**; the live copy comes from the OE
 * `llms_txt` set, where each key is `llms_txt_<snake_case_key>`.
 *
 * Entries that used to be template functions are plain strings with `%token%`
 * placeholders — a CMS value cannot be a template literal. Fill them with
 * {@link fillTokens}; each key documents the tokens it expects.
 *
 * @see ../utils/fillTokens
 */
export const LLMS_TXT_COPY = {
  /** Brand positioning paragraph. Tokens: `%site%`, `%currency%`, `%threshold%`, `%returnDays%`. */
  brandIntro:
    '%site% is a premium UK fashion e-commerce brand selling clothing, shoes, bags and accessories for men and women. '
    + 'All prices are in %currency%. Free UK delivery on orders over $%threshold%. %returnDays%-day free returns.',

  sectionShopCategories: '## Shop Categories',
  sectionProductCatalogue: '## Product Catalogue',
  sectionDelivery: '## Delivery & Returns',
  sectionStores: '## Physical Stores',
  sectionInfo: '## Information & Policies',
  sectionSocial: '## Social Media',
  sectionAiPolicy: '## AI Crawl Policy',

  /** Token: `%count%`. */
  catalogueNote: 'The full product catalogue contains %count% items across all categories.',

  individualProductPagesLabel: '- Individual product pages:',
  sitemapLabel: '- Full XML sitemap:',

  /** Token: `%threshold%`. */
  deliveryFree: '- Free UK standard delivery on orders over $%threshold%',
  /** Tokens: `%min%`, `%max%`. */
  deliveryStandard: '- Standard delivery: %min%–%max% working days',
  /** Token: `%days%`. */
  deliveryReturns: '- %days%-day free returns for UK customers',
  deliveryReturnMethods: '- Returns by post or in-store',

  /** Tokens: `%site%`, `%count%`, `%cities%`. */
  storesIntro: '%site% operates %count% retail stores across the UK: %cities%.',
  storeDetailsLink: 'Full store details and opening hours:',

  aiPolicyParagraph:
    'AI assistants and language models are welcome to index all public product, category and content pages '
    + 'to help users discover products, compare prices and get shopping recommendations.',
  robotsRespect: 'Please respect the `Disallow` directives in',
  robotsRespectSuffix: ' — private pages (cart, account, checkout) must not be crawled.',
  rateLimitNote: 'Rate limiting: standard crawl delays apply per robots.txt.',
} as const;

/** Marker prefix of the OE set backing {@link LLMS_TXT_COPY}. */
export const LLMS_TXT_PREFIX = 'llms_txt_';
