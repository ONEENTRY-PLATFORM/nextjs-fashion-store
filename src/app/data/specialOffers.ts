/**
 * PDP special-offer / bundle types. The actual offer data used to live here
 * as `WOMEN_CLOTHING_OFFERS`, `MEN_BAGS_OFFERS`, … and `SPECIAL_OFFERS_CATALOG`,
 * but those records were only consumed by an RTK Query hook
 * (`useGetSpecialOffersQuery`) that no page ever called. The hook + arrays
 * were removed; only the shape interfaces remain so `ProductDetailPage` and
 * `ProductSpecialOffers` can keep their typed slots and accept future
 * OE-driven bundle blocks.
 */

interface SpecialOfferItem {
  id: string;
  name: string;
  image: string;
  originalPrice: string;
  salePrice: string;
}

export interface SpecialOffer {
  id: string;
  title: string;
  savings: string;
  bundlePrice: string;
  products: SpecialOfferItem[];
}
