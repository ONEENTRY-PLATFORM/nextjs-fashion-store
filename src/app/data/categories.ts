/* ════════════════════════════════════════════
   NAVIGATION — MEGA MENU
════════════════════════════════════════════ */
export type Gender = 'women' | 'men';
export type SubCat = 'shoes' | 'clothing' | 'bags' | 'accessories' | null;
export interface MegaSectionItem { label: string; pageUrl: string }
export interface MegaSection { title: string; items: MegaSectionItem[] }

export const MEGA_DATA: Record<Gender, Record<string, { title: string; items: string[] }[]>> = {
  women: {
    clothing: [
      { title: 'CLOTHING', items: ['Pants & Shorts', 'Jeans', 'Sheepskin Coats & Fur', 'Jackets', 'Coats', 'Dresses & Skirts', 'Shirts', 'Sweaters', 'Hoodies', 'T-shirts', 'Underwear'] },
      { title: 'SEASONAL TRENDS', items: ['Fitness & Yoga', 'Knitwear', 'Natural & Eco Leather', 'Office Wear', 'Home Collection'] },
    ],
    shoes: [
      { title: 'SHOES', items: ['Ballet flats', 'Boots', 'Cossack boots', 'Sneakers', 'Trainers', 'Loafers', 'Low shoes', 'Pumps', 'Ugg boots'] },
      { title: 'SEASONAL TRENDS', items: ['Natural rubber', 'Office', 'Wide/Narrow feet', 'All shoes'] },
    ],
    bags: [
      { title: 'BAGS', items: ['Clutches', 'Belt bags', 'Backpacks', 'Briefcases', 'Top-handle bags'] },
      { title: 'SEASONAL TRENDS', items: ['Suede', 'Evening', 'Animal prints', 'XXL'] },
    ],
    accessories: [
      { title: 'ACCESSORIES', items: ['Jewelry', 'Umbrellas', 'Wallets & Purses', 'Socks & Tights', 'Cardholders', 'Gloves', 'Belts', 'Hats', 'Scarves/Shawls/Wraps', 'Sunglasses'] },
    ],
  },
  men: {
    clothing: [
      { title: 'CLOTHING', items: ['Pants & Shorts', 'Jeans', 'Sheepskin Coats', 'Suits', 'Jackets & Down Jackets', 'Coats', 'Shirts', 'Sweaters & Turtlenecks', 'Hoodies & Sweatshirts', 'T-shirts', 'Underwear'] },
      { title: 'SEASONAL TRENDS', items: ['Polo & T-shirts', 'Sportswear', 'Denim'] },
    ],
    shoes: [
      { title: 'SHOES', items: ['Boots', 'Sneakers', 'Trainers', 'Loafers', 'Moccasins', 'Low shoes', 'Slip-ons', 'Boat shoes', 'Ugg boots', 'Chelsea boots'] },
      { title: 'SEASONAL TRENDS', items: ['Natural rubber', 'Derbies/Oxfords', 'Vacation', 'Suede', 'All shoes'] },
    ],
    bags: [
      { title: 'BAGS', items: ['Borsettes/Wristlets', 'Travel bags', 'Briefcases', 'Laptop bags', 'Belt/Waist bags', 'Backpacks', 'Sports bags', 'Shoulder bags', 'Top-handle bags', 'Suitcases'] },
      { title: 'SEASONAL TRENDS', items: ['Hands-free backpacks', 'Business style'] },
    ],
    accessories: [
      { title: 'ACCESSORIES', items: ['Umbrellas', 'Caps', 'Socks', 'Cardholders', 'Gloves', 'Wallets', 'Belts', 'Hats', 'Scarves', 'Sunglasses', 'Watches'] },
    ],
  },
};

export const SUB_CATEGORIES = ['Shoes', 'Clothing', 'Bags', 'Accessories', 'New', 'Sale'];

/* ════════════════════════════════════════════
   HOME — SHOP BY CATEGORY SECTION
════════════════════════════════════════════ */
export interface ShopCategory {
  id: string;
  label: string;
  href: string;
  image: string;
  chip: string; // which filter chip this belongs to
}

// Reusable image URLs (6 confirmed working photos)
const I = {
  womenFashion:  'https://images.unsplash.com/photo-1599662875272-64de8289f6d8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600',
  menFashion:    'https://images.unsplash.com/photo-1632934330201-a641618914d3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600',
  womenHeels:    'https://images.unsplash.com/photo-1621996659490-3275b4d0d951?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600',
  menSneakers:   'https://images.unsplash.com/photo-1618153478389-b2ed8de18ed3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600',
  accessories:   'https://images.unsplash.com/photo-1724896728499-2e7ecef652a8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600',
  bags:          'https://images.unsplash.com/photo-1598099947145-e85739e7ca28?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=600',
};

export const CATEGORY_FILTER_CHIPS = ['Outerwear', 'Tops', 'Bottoms', 'Sports', 'Lounge & Underwear'];

// clothingType values that actually exist in the dataset:
// Women: 'Dresses', 'Skirts', 'Tank Tops', 'Shirts', 'Blazers', 'Outerwear',
//        'Jeans', 'Pants', 'Sweaters / Turtlenecks / Jumpers', 'Hoodies / Sweatshirts'
// Men:   'Suits', 'Shirts', 'Jeans', 'Outerwear', 'Sweaters / Turtlenecks / Jumpers',
//        'Hoodies / Sweatshirts', 'Trousers', 'Shorts', 'Sportswear',
//        'T-Shirts / Polo Shirts', 'Blazers', 'Vests'
const q = (base: string, key: string, value: string) =>
  `${base}?${key}=${encodeURIComponent(value)}`;

