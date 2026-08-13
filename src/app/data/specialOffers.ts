/** PDP special-offer / bundle types. */

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
