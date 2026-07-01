'use client'
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { type Product } from './ProductCard';
import { SALE_COLOR } from '../constants/colors';
import { TIMINGS } from '../constants/timings';
import { PRODUCT_CARD_LABELS } from '../data/commonLabels';
import { useProductCardT } from '../../lib/oneentry/labels/ProductCardLabelsContext';
import { useCart } from '../context/CartContext';
import { hexToColorName } from '../utils/colorNames';

/* ─── List-view card (only when showListMode=true) ─── */
export function CatalogListProductCard({ product, accent }: { product: Product; accent: string }) {
  const [addedToCart, setAddedToCart] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [cartHovered, setCartHovered] = useState(false);
  const addedToCartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lAddToCart = useProductCardT('product-card_add_to_cart_cta', PRODUCT_CARD_LABELS.addToCart);
  const { addItem } = useCart();

  useEffect(() => {
    return () => { if (addedToCartTimerRef.current) clearTimeout(addedToCartTimerRef.current); };
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
      className="flex group border-b border-white"
      style={{ '--sale': SALE_COLOR, '--accent': accent } as React.CSSProperties}
    >
      <div className="relative flex-shrink-0 overflow-hidden w-[180px] aspect-[3/4] border-r border-white">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="180px"
          className="object-cover transition-transform duration-500 group-hover:scale-105 object-[center_top]"
        />
        {(product.label || product.badge) && (
          <span
            className={`absolute top-3 left-3 px-2 py-0.5 text-white text-xs tracking-wider uppercase rounded-none ${
              product.label === 'SALE' ? 'bg-[var(--sale)]' : 'bg-black'
            }`}
          >
            {product.label || product.badge}
          </span>
        )}
      </div>
      <div className="flex-1 p-5 md:p-6 flex flex-col justify-between font-[Inter,sans-serif]">
        <div>
          <h3 className="text-sm mb-1.5 font-medium">{product.name}</h3>
          <div className="flex items-center gap-2 mb-3">
            {product.salePrice ? (
              <>
                <span className="text-sm font-medium text-[var(--sale)]">{product.salePrice}</span>
                <span className="text-xs text-gray-400 line-through">{product.price}</span>
              </>
            ) : (
              <span className="text-sm font-medium">{product.price}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {product.colors.map((color) => (
              <div
                key={color}
                className="w-3.5 h-3.5 border-[1.5px] border-[#e0e0e0] rounded-none"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            onMouseEnter={() => setCartHovered(true)}
            onMouseLeave={() => setCartHovered(false)}
            onClick={handleAddToCart}
            className={`flex items-center gap-2 px-6 py-2.5 text-xs tracking-widest uppercase text-white focus-visible:outline-none rounded-none transition-colors duration-200 ${
              addedToCart ? 'bg-[var(--sale)]' : cartHovered ? 'bg-[var(--accent)]' : 'bg-black'
            }`}
          >
            <Image src="/icons/ui/bag.svg" alt="" width={13} height={13} unoptimized />
            {addedToCart ? PRODUCT_CARD_LABELS.added : lAddToCart}
          </button>
          <button
            onClick={() => setWishlisted(w => !w)}
            className="p-2 border border-gray-200 hover:border-black transition-colors rounded-none"
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
