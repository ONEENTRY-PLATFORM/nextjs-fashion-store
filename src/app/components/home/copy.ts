/** Copy shared by this feature's components, overlaid by the OneEntry dictionary at render time. */

export const SECTION_TITLES: Record<string, SectionTitle> = {
  bestSellers: {
    eyebrow: 'Collection',
    title: 'Best Sellers',
    viewAllHref: '/men/clothing?chip=Best+Sellers',
  },
  newArrivals: {
    eyebrow: 'Collection',
    title: 'New Arrivals',
    viewAllHref: '/new',
  },
  sale: {
    title: 'Sale',
    subtitle: 'Best prices – shop the sale now',
    viewAllHref: '/sale',
  },
};

export interface SectionTitle {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  viewAllHref: string;
}
