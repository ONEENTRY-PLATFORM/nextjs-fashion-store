/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Generate blueprint.from-datasets.json from src/app/data/*.ts.
 * Run: npx tsx scripts/generate-blueprint.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { WOMEN_CLOTHING_PRODUCTS } from '../src/app/data/_women-clothing';
import { MEN_CLOTHING_PRODUCTS } from '../src/app/data/men-clothing';
import { WOMEN_BAGS_PRODUCTS } from '../src/app/data/women-bags';
import { MEN_BAGS_PRODUCTS } from '../src/app/data/men-bags';
import { WOMEN_SHOES_PRODUCTS } from '../src/app/data/women-shoes';
import { MEN_SHOES_PRODUCTS } from '../src/app/data/men-shoes';
import { WOMEN_ACCESSORIES_PRODUCTS } from '../src/app/data/women-accessories';
import { MEN_ACCESSORIES_PRODUCTS } from '../src/app/data/men-accessories';

import { BEST_SELLERS, NEW_ARRIVALS, SALE_PRODUCTS } from '../src/app/data/homepageProducts';
import { PROMO_ITEMS } from '../src/app/data/promoBlocks';
import { DISCOUNT_BANNER } from '../src/app/data/banners';
import { SHOP_CATEGORIES } from '../src/app/data/categories';
import { INFO_PAGE_META, INFO_SLUGS } from '../src/app/data/infoPages';
import { FAQ_ITEMS } from '../src/app/data/faqData';
import { STORES } from '../src/app/data/stores';

// Hero slides inlined (original heroSlides.ts imports a local .png that tsx can't resolve).
const HERO_SLIDES = [
  {
    id: 1,
    image: 'assets/hero-slide-1.png',
    eyebrow: "Women's Collection",
    headline: 'The Stylist Edit',
    subtext: 'Curated looks for the modern woman',
    cta: 'Shop the Edit',
    href: '/women/clothing',
    align: 'left',
    gender: 'women',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1620853314032-629c6d5d88a5?w=1920&q=80',
    eyebrow: "Men's Collection",
    headline: 'New Season Men',
    subtext: "Discover the latest men's collection",
    cta: 'Shop Now',
    href: '/men/clothing',
    align: 'right',
    gender: 'men',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1580698864216-8008843ce6b0?w=1920&q=80',
    eyebrow: 'New In',
    headline: 'Effortless Elegance',
    subtext: 'Premium pieces for every occasion',
    cta: 'Explore Collection',
    href: '/new',
    align: 'center',
    gender: 'women',
  },
] as const;

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

const escapeHtml = (s: string) =>
  s.replace(/&/g, '\x26amp;')
    .replace(/</g, '\x26lt;')
    .replace(/>/g, '\x26gt;')
    .replace(/"/g, '\x26quot;')
    .replace(/'/g, '\x26#x27;');

const textEnvelope = (plain: string) => [{
  htmlValue: `<p>${escapeHtml(plain).replace(/\n/g, '<br/>')}</p>`,
  plainValue: plain,
  mdValue: plain,
  params: { isImageCompressed: true, editorMode: 'html' as const },
}];

const slug = (s: string) =>
  s.toLowerCase().replace(/['"']/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const priceToInt = (p?: string): number | null => {
  if (!p) return null;
  const m = p.replace(/[^\d.]/g, '');
  if (!m) return null;
  return Math.round(parseFloat(m) * 100);
};

const CATEGORY_TO_PAGE: Record<string, string> = {
  wc: '@page.women_clothing',
  mc: '@page.men_clothing',
  wb: '@page.women_bags',
  mb: '@page.men_bags',
  ws: '@page.women_shoes',
  ms: '@page.men_shoes',
  wa: '@page.women_accessories',
  ma: '@page.men_accessories',
};

const CATEGORY_PATH: Record<string, string> = {
  wc: 'women/clothing',
  mc: 'men/clothing',
  wb: 'women/bags',
  mb: 'men/bags',
  ws: 'women/shoes',
  ms: 'men/shoes',
  wa: 'women/accessories',
  ma: 'men/accessories',
};

const prefix = (id: string) => id.split('-')[0];

// ──────────────────────────────────────────────────────────────────────
// attributes_sets
// ──────────────────────────────────────────────────────────────────────

type AttrDef = {
  id: number;
  type: string;
  identifier: string;
  isVisible?: boolean;
  original?: boolean;
  isPrice?: boolean;
  isSku?: boolean;
  isPassword?: boolean;
  isProductPreview?: boolean;
  isCompress?: boolean;
  isNotificationEmail?: boolean;
  localizeInfos: Record<string, { title: string }>;
};

const attr = (
  id: number,
  type: string,
  identifier: string,
  title: string,
  flags: Partial<AttrDef> = {}
): AttrDef => ({
  id,
  type,
  identifier,
  isVisible: true,
  original: true,
  ...flags,
  localizeInfos: { en_US: { title } },
});

const buildSchema = (items: AttrDef[]): Record<string, AttrDef> => {
  const out: Record<string, AttrDef> = {};
  items.forEach((a, i) => {
    out[`attribute${i + 1}`] = a;
  });
  return out;
};

const attributesSets = [
  {
    id: '@aset.page',
    identifier: 'page',
    type_id: 4,
    title: 'Page',
    is_visible: true,
    properties: {},
    schema: buildSchema([
      attr(1, 'string', 'meta_title', 'Meta title'),
      attr(2, 'string', 'meta_description', 'Meta description'),
      attr(3, 'string', 'keywords', 'Keywords'),
    ]),
  },
  {
    id: '@aset.product',
    identifier: 'product',
    type_id: 5,
    title: 'Product',
    is_visible: true,
    properties: {},
    schema: buildSchema([
      attr(1, 'text', 'description', 'Description'),
      attr(2, 'integer', 'price', 'Price', { isPrice: true }),
      attr(3, 'integer', 'sale_price', 'Sale price'),
      attr(4, 'image', 'cover', 'Cover', { isProductPreview: true, isCompress: true }),
      attr(5, 'string', 'sku', 'SKU', { isSku: true }),
      attr(6, 'string', 'brand', 'Brand'),
      attr(7, 'string', 'material', 'Material'),
      attr(8, 'string', 'style', 'Style'),
      attr(9, 'string', 'fit', 'Fit'),
      attr(10, 'string', 'season', 'Season'),
      attr(11, 'text', 'gallery', 'Gallery'),
      attr(12, 'text', 'details', 'Details'),
    ]),
  },
  {
    id: '@aset.block_hero',
    identifier: 'block_hero',
    type_id: 2,
    title: 'Hero slide',
    is_visible: true,
    properties: {},
    schema: buildSchema([
      attr(1, 'string', 'eyebrow', 'Eyebrow'),
      attr(2, 'string', 'headline', 'Headline'),
      attr(3, 'text', 'subtext', 'Subtext'),
      attr(4, 'string', 'cta', 'CTA'),
      attr(5, 'string', 'href', 'Href'),
      attr(6, 'image', 'image', 'Image'),
      attr(7, 'string', 'align', 'Align'),
      attr(8, 'string', 'gender', 'Gender'),
    ]),
  },
  {
    id: '@aset.block_promo',
    identifier: 'block_promo',
    type_id: 2,
    title: 'Promo card',
    is_visible: true,
    properties: {},
    schema: buildSchema([
      attr(1, 'string', 'title', 'Title'),
      attr(2, 'string', 'subtitle', 'Subtitle'),
      attr(3, 'image', 'image', 'Image'),
      attr(4, 'string', 'cta', 'CTA'),
      attr(5, 'string', 'href', 'Href'),
    ]),
  },
  {
    id: '@aset.block_banner',
    identifier: 'block_banner',
    type_id: 2,
    title: 'Discount banner',
    is_visible: true,
    properties: {},
    schema: buildSchema([
      attr(1, 'image', 'image', 'Image'),
      attr(2, 'string', 'alt', 'Alt'),
      attr(3, 'string', 'badge', 'Badge'),
      attr(4, 'string', 'discount_text', 'Discount text'),
      attr(5, 'string', 'category', 'Category'),
      attr(6, 'text', 'description', 'Description'),
      attr(7, 'string', 'cta', 'CTA'),
      attr(8, 'string', 'href', 'Href'),
    ]),
  },
  {
    id: '@aset.block_category',
    identifier: 'block_category',
    type_id: 2,
    title: 'Shop category card',
    is_visible: true,
    properties: {},
    schema: buildSchema([
      attr(1, 'string', 'label', 'Label'),
      attr(2, 'image', 'image', 'Image'),
      attr(3, 'string', 'href', 'Href'),
      attr(4, 'string', 'chip', 'Chip'),
    ]),
  },
  {
    id: '@aset.block_faq',
    identifier: 'block_faq',
    type_id: 2,
    title: 'FAQ item',
    is_visible: true,
    properties: {},
    schema: buildSchema([
      attr(1, 'string', 'question', 'Question'),
      attr(2, 'text', 'answer', 'Answer'),
    ]),
  },
  {
    id: '@aset.block_store',
    identifier: 'block_store',
    type_id: 2,
    title: 'Store',
    is_visible: true,
    properties: {},
    schema: buildSchema([
      attr(1, 'string', 'name', 'Name'),
      attr(2, 'string', 'city', 'City'),
      attr(3, 'string', 'address', 'Address'),
      attr(4, 'string', 'phone', 'Phone'),
      attr(5, 'string', 'email', 'Email'),
      attr(6, 'text', 'hours', 'Hours'),
      attr(7, 'text', 'services', 'Services'),
      attr(8, 'image', 'image', 'Image'),
      attr(9, 'string', 'map_url', 'Map URL'),
      attr(10, 'string', 'flagship', 'Flagship'),
    ]),
  },
  {
    id: '@aset.reg_form',
    identifier: 'reg_form',
    type_id: 3,
    title: 'Registration form',
    is_visible: true,
    properties: {},
    schema: buildSchema([
      attr(1, 'string', 'email', 'Email', { isNotificationEmail: true }),
      attr(2, 'string', 'password', 'Password', { isPassword: true }),
    ]),
  },
  {
    id: '@aset.order_form',
    identifier: 'order_form',
    type_id: 6,
    title: 'Order form',
    is_visible: true,
    properties: {},
    schema: buildSchema([
      attr(1, 'string', 'order_address', 'Order address'),
      attr(2, 'string', 'phone', 'Phone'),
      attr(3, 'string', 'full_name', 'Full name'),
    ]),
  },
  {
    id: '@aset.service_form',
    identifier: 'service_form',
    type_id: 6,
    title: 'Service request form',
    is_visible: true,
    properties: {},
    schema: buildSchema([
      attr(1, 'string', 'category', 'Category'),
      attr(2, 'string', 'item', 'Item'),
      attr(3, 'text', 'notes', 'Notes'),
    ]),
  },
  {
    id: '@aset.user',
    identifier: 'user',
    type_id: 1,
    title: 'User',
    is_visible: true,
    properties: {},
    schema: buildSchema([
      attr(1, 'string', 'first_name', 'First name'),
      attr(2, 'string', 'last_name', 'Last name'),
    ]),
  },
];

// ──────────────────────────────────────────────────────────────────────
// templates / template_previews
// ──────────────────────────────────────────────────────────────────────

const templatePreviews = [
  {
    id: '@tp.default',
    identifier: 'default',
    title: 'Default',
    proportions: {
      default: {
        horizontal: { width: 70, height: 60, alignmentType: 'middleMiddle' },
        vertical: { width: 70, height: 60, alignmentType: 'middleTop' },
        square: { side: 6, alignmentType: 'middleTop' },
      },
    },
  },
];

const templates = [
  { id: '@tpl.page_default', identifier: 'page_default', general_type_id: 3, title: 'Default page template', attribute_set_id: '@aset.page', attributes_sets: {} },
  { id: '@tpl.catalog_page', identifier: 'catalog_page', general_type_id: 3, title: 'Catalog page template', attribute_set_id: '@aset.page', attributes_sets: {} },
  { id: '@tpl.product_default', identifier: 'product_default', general_type_id: 4, title: 'Default product template', attribute_set_id: '@aset.product', attributes_sets: {} },
  { id: '@tpl.hero_banner', identifier: 'hero_banner', general_type_id: 18, title: 'Hero banner block', attribute_set_id: null, attributes_sets: {} },
  { id: '@tpl.promo_card', identifier: 'promo_card', general_type_id: 18, title: 'Promo card block', attribute_set_id: null, attributes_sets: {} },
  { id: '@tpl.store_card', identifier: 'store_card', general_type_id: 18, title: 'Store card block', attribute_set_id: null, attributes_sets: {} },
];

// ──────────────────────────────────────────────────────────────────────
// pages
// ──────────────────────────────────────────────────────────────────────

const makePageAttrs = (title: string, description: string, keywords = '') => ({
  en_US: {
    string_id1: title,
    string_id2: description,
    string_id3: keywords,
  },
});

const makeLocalize = (title: string, html = '') => ({
  en_US: {
    title,
    menuTitle: title,
    htmlContent: html,
    plainContent: html.replace(/<[^>]+>/g, ''),
  },
});

const pages: any[] = [
  {
    id: '@page.home',
    identifier: 'home',
    general_type_id: 4,
    parent_id: null,
    page_url: 'home',
    attribute_set_id: '@aset.page',
    template_id: '@tpl.page_default',
    is_visible: true,
    depth: 0,
    category_path: 'home',
    attributes_sets: makePageAttrs('ONEENTRY Fashion', 'Premium fashion for men and women.', 'fashion,clothing,shoes'),
    localize_infos: makeLocalize('Home'),
    config: {},
  },
  {
    id: '@page.women',
    identifier: 'women',
    general_type_id: 4,
    parent_id: null,
    page_url: 'women',
    attribute_set_id: '@aset.page',
    template_id: '@tpl.catalog_page',
    is_visible: true,
    depth: 0,
    category_path: 'women',
    attributes_sets: makePageAttrs("Women's Collection", "Discover women's fashion.", 'women fashion'),
    localize_infos: makeLocalize('Women'),
    config: {},
  },
  {
    id: '@page.men',
    identifier: 'men',
    general_type_id: 4,
    parent_id: null,
    page_url: 'men',
    attribute_set_id: '@aset.page',
    template_id: '@tpl.catalog_page',
    is_visible: true,
    depth: 0,
    category_path: 'men',
    attributes_sets: makePageAttrs("Men's Collection", "Discover men's fashion.", 'men fashion'),
    localize_infos: makeLocalize('Men'),
    config: {},
  },
];

const catalogChildren: Array<[string, string, string, string]> = [
  ['women_clothing', 'women/clothing', "Women's Clothing", '@page.women'],
  ['women_shoes', 'women/shoes', "Women's Shoes", '@page.women'],
  ['women_bags', 'women/bags', "Women's Bags", '@page.women'],
  ['women_accessories', 'women/accessories', "Women's Accessories", '@page.women'],
  ['men_clothing', 'men/clothing', "Men's Clothing", '@page.men'],
  ['men_shoes', 'men/shoes', "Men's Shoes", '@page.men'],
  ['men_bags', 'men/bags', "Men's Bags", '@page.men'],
  ['men_accessories', 'men/accessories', "Men's Accessories", '@page.men'],
];
for (const [ident, url, title, parent] of catalogChildren) {
  pages.push({
    id: `@page.${ident}`,
    identifier: ident,
    general_type_id: 4,
    parent_id: parent,
    page_url: url,
    attribute_set_id: '@aset.page',
    template_id: '@tpl.catalog_page',
    is_visible: true,
    depth: 1,
    category_path: url,
    attributes_sets: makePageAttrs(title, `Shop ${title.toLowerCase()}.`, title.toLowerCase()),
    localize_infos: makeLocalize(title),
    config: {},
  });
}

// Special pages
for (const [ident, url, title] of [
  ['new_arrivals', 'new', 'New Arrivals'],
  ['sale', 'sale', 'Sale'],
  ['favorites', 'favorites', 'Favorites'],
  ['stores', 'stores', 'Store Locations'],
] as const) {
  pages.push({
    id: `@page.${ident}`,
    identifier: ident,
    general_type_id: 4,
    parent_id: null,
    page_url: url,
    attribute_set_id: '@aset.page',
    template_id: '@tpl.page_default',
    is_visible: true,
    depth: 0,
    category_path: url,
    attributes_sets: makePageAttrs(title, `${title} page.`, title.toLowerCase()),
    localize_infos: makeLocalize(title),
    config: {},
  });
}

// Info parent + children
pages.push({
  id: '@page.info',
  identifier: 'info',
  general_type_id: 4,
  parent_id: null,
  page_url: 'info',
  attribute_set_id: '@aset.page',
  template_id: '@tpl.page_default',
  is_visible: true,
  depth: 0,
  category_path: 'info',
  attributes_sets: makePageAttrs('Information', 'Information pages.', 'info'),
  localize_infos: makeLocalize('Information'),
  config: {},
});
for (const s of INFO_SLUGS) {
  const meta = INFO_PAGE_META[s];
  const identifier = slug(`info_${s}`);
  pages.push({
    id: `@page.info_${slug(s)}`,
    identifier,
    general_type_id: 4,
    parent_id: '@page.info',
    page_url: `info/${s}`,
    attribute_set_id: '@aset.page',
    template_id: '@tpl.page_default',
    is_visible: true,
    depth: 1,
    category_path: `info/${s}`,
    attributes_sets: makePageAttrs(meta.title, meta.description, meta.keywords),
    localize_infos: makeLocalize(meta.title),
    config: {},
  });
}

// ──────────────────────────────────────────────────────────────────────
// product_statuses
// ──────────────────────────────────────────────────────────────────────

const productStatuses = [
  {
    id: '@status.in_stock',
    identifier: 'in_stock',
    localize_infos: { en_US: { title: 'In stock' } },
    is_default: true,
  },
  {
    id: '@status.out_of_stock',
    identifier: 'out_of_stock',
    localize_infos: { en_US: { title: 'Out of stock' } },
    is_default: false,
  },
];

// ──────────────────────────────────────────────────────────────────────
// products
// ──────────────────────────────────────────────────────────────────────

const ALL_PRODUCT_GROUPS: Array<[string, any[]]> = [
  ['wc', WOMEN_CLOTHING_PRODUCTS],
  ['mc', MEN_CLOTHING_PRODUCTS],
  ['wb', WOMEN_BAGS_PRODUCTS],
  ['mb', MEN_BAGS_PRODUCTS],
  ['ws', WOMEN_SHOES_PRODUCTS],
  ['ms', MEN_SHOES_PRODUCTS],
  ['wa', WOMEN_ACCESSORIES_PRODUCTS],
  ['ma', MEN_ACCESSORIES_PRODUCTS],
];

const ALL_PRODUCTS: any[] = ALL_PRODUCT_GROUPS.flatMap(([, arr]) => arr);

const products = ALL_PRODUCTS.map((p: any) => {
  const priceInt = priceToInt(p.price);
  const saleInt = priceToInt(p.salePrice);
  const statusToken = p.inStock === false ? '@status.out_of_stock' : '@status.in_stock';
  const detailsText = [
    p.productDetails ? `Details: ${p.productDetails.join(', ')}` : null,
    p.specs ? p.specs.map((s: any) => `${s.label}: ${s.value}`).join(' | ') : null,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    id: `@prod.${p.id}`,
    identifier: p.id,
    attribute_set_id: '@aset.product',
    template_id: '@tpl.product_default',
    short_desc_template_id: null,
    status_id: statusToken,
    is_visible: true,
    is_edit: false,
    localize_infos: { en_US: { title: p.name } },
    attributes_sets: {
      en_US: {
        text_id1: textEnvelope(p.name),
        integer_id2: priceInt !== null ? String(priceInt) : '',
        integer_id3: saleInt !== null ? String(saleInt) : '',
        image_id4: p.image
          ? [{ filename: p.image, downloadLink: p.image, size: 0, previewLink: '', params: { isImageCompressed: true } }]
          : '',
        string_id5: p.id,
        string_id6: p.brand ?? '',
        string_id7: p.material ?? '',
        string_id8: p.style ?? '',
        string_id9: p.fit ?? '',
        string_id10: p.season ?? '',
        text_id11: textEnvelope(JSON.stringify(p.galleryImages ?? [])),
        text_id12: textEnvelope(detailsText),

      },
    },
  };
});

// ──────────────────────────────────────────────────────────────────────
// products_pages_mn
// ──────────────────────────────────────────────────────────────────────

const productsPagesMn: any[] = [];
for (const p of ALL_PRODUCTS) {
  const pref = prefix(p.id);
  const pageTok = CATEGORY_TO_PAGE[pref];
  const catPath = CATEGORY_PATH[pref];
  if (!pageTok) continue;
  productsPagesMn.push({
    id: `@pp.${p.id}`,
    productId: `@prod.${p.id}`,
    pageId: pageTok,
    category_path: catPath,
  });
  if (p.label === 'NEW') {
    productsPagesMn.push({
      id: `@pp.${p.id}_new`,
      productId: `@prod.${p.id}`,
      pageId: '@page.new_arrivals',
      category_path: 'new',
    });
  }
  if (p.label === 'SALE') {
    productsPagesMn.push({
      id: `@pp.${p.id}_sale`,
      productId: `@prod.${p.id}`,
      pageId: '@page.sale',
      category_path: 'sale',
    });
  }
}

// ──────────────────────────────────────────────────────────────────────
// blocks (+ joins)
// ──────────────────────────────────────────────────────────────────────

const blocks: any[] = [];
const blockPagesMn: any[] = [];
const productBlocksMn: any[] = [];
const blockProductsMn: any[] = [];

// Hero slides
HERO_SLIDES.forEach((s, idx) => {
  const tok = `@block.hero_${idx + 1}`;
  blocks.push({
    id: tok,
    identifier: `hero_${idx + 1}`,
    attribute_set_id: '@aset.block_hero',
    general_type_id: 10,
    template_id: '@tpl.hero_banner',
    is_visible: true,
    localize_infos: { en_US: { title: s.headline } },
    custom_settings: {},
    product_page_urls: [],
    attributes_sets: {
      en_US: {
        string_id1: s.eyebrow,
        string_id2: s.headline,
        text_id3: textEnvelope(s.subtext),
        string_id4: s.cta,
        string_id5: s.href,
        image_id6: [{ filename: s.image, downloadLink: s.image, size: 0, previewLink: '', params: { isImageCompressed: true } }],
        string_id7: s.align,
        string_id8: s.gender,

      },
    },
  });
  blockPagesMn.push({ id: `@bp.hero_${idx + 1}`, page_id: '@page.home', block_id: tok, is_nested: false });
});

// Promo items
PROMO_ITEMS.forEach((p) => {
  const tok = `@block.promo_${p.id}`;
  blocks.push({
    id: tok,
    identifier: `promo_${p.id}`,
    attribute_set_id: '@aset.block_promo',
    general_type_id: 10,
    template_id: '@tpl.promo_card',
    is_visible: true,
    localize_infos: { en_US: { title: p.title } },
    custom_settings: {},
    product_page_urls: [],
    attributes_sets: {
      en_US: {
        string_id1: p.title,
        string_id2: p.subtitle,
        image_id3: [{ filename: p.image, downloadLink: p.image, size: 0, previewLink: '', params: { isImageCompressed: true } }],
        string_id4: p.cta,
        string_id5: p.href,

      },
    },
  });
  blockPagesMn.push({ id: `@bp.promo_${p.id}`, page_id: '@page.home', block_id: tok, is_nested: false });
});

// Discount banner
blocks.push({
  id: '@block.banner_discount',
  identifier: 'banner_discount',
  attribute_set_id: '@aset.block_banner',
  general_type_id: 10,
  template_id: null,
  is_visible: true,
  localize_infos: { en_US: { title: DISCOUNT_BANNER.discountText } },
  custom_settings: {},
  product_page_urls: [],
  attributes_sets: {
    en_US: {
      image_id1: [{ filename: DISCOUNT_BANNER.image, downloadLink: DISCOUNT_BANNER.image, size: 0, previewLink: '', params: { isImageCompressed: true } }],
      string_id2: DISCOUNT_BANNER.alt,
      string_id3: DISCOUNT_BANNER.badge,
      string_id4: DISCOUNT_BANNER.discountText,
      string_id5: DISCOUNT_BANNER.category,
      text_id6: textEnvelope(DISCOUNT_BANNER.description),
      string_id7: DISCOUNT_BANNER.cta,
      string_id8: DISCOUNT_BANNER.href,
    },
  },
});
blockPagesMn.push({ id: '@bp.banner_discount', page_id: '@page.home', block_id: '@block.banner_discount', is_nested: false });

// Shop categories
SHOP_CATEGORIES.forEach((c) => {
  const tok = `@block.category_${slug(c.id)}`;
  blocks.push({
    id: tok,
    identifier: `category_${slug(c.id)}`,
    attribute_set_id: '@aset.block_category',
    general_type_id: 10,
    template_id: null,
    is_visible: true,
    localize_infos: { en_US: { title: c.label } },
    custom_settings: {},
    product_page_urls: [],
    attributes_sets: {
      en_US: {
        string_id1: c.label,
        image_id2: [{ filename: c.image, downloadLink: c.image, size: 0, previewLink: '', params: { isImageCompressed: true } }],
        string_id3: c.href,
        string_id4: c.chip,

      },
    },
  });
  blockPagesMn.push({ id: `@bp.category_${slug(c.id)}`, page_id: '@page.home', block_id: tok, is_nested: false });
});

// FAQ items
FAQ_ITEMS.forEach((f, i) => {
  const tok = `@block.faq_${i + 1}`;
  blocks.push({
    id: tok,
    identifier: `faq_${i + 1}`,
    attribute_set_id: '@aset.block_faq',
    general_type_id: 10,
    template_id: null,
    is_visible: true,
    localize_infos: { en_US: { title: f.question } },
    custom_settings: {},
    product_page_urls: [],
    attributes_sets: {
      en_US: {
        string_id1: f.question,
        text_id2: textEnvelope(f.answer),

      },
    },
  });
  blockPagesMn.push({ id: `@bp.faq_${i + 1}`, page_id: '@page.info_faq', block_id: tok, is_nested: false });
});

// Stores
STORES.forEach((s) => {
  const tok = `@block.store_${slug(s.id)}`;
  blocks.push({
    id: tok,
    identifier: `store_${slug(s.id)}`,
    attribute_set_id: '@aset.block_store',
    general_type_id: 10,
    template_id: '@tpl.store_card',
    is_visible: true,
    localize_infos: { en_US: { title: s.name } },
    custom_settings: {},
    product_page_urls: [],
    attributes_sets: {
      en_US: {
        string_id1: s.name,
        string_id2: s.city,
        string_id3: `${s.address}, ${s.postcode}`,
        string_id4: s.phone,
        string_id5: s.email,
        text_id6: textEnvelope(s.hours.map((h: any) => `${h.day}: ${h.time}`).join('\n')),
        text_id7: textEnvelope(s.services.join(', ')),
        image_id8: [{ filename: s.image, downloadLink: s.image, size: 0, previewLink: '', params: { isImageCompressed: true } }],
        string_id9: s.mapUrl,
        string_id10: s.isflagship ? 'FLAGSHIP' : (s.tag ?? ''),

      },
    },
  });
  blockPagesMn.push({ id: `@bp.store_${slug(s.id)}`, page_id: '@page.stores', block_id: tok, is_nested: false });
});

// Section blocks: best sellers, new arrivals home, sale home
const sectionBlocks: Array<[string, string, any[]]> = [
  ['@block.best_sellers', 'best_sellers', BEST_SELLERS],
  ['@block.new_arrivals_home', 'new_arrivals_home', NEW_ARRIVALS],
  ['@block.sale_home', 'sale_home', SALE_PRODUCTS],
];
sectionBlocks.forEach(([tok, ident, list]) => {
  blocks.push({
    id: tok,
    identifier: ident,
    attribute_set_id: '@aset.block_promo',
    general_type_id: 10,
    template_id: null,
    is_visible: true,
    localize_infos: { en_US: { title: ident.replace(/_/g, ' ') } },
    custom_settings: { productConfig: { en_US: { quantity: String(list.length), sortType: 'title', sortOrder: 'ASC', countElementsPerRow: '4' } } },
    product_page_urls: [],
    attributes_sets: {
      en_US: {
        string_id1: ident.replace(/_/g, ' '),
        string_id2: '',
        image_id3: [],
        string_id4: 'Shop all',
        string_id5: '/',

      },
    },
  });
  blockPagesMn.push({ id: `@bp.${ident}`, page_id: '@page.home', block_id: tok, is_nested: false });

  list.forEach((p: any) => {
    productBlocksMn.push({
      id: `@pb.${ident}_${p.id}`,
      product_id: `@prod.${p.id}`,
      block_id: tok,
      is_visible: true,
      lang_code: 'en_US',
    });
    blockProductsMn.push({
      id: `@bprod.${ident}_${p.id}`,
      product_id: `@prod.${p.id}`,
      block_id: tok,
      page_id: null,
      is_locked: false,
      deleted: false,
    });
  });
});

// ──────────────────────────────────────────────────────────────────────
// forms, groups, auth, orders
// ──────────────────────────────────────────────────────────────────────

const forms = [
  {
    id: '@form.reg',
    identifier: 'reg',
    attribute_set_id: '@aset.reg_form',
    processing_type: 'script',
    selected_attribute_markers: null,
    template_id: null,
    type: 'sing_in_up',
    attributes_sets: { en_US: { string_id1: '', string_id2: '' } },
    localize_infos: {
      en_US: {
        title: 'Registration',
        titleForSite: 'Registration',
        successMessage: 'Welcome!',
        unsuccessMessage: 'Error',
        urlAddress: '',
        database: '0',
        script: '0',
      },
    },
  },
  {
    id: '@form.order',
    identifier: 'order',
    attribute_set_id: '@aset.order_form',
    processing_type: 'db',
    selected_attribute_markers: 'order_address',
    template_id: null,
    type: null,
    attributes_sets: { en_US: { string_id1: '', string_id2: '', string_id3: '' } },
    localize_infos: {
      en_US: {
        title: 'Order form',
        titleForSite: 'Checkout',
        successMessage: 'Order placed!',
        unsuccessMessage: 'Error',
        urlAddress: '',
        database: '0',
        script: '0',
      },
    },
  },
  {
    id: '@form.service',
    identifier: 'service',
    attribute_set_id: '@aset.service_form',
    processing_type: 'db',
    selected_attribute_markers: null,
    template_id: null,
    type: null,
    attributes_sets: { en_US: { string_id1: '', string_id2: '', text_id3: textEnvelope('') } },
    localize_infos: {
      en_US: {
        title: 'Service request',
        titleForSite: 'Service Maintenance',
        successMessage: 'Request received',
        unsuccessMessage: 'Error',
        urlAddress: '',
        database: '0',
        script: '0',
      },
    },
  },
];

const userGroups = [
  {
    id: '@group.registered',
    identifier: 'registered',
    parent_id: null,
    attribute_set_id: '@aset.user',
    is_visible: true,
    depth: 0,
    attributes_sets: {},
    localize_infos: { en_US: { title: 'Registered' } },
  },
];

const usersAuthProviders = [
  {
    id: '@auth.email',
    identifier: 'email',
    form_id: '@form.reg',
    user_group_id: '@group.registered',
    is_active: true,
    is_check_code: false,
    type: 'password',
    localize_infos: { en_US: { title: 'Email' } },
    config: {
      accessTokenTtlSec: 86400,
      refreshTokenTtlMc: 604800,
      tokenSecretKey: 'dev-secret',
      deleteNoneActiveUsersAfterDays: 30,
      systemCodeTlsSec: 120,
      systemCodeLength: 6,
    },
  },
];

const ordersStorage = [
  {
    id: '@storage.orders',
    identifier: 'order',
    form_id: '@form.order',
    general_type_id: 21,
    selected_attribute_markers: 'order_address',
    localize_infos: { en_US: { title: 'order' } },
  },
];

const ordersStoragePaymentAccounts = [
  { id: '@osp.card', storage_id: '@storage.orders', payment_account_id: 1 },
];

const orderStatuses = [
  { id: '@ostatus.new', identifier: 'new', storage_id: '@storage.orders', is_default: true, localize_infos: { en_US: { title: 'New' } } },
  { id: '@ostatus.paid', identifier: 'paid', storage_id: '@storage.orders', is_default: false, localize_infos: { en_US: { title: 'Paid' } } },
  { id: '@ostatus.shipped', identifier: 'shipped', storage_id: '@storage.orders', is_default: false, localize_infos: { en_US: { title: 'Shipped' } } },
  { id: '@ostatus.delivered', identifier: 'delivered', storage_id: '@storage.orders', is_default: false, localize_infos: { en_US: { title: 'Delivered' } } },
  { id: '@ostatus.cancelled', identifier: 'cancelled', storage_id: '@storage.orders', is_default: false, localize_infos: { en_US: { title: 'Cancelled' } } },
];

const productRelationsTemplates = [
  {
    id: '@prt.recommended',
    identifier: 'recommended',
    name: 'Recommended',
    is_active: true,
    conditions: [
      {
        id: 'rec-00000000-0000-0000-0000-000000000001',
        found: [],
        title: '',
        pageUrls: [],
        statusMarker: '',
        conditionValue: '',
        attributeMarker: 'brand',
        conditionMarker: 'pat',
      },
    ],
  },
  {
    id: '@prt.special_offers',
    identifier: 'special_offers',
    name: 'Special offers',
    is_active: true,
    conditions: [
      {
        id: 'spo-00000000-0000-0000-0000-000000000002',
        found: [],
        title: '',
        pageUrls: [],
        statusMarker: '',
        conditionValue: '',
        attributeMarker: 'sku',
        conditionMarker: 'pat',
      },
    ],
  },
];

// ──────────────────────────────────────────────────────────────────────
// Assemble + self-check + write
// ──────────────────────────────────────────────────────────────────────

const tables = {
  attributes_sets: attributesSets,
  template_previews: templatePreviews,
  templates,
  pages,
  product_statuses: productStatuses,
  products,
  products_pages_mn: productsPagesMn,
  blocks,
  block_pages_mn: blockPagesMn,
  product_blocks_mn: productBlocksMn,
  block_products_mn: blockProductsMn,
  forms,
  user_groups: userGroups,
  users_auth_providers: usersAuthProviders,
  order_statuses: orderStatuses,
  orders_storage: ordersStorage,
  orders_storage_payment_accounts: ordersStoragePaymentAccounts,
  product_relations_templates: productRelationsTemplates,
};

// Token self-check
const defined = new Set<string>();
const referenced = new Set<string>();
const walk = (v: any, isKey: boolean) => {
  if (typeof v === 'string') {
    if (v.startsWith('@')) referenced.add(v);
  } else if (Array.isArray(v)) {
    v.forEach((x) => walk(x, false));
  } else if (v && typeof v === 'object') {
    for (const [k, val] of Object.entries(v)) {
      if (k === 'id' && typeof val === 'string' && val.startsWith('@')) defined.add(val);
      walk(val, false);
    }
  }
};
walk(tables, false);
const missing = [...referenced].filter((t) => !defined.has(t));
if (missing.length) {
  console.warn('⚠ Unresolved tokens:', missing.slice(0, 20), `(total ${missing.length})`);
} else {
  console.log('✓ All', referenced.size, 'token references resolved.');
}

const outPath = path.resolve(__dirname, '..', 'blueprint.from-datasets.json');
fs.writeFileSync(
  outPath,
  JSON.stringify({ tables }, null, 2),
  'utf8'
);

// Summary
const summary: Record<string, number> = {};
for (const [k, v] of Object.entries(tables)) summary[k] = (v as any[]).length;
console.log('Rows per table:', summary);
console.log('Written →', outPath);