export const SHOP_CATEGORIES: ShopCategory[] = [
  // ── Outerwear ──
  { id: 'coats',      label: 'Coats',          chip: 'Outerwear', image: I.womenFashion, href: q('/women/clothing', 'clothingType', 'Outerwear') },
  { id: 'jackets',    label: 'Jackets',        chip: 'Outerwear', image: I.menFashion,   href: q('/men/clothing',   'clothingType', 'Outerwear') },
  { id: 'blazers-w',  label: 'Blazers',        chip: 'Outerwear', image: I.womenHeels,   href: q('/women/clothing', 'clothingType', 'Blazers') },
  { id: 'blazers-m',  label: 'Suits & Blazers',chip: 'Outerwear', image: I.menSneakers,  href: q('/men/clothing',   'clothingType', 'Blazers') },
  { id: 'suits',      label: 'Suits',          chip: 'Outerwear', image: I.accessories,  href: q('/men/clothing',   'clothingType', 'Suits') },
  { id: 'vests',      label: 'Vests',          chip: 'Outerwear', image: I.bags,         href: q('/men/clothing',   'clothingType', 'Vests') },

  // ── Tops ──
  { id: 'shirts-w',   label: 'Shirts',         chip: 'Tops', image: I.womenFashion, href: q('/women/clothing', 'clothingType', 'Shirts') },
  { id: 'shirts-m',   label: 'Shirts (Men)',   chip: 'Tops', image: I.menFashion,   href: q('/men/clothing',   'clothingType', 'Shirts') },
  { id: 'tshirts',    label: 'T-Shirts',       chip: 'Tops', image: I.womenHeels,   href: q('/men/clothing',   'clothingType', 'T-Shirts / Polo Shirts') },
  { id: 'sweaters',   label: 'Sweaters',       chip: 'Tops', image: I.menSneakers,  href: q('/women/clothing', 'clothingType', 'Sweaters / Turtlenecks / Jumpers') },
  { id: 'hoodies-w',  label: 'Hoodies',        chip: 'Tops', image: I.accessories,  href: q('/women/clothing', 'clothingType', 'Hoodies / Sweatshirts') },
  { id: 'tank',       label: 'Tank Tops',      chip: 'Tops', image: I.bags,         href: q('/women/clothing', 'clothingType', 'Tank Tops') },

  // ── Bottoms ──
  { id: 'jeans-w',    label: 'Jeans',          chip: 'Bottoms', image: I.womenFashion, href: q('/women/clothing', 'clothingType', 'Jeans') },
  { id: 'jeans-m',    label: 'Jeans (Men)',    chip: 'Bottoms', image: I.menFashion,   href: q('/men/clothing',   'clothingType', 'Jeans') },
  { id: 'skirts',     label: 'Skirts',         chip: 'Bottoms', image: I.womenHeels,   href: q('/women/clothing', 'clothingType', 'Skirts') },
  { id: 'trousers',   label: 'Trousers',       chip: 'Bottoms', image: I.menSneakers,  href: q('/men/clothing',   'clothingType', 'Trousers') },
  { id: 'dresses',    label: 'Dresses',        chip: 'Bottoms', image: I.accessories,  href: q('/women/clothing', 'clothingType', 'Dresses') },
  { id: 'shorts',     label: 'Shorts',         chip: 'Bottoms', image: I.bags,         href: q('/men/clothing',   'clothingType', 'Shorts') },

  // ── Sports ──
  { id: 'sport-m',    label: 'Sportswear',     chip: 'Sports', image: I.womenFashion, href: q('/men/clothing',   'clothingType', 'Sportswear') },
  { id: 'hoodies-m',  label: 'Hoodies (Men)',  chip: 'Sports', image: I.menFashion,   href: q('/men/clothing',   'clothingType', 'Hoodies / Sweatshirts') },
  { id: 'pants-w',    label: 'Pants',          chip: 'Sports', image: I.womenHeels,   href: q('/women/clothing', 'clothingType', 'Pants') },
  { id: 'sweaters-m', label: 'Knitwear',       chip: 'Sports', image: I.menSneakers,  href: q('/men/clothing',   'clothingType', 'Sweaters / Turtlenecks / Jumpers') },
  { id: 'shoes-w',    label: 'Women Shoes',    chip: 'Sports', image: I.accessories,  href: '/women/shoes' },
  { id: 'shoes-m',    label: 'Men Shoes',      chip: 'Sports', image: I.bags,         href: '/men/shoes' },

  // ── Lounge & Underwear ──
  { id: 'pants-lw',   label: 'Pants',          chip: 'Lounge & Underwear', image: I.womenFashion, href: q('/women/clothing', 'clothingType', 'Pants') },
  { id: 'hoodies-lw', label: 'Hoodies',        chip: 'Lounge & Underwear', image: I.menFashion,   href: q('/women/clothing', 'clothingType', 'Hoodies / Sweatshirts') },
  { id: 'sweaters-lw',label: 'Sweaters',       chip: 'Lounge & Underwear', image: I.womenHeels,   href: q('/women/clothing', 'clothingType', 'Sweaters / Turtlenecks / Jumpers') },
  { id: 'tank-lw',    label: 'Tank Tops',      chip: 'Lounge & Underwear', image: I.menSneakers,  href: q('/women/clothing', 'clothingType', 'Tank Tops') },
  { id: 'acc-w',      label: 'Accessories',    chip: 'Lounge & Underwear', image: I.accessories,  href: '/women/accessories' },
  { id: 'acc-m',      label: 'Accessories (Men)', chip: 'Lounge & Underwear', image: I.bags,      href: '/men/accessories' },
];
