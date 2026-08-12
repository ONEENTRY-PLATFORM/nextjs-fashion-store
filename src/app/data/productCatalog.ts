export interface SizeOption {
  label: string;
  available: boolean;
}

export interface ProductSpec {
  key?: string;
  label: string;
  value: string;
}

export interface ProductReview {
  id: number;
  author: string;
  rating: number;
  date: string;
  title: string;
  body: string;
  size: string;
  helpful: number;
  verified: boolean;
}

export interface CatalogProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  salePrice?: number;
  image: string;
  colors: string[];
  colorImages?: string[];
  colorStock?: boolean[];
  badge?: string;
  inStock?: boolean;
  stock?: number;
  galleryImages?: string[];
  imageBlurs?: Record<string, string>;
  sizeOptions?: SizeOption[];
  specs?: ProductSpec[];
  reviews?: ProductReview[];
  recommendedId?: string;
  specialOffersId?: string;
  productDetails?: string[];
  descriptionHtml?: string;
  careInstructions?: string[];
  clothingType?: string;
  shoeType?: string;
  bagType?: string;
  accessoryType?: string;
  material?: string;
  gender?: string;
  variants?: PdpProductVariant[];
}

export interface PdpProductVariant {
  id: string;
  colors: string[];
  sizes: string[];
  inStock: boolean;
  stock?: number;
  price?: number;
  salePrice?: number;
  sku?: string;
  image?: string;
  images?: string[];
  imageBlurs?: Record<string, string>;
  descriptionHtml?: string;
  statusIdentifier?: string;
}

export { hexToColorName } from '@/app/utils/colorNames';
