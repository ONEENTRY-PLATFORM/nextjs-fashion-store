/**
 * Info / About page UI copy.
 * Stats strip displayed across all info-content pages.
 */
export const INFO_PAGE_DEMO_NOTICE = {
  demoPageStrong: 'Demo page',
  demoPageMid: '— This content is managed through the',
  platformStrong: 'OneEntry Platform',
  platformSuffix: '. Edit text, images and layout from your dashboard — no code required.',
} as const;

export const INFO_PAGE_SCHEMA = {
  hubTitle: 'Content Hub',
  breadcrumbHome: 'Home',
  breadcrumbInfo: 'Info',
} as const;

export const INFO_PAGE_HERO = {
  breadcrumbHome: 'Home',
  breadcrumbCurrent: 'Info',
  heroImageAlt: 'Kekimoro editorial',
  heading: 'About Kekimoro',
  subtitle: 'Our story, our values, delivery, returns, sizing and more — everything you need to know.',
} as const;

export const INFO_PAGE_CTA = {
  exploreOneEntryShort: 'Explore OneEntry →',
  exploreOneEntryHref: 'https://oneentry.cloud',
  leadParagraph:
    'Kekimoro was born from a simple belief: great style should never come at the expense of quality or conscience. ' +
    "Below you'll find everything about who we are, how we work, and how we can help — all managed and updated in real time through the OneEntry Platform.",
  ctaEyebrow: 'Powered by OneEntry Platform',
  ctaHeading: 'This entire page is editable from the dashboard',
  ctaBody:
    'Every section above — headings, body text, images, layout order — is stored in the OneEntry Platform and can be updated ' +
    'by your marketing team in real time, with no code changes and no redeployment required.',
  ctaExplorePlatform: 'Explore OneEntry Platform',
  ctaSdkDocs: 'View SDK Docs',
  ctaSdkDocsHref: 'https://js-sdk.oneentry.cloud/docs/index/',
} as const;

export const INFO_PAGE_SECTIONS = [
  {
    eyebrow: 'About Us',
    heading: 'Fashion Crafted with Purpose',
    body: "Founded in London in 2015, Kekimoro started as a small boutique with a curated edit of contemporary European designers. A decade later, we've grown into a global platform serving customers in over 40 countries — our obsession with quality and fit has never wavered.\n\nEvery piece in our collection is hand-selected by our in-house buying team, who travel to fashion weeks in Paris, Milan, Copenhagen and New York to discover the most forward-thinking designers alongside our own Kekimoro label.",
    image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=900&q=80',
    imageAlt: 'Fashion boutique with curated clothing',
    imageRight: false,
  },
  {
    eyebrow: 'Sustainability',
    heading: 'Our Values, Our Responsibility',
    body: 'Over 60% of our collections are made from certified sustainable materials — organic cotton, recycled fibres, and traceable natural fabrics. We partner only with manufacturers who meet our strict social and environmental standards.\n\nOur packaging is 100% recyclable, our London warehouse runs on renewable energy, and our carbon offset programme covers every shipment we send worldwide.',
    image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=900&q=80',
    imageAlt: 'Sustainable fabric production',
    imageRight: true,
  },
  {
    eyebrow: 'Delivery & Returns',
    heading: 'Fast Shipping. Hassle-Free Returns.',
    body: "Standard delivery in 3–5 working days, free on orders over £50. Next-day express available. We ship to 50+ countries worldwide.\n\nNot happy with your order? Return any item within 30 days for a full refund — no questions asked. Start a return from your account in seconds, and we'll email a prepaid label immediately.",
    image: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=900&q=80',
    imageAlt: 'Parcel delivery and logistics',
    imageRight: false,
  },
  {
    eyebrow: 'Sizing & Care',
    heading: 'Find Your Perfect Fit, Keep It for Years',
    body: 'Getting the right size matters. Every product page includes a detailed size chart and model measurements so you can order with confidence. When in doubt, our style team is available via live chat.\n\nGreat care extends the life of every garment. Wash at low temperatures, store knitwear folded, and follow the care label for each fabric type. The most sustainable item is the one you keep for years.',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80',
    imageAlt: 'Clothing care and sizing',
    imageRight: true,
  },
] as const;

export const INFO_PAGE_FEATURE_CARDS = [
  {
    iconKey: 'edit' as const,
    title: 'Edit Any Content',
    desc: 'Update headings, paragraphs, images and entire sections directly from the OneEntry dashboard. No developer needed.',
  },
  {
    iconKey: 'layout' as const,
    title: 'Flexible Layouts',
    desc: 'Rearrange sections, change image positions and customise the page structure through a visual interface.',
  },
  {
    iconKey: 'zap' as const,
    title: 'Instant Publish',
    desc: 'Changes go live the moment you save them — no build process, no deployments, no waiting.',
  },
  {
    iconKey: 'globe' as const,
    title: 'Multi-Language',
    desc: 'Manage content in every language your customers speak, all from one unified dashboard.',
  },
] as const;

export const INFO_PAGE_LABELS = {
  stats: [
    { value: '40+',     label: 'Countries Shipped' },
    { value: '120+',    label: 'Partner Brands' },
    { value: '30 days', label: 'Free Returns' },
    { value: '24 / 7',  label: 'Customer Support' },
  ] as const,
} as const;
