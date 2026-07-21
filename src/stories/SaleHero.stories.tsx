import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SaleHero } from '../app/pages/sale/SaleHero';
import type { SalePageFromCms } from '../lib/oneentry/catalog/sale-page';

const MOCK_COUNTDOWN = { days: 3, hours: 14, minutes: 27, seconds: 9 };

/** Realistic CMS payload as it would come from the OE `sale` page attributes. */
const MOCK_CMS: SalePageFromCms = {
  hero: {
    eyebrow: 'LIMITED TIME OFFER',
    contentHtml:
      '<h1>SEASON<br/>SALE</h1><p>Up to 50% off selected styles — women, men &amp; accessories.</p>',
    contentPlain: 'SEASON\nSALE\nUP TO 50% OFF\nMajor markdowns across clothing, shoes, bags, and accessories.',
    ctaLabel: 'SHOP SALE',
    timerLabel: 'SALE ENDS IN',
    timerEndsText: 'Ends August 31, 2026',
    image:
      'https://images.unsplash.com/photo-1609017604163-e4ca9c619b9b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  },
  promo: {
    eyebrow: 'EXTRA 10% OFF',
    title: 'NEW ARRIVALS ON SALE',
    subtitle: 'Fresh styles added daily. Shop before they sell out.',
    ctaLabel: 'EXPLORE NOW',
    ctaHref: '/sale',
    image:
      'https://images.unsplash.com/photo-1739424464070-63b6cc9086aa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  },
  saleEndsAt: new Date('2026-08-31T23:59:59Z').getTime(),
};

const meta = {
  title: 'Components / SaleHero',
  component: SaleHero,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof SaleHero>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Fallback (no CMS) — uses hard-coded SALE_PAGE_LABELS copy and Unsplash image. */
export const Default: Story = {
  name: 'Default (fallback copy)',
  args: {
    countdown: MOCK_COUNTDOWN,
    endsAt: new Date('2026-08-31T23:59:59Z').getTime(),
  },
};

/** CMS-driven — all banner copy, image and CTA come from `cms.hero`. */
export const CmsPopulated: Story = {
  name: 'CMS populated',
  args: {
    countdown: MOCK_COUNTDOWN,
    cms: MOCK_CMS,
  },
};

/** CMS provided but `contentHtml` is empty → falls back to `contentPlain`
 *  parsed line-by-line into the original title / discount / subtitle slots. */
export const CmsNoHtml: Story = {
  name: 'CMS — no contentHtml (plainValue fallback)',
  args: {
    countdown: MOCK_COUNTDOWN,
    cms: {
      ...MOCK_CMS,
      hero: { ...MOCK_CMS.hero, contentHtml: '' },
    },
  },
};

/** Both `contentHtml` and `contentPlain` are empty → deepest fallback:
 *  all four visual slots are filled by static `L.*` labels
 *  (SEASON / SALE / UP TO 50% OFF / heroSubtitle). */
export const CmsNoHtmlNoPlain: Story = {
  name: 'CMS — no contentHtml, no contentPlain (static labels fallback)',
  args: {
    countdown: MOCK_COUNTDOWN,
    cms: {
      ...MOCK_CMS,
      hero: { ...MOCK_CMS.hero, contentHtml: '', contentPlain: '' },
    },
  },
};
