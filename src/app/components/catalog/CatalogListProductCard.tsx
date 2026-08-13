'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { type Product } from '@/app/components/product/ProductCard';
import CmsImage from '@/app/components/ui/CmsImage';
import { SALE_COLOR } from '@/app/constants/colors';
import { TIMINGS } from '@/app/constants/timings';
import { useCart } from '@/app/context/CartContext';
import { useWishlist } from '@/app/context/WishlistContext';
import { useMounted } from '@/app/hooks/useMounted';
import { hexToColorName } from '@/app/utils/colorNames';
import { stripTrailingZeros } from '@/app/utils/formatPrice';
import { useT } from '@/lib/oneentry/labels/DictContext';

export const CATALOG_LIST_CARD_LABELS = {
  addToCart: 'Add to Cart',
  added: 'Added!',
} as const;

/** Brand shown for products that arrive without one — data, not copy. */
export const CATALOG_LIST_CARD_DEFAULT_BRAND = 'Kekimoro';

/* ─── List-view card (only when showListMode=true) ─── */
export function CatalogListProductCard({ product, accent }: { product: Product; accent: string }) {
  const [addedToCart, setAddedToCart] = useState(false);
  const [cartHovered, setCartHovered] = useState(false);
  const mounted = useMounted();
  const addedToCartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lAddToCart = useT('product-card_add_to_cart_cta', CATALOG_LIST_CARD_LABELS.addToCart);
  const lAdded = useT('product-card-added', CATALOG_LIST_CARD_LABELS.added);
  const { addItem } = useCart();
  const { toggleItem, isWishlisted } = useWishlist();
  // `isWishlisted` returns Redux state that only lives on the client; reading it during SSR/hydration would emit a mismatch warning.
  const wishlisted = mounted && isWishlisted(product.id);

  useEffect(() => {
    return () => {
      if (addedToCartTimerRef.current) clearTimeout(addedToCartTimerRef.current);
    };
  }, []);

  const handleAddToCart = () => {
    const parsePrice = (s?: string) => parseFloat(String(s ?? '').replace(/[^\d.]/g, '')) || 0;
    const priceNumber = parsePrice(product.salePrice ?? product.price);
    const originalPriceNumber = product.salePrice ? parsePrice(product.price) : undefined;
    const firstColorHex = product.colors?.[0];
    addItem({
      id: product.id,
      name: product.name,
      brand: product.brand ?? '',
      color: firstColorHex ? hexToColorName(firstColorHex) : '',
      sku: product.id,
      size: product.sizes?.[0] ?? '',
      quantity: 1,
      price: priceNumber,
      ...(originalPriceNumber !== undefined && { originalPrice: originalPriceNumber }),
      image: product.image,
    });
    if (addedToCartTimerRef.current) clearTimeout(addedToCartTimerRef.current);
    setAddedToCart(true);
    addedToCartTimerRef.current = setTimeout(() => setAddedToCart(false), TIMINGS.ADDED_TO_CART_DISPLAY);
  };

  return (
    <div
      className="group flex border-b border-white"
      style={{ '--sale': SALE_COLOR, '--accent': accent } as React.CSSProperties}
    >
      <div className="relative aspect-3/4 w-45 shrink-0 overflow-hidden border-r border-white">
        <CmsImage
          src={product.image}
          blur={product.imageBlurs?.[product.image]}
          alt={product.name}
          fill
          sizes="180px"
          className="object-cover object-[center_top] transition-transform duration-500 group-hover:scale-105"
        />
        {(product.label || product.badge) && (
          <span
            className={`absolute top-3 left-3 rounded-none px-2 py-0.5 text-xs tracking-wider text-white uppercase ${
              product.label === 'SALE' ? 'bg-(--sale)' : 'bg-black'
            }`}
          >
            {product.label || product.badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between p-5 font-sans md:p-6">
        <div>
          <h3 className="mb-1.5 text-sm font-medium">{product.name}</h3>
          <div className="mb-3 flex items-center gap-2">
            {product.salePrice ? (
              <>
                <span className="text-sm font-medium text-(--sale)">{stripTrailingZeros(product.salePrice)}</span>
                <span className="text-xs text-gray-400 line-through">{stripTrailingZeros(product.price)}</span>
              </>
            ) : (
              <span className="text-sm font-medium">{stripTrailingZeros(product.price)}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {product.colors.map((color) => (
              <div
                key={color}
                className="size-3.5 rounded-none border-[1.5px] border-[#e0e0e0]"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onMouseEnter={() => setCartHovered(true)}
            onMouseLeave={() => setCartHovered(false)}
            onClick={handleAddToCart}
            className={`flex items-center gap-2 rounded-none px-6 py-2.5 text-xs tracking-widest text-white uppercase transition-colors duration-200 focus-visible:outline-none ${
              addedToCart ? 'bg-(--sale)' : cartHovered ? 'bg-accent' : 'bg-black'
            }`}
          >
            <Image src="/icons/ui/bag.svg" alt="" width={13} height={13} unoptimized />
            {addedToCart ? lAdded : lAddToCart}
          </button>
          <button
            onClick={() => {
              // Real wishlist persistence.
              const colorImages = product.colors.map(
                (c, i) =>
                  product.variants?.find((v) => v.colors.includes(c))?.image ||
                  product.colorImages?.[i] ||
                  product.image,
              );
              toggleItem({
                id: product.id,
                name: product.name,
                brand: product.brand ?? CATALOG_LIST_CARD_DEFAULT_BRAND,
                price: product.price,
                salePrice: product.salePrice,
                image: product.image,
                colors: product.colors,
                colorImages,
                colorStock: product.colorStock,
                sizes: product.sizes ?? [],
                badge: product.badge ?? product.label,
                inStock: product.inStock !== false,
                selectedColor: product.colors[0],
              });
            }}
            className="rounded-none border border-gray-200 p-2 transition-colors hover:border-black"
          >
            <Image
              src={wishlisted ? '/icons/ui/heart-filled.svg' : '/icons/ui/heart-outline.svg'}
              alt=""
              width={14}
              height={14}
              unoptimized
            />
          </button>
        </div>
      </div>
    </div>
  );
}
