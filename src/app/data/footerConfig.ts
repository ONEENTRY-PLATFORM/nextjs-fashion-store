export interface FooterLink {
  label: string;
  href: string;
}

export const FOOTER_LINKS: Record<string, FooterLink[]> = {
  'About Company': [
    { label: 'Sitemap',             href: '/info/sitemap' },
    { label: 'About Us',            href: '/info/about-us' },
    { label: 'Rewards',             href: '/info/rewards' },
    { label: 'Store Locator',       href: '/stores' },
    { label: 'Terms',               href: '/info/terms' },
    { label: 'Privacy Policy',      href: '/info/privacy-policy' },
    { label: 'Security',            href: '/info/security' },
    { label: 'Accessibility',       href: '/info/accessibility' },
    { label: 'User Content Policy', href: '/info/user-content-policy' },
  ],
  'Service': [
    { label: 'Gift Certificates', href: '/info/gift-certificates' },
    { label: 'Refer a Friend',    href: '/info/refer-a-friend' },
    { label: 'Corporate',         href: '/info/corporate' },
    { label: 'Careers',           href: '/info/careers' },
  ],
  'Help': [
    { label: 'FAQ',          href: '/info/faq' },
    { label: 'Track Order',  href: '/info/track-order' },
    { label: 'Delivery',     href: '/info/delivery' },
    { label: 'Exchange',     href: '/info/exchange' },
    { label: 'Sizing Guide', href: '/info/sizing-guide' },
    { label: 'Care Guide',   href: '/info/care-guide' },
  ],
  'Customer Support': [
    { label: 'Help Center', href: '/info/help-center' },
    { label: 'E-mail Us',   href: '/info/contact' },
    { label: 'Live Chat',   href: '/info/contact' },
    { label: 'Call Us',     href: '/info/contact' },
  ],
};

export const PAYMENT_METHOD_NAMES = [
  'Visa', 'Mastercard', 'Amex', 'Maestro',
  'Apple Pay', 'Google Pay', 'PayPal', 'Klarna',
];

export const SOCIAL_LINKS = [
  { name: 'TikTok',    href: 'https://www.tiktok.com/@oneentryfashion' },
  { name: 'Facebook',  href: 'https://www.facebook.com/oneentryfashion' },
  { name: 'Instagram', href: 'https://www.instagram.com/oneentryfashion' },
  { name: 'YouTube',   href: 'https://www.youtube.com/@oneentryfashion' },
  { name: 'Pinterest', href: 'https://www.pinterest.com/oneentryfashion' },
];

export const SUPPORT_ITEMS = [
  { iconKey: 'question', title: 'HELP CENTER',  desc: 'Find answers online anytime' },
  { iconKey: 'phone',    title: 'TEXT US',       desc: '24/7 Support' },
  { iconKey: 'chat',     title: 'LIVE CHAT',     desc: '24/7 Support Chat' },
  { iconKey: 'email',    title: 'EMAIL US',      desc: 'Submit via our inquiry form' },
];

interface BottomLink {
  label: string;
  href: string;
}

export const BOTTOM_LINKS: BottomLink[] = [
  { label: 'Sitemap',        href: '/info/sitemap' },
  { label: 'Terms of Sale',  href: '/info/terms-of-sale' },
  { label: 'Terms of Use',   href: '/info/terms-of-use' },
  { label: 'Privacy Policy', href: '/info/privacy-policy' },
  { label: 'Promo Terms',    href: '/info/promo-terms' },
];

export const COMPANY_INFO = {
  description: 'Premium fashion for men and women. Curated collections with fast worldwide delivery.',
  phone: '+44 20 7946 0958',
  copyright: '© 2026 ONEENTRY FASHION. All rights reserved.',
};
