/** Footer copy, overlaid from the OE `footer` set as `footer_<snake_case_key>`. */
export const FOOTER_COPY = {
  acceptedPaymentMethods: 'Accepted Payment Methods',
  followUs: 'Follow Us',
  customerSupport: 'Customer Support:',
  newsletterHeading: 'Subscribe to new drops',
  companyDescription: 'Premium fashion for men and women. Curated collections with fast worldwide delivery.',
  supportPhone: '+44 20 7946 0958',
  copyright: '© 2026 KEKIMORO. All rights reserved.',
  /** Four support cards — a fixed layout slot, hence numbered keys. */
  support1Title: 'HELP CENTER',
  support1Desc: 'Find answers online anytime',
  support2Title: 'TEXT US',
  support2Desc: '24/7 Support',
  support3Title: 'LIVE CHAT',
  support3Desc: '24/7 Support Chat',
  support4Title: 'EMAIL US',
  support4Desc: 'Submit via our inquiry form',
  /** Destinations only — the network name keys the icon asset and stays in code. */
  socialTiktok: 'https://www.tiktok.com/@oneentryfashion',
  socialFacebook: 'https://www.facebook.com/oneentryfashion',
  socialInstagram: 'https://www.instagram.com/oneentryfashion',
  socialYoutube: 'https://www.youtube.com/@oneentryfashion',
  socialPinterest: 'https://www.pinterest.com/oneentryfashion',
  ariaLegalLinks: 'Legal links',
  /** `%network%` — the social network's display name. */
  ariaFollowOn: 'Follow us on %network%',
} as const;

/** Icon assets are keyed by network name, so the order here is the render order. */
export const SOCIAL_NETWORKS = ['TikTok', 'Facebook', 'Instagram', 'YouTube', 'Pinterest'] as const;
