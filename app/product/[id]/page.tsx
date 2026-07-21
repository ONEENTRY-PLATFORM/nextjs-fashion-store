import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  SITE_NAME, SITE_URL, CURRENCY,
  FREE_SHIPPING_THRESHOLD, RETURN_WINDOW_DAYS,
  DELIVERY_COUNTRY, DELIVERY_MIN_DAYS, DELIVERY_MAX_DAYS,
  SCHEMA_BREADCRUMBS as BC,
  PRODUCT_META_COPY as PM,
} from '../../../src/app/data/seoData';
import { ProductDetailPage } from '../../../src/app/pages/ProductDetailPage';
import { JsonLd } from '../../../src/app/components/JsonLd';
import { loadPdpSystemTexts } from '../../../src/lib/oneentry/labels/pdp-labels';
import { PdpLabelsProvider } from '../../../src/lib/oneentry/labels/PdpLabelsContext';
import { loadProductById, categoryPathToBreadcrumbs, categoryPathToViewAllHref } from '../../../src/lib/oneentry/catalog/products';
import { adaptCatalogProductToPdpProduct } from '../../../src/lib/oneentry/catalog/adapt';
import { loadPurchaseBonusForProduct } from '../../../src/lib/oneentry/discounts/purchase-bonus';
import { ReviewsAsync } from '../../../src/app/pages/product/ReviewsAsync';
import { ReviewsSkeleton } from '../../../src/app/pages/product/ReviewsSkeleton';
import { FrequentlyOrderedAsync } from '../../../src/app/pages/product/FrequentlyOrderedAsync';
import { RecommendationsSkeleton } from '../../../src/app/pages/product/RecommendationsSkeleton';
import { loadProductBlocks } from '../../../src/lib/oneentry/blocks/page-blocks';
import type { CatalogProduct as PdpCatalogProduct } from '../../../src/app/data/productCatalog';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const numericId = /^\d+$/.test(id) ? Number(id) : null;
  const product = numericId !== null
    ? await loadProductById(numericId).then((p) => p ? adaptCatalogProductToPdpProduct(p) : null)
    : null;

  if (!product) {
    return {
      title: PM.notFoundTitleTpl(SITE_NAME),
      robots: { index: false, follow: false },
    };
  }

  const price = PM.pricedAsTpl(product.salePrice, product.price);

  const title = `${product.name} | ${product.brand ?? SITE_NAME}`;
  const description = `${PM.buyTpl(product.name, product.brand ?? SITE_NAME, price)} ${
    product.productDetails?.[0] ?? PM.fallbackDescription
  } ${PM.shippingNote}`;

  return {
    title,
    description,
    keywords: [
      product.name,
      product.brand,
      product.clothingType ?? product.shoeType ?? product.bagType ?? product.accessoryType,
      product.material,
      PM.keywordBuyOnline,
      SITE_NAME,
    ]
      .filter(Boolean)
      .join(', '),
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${SITE_URL}/product/${id}`,
      siteName: SITE_NAME,
      images: [
        {
          url: product.image,
          width: 1080,
          height: 1080,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [product.image],
      // Price + availability shown directly in Twitter card preview
      // @ts-expect-error Next.js Metadata doesn't type custom twitter fields
      label1: PM.twitterPriceLabel,
      data1: product.salePrice ? `${PM.displaySymbol}${product.salePrice}` : `${PM.displaySymbol}${product.price}`,
      label2: PM.twitterAvailLabel,
      data2: product.inStock === false ? PM.outOfStock : PM.inStock,
    },
    // Facebook product namespace tags for richer social previews
    other: {
      'product:price:amount': product.salePrice ?? product.price,
      'product:price:currency': CURRENCY,
    },
    alternates: { canonical: `${SITE_URL}/product/${id}` },
    robots: { index: true, follow: true },
  };
}

// ISR route: PDP HTML is cached for 2 min, then background revalidation
// refreshes it. Kept intentionally short because a stale price / stock on
// PDP could produce a paid stale order. Belt-and-braces safety: the
// place-order handler runs a fresh `previewOrder` right before creating
// the order (see `src/app/pages/PaymentPage.tsx`). Loader-level TTLs
// (products / reviews / bonus) are separately env-tunable via
// `ISR_PRODUCT_TTL_SEC` in `src/lib/isr.ts`.
//
// This value MUST be a literal — Next.js statically analyses route
// segment config at build time and rejects imported / re-exported /
// computed values with "Invalid segment configuration export detected".
export const revalidate = 120;

// Next.js 16: routes with a dynamic segment (`[id]`) that don't declare
// `generateStaticParams` are treated as fully dynamic — `revalidate` above is
// silently ignored and every request re-SSRs. Returning `[]` here tells the
// framework "no build-time prerendering, but still opt into on-demand ISR" —
// the first request per id generates + caches, subsequent hits within the
// revalidate window get an instant Next.js Data Cache hit. Add popular ids
// (e.g. top-100 by traffic) later if we want them warm at deploy time.
export async function generateStaticParams() {
  return [];
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const numericId = /^\d+$/.test(id) ? Number(id) : null;
  // Load the product and the system-text bundle in parallel. Previously these
  // were three sequential `await`s that summed into TTFB; now the max of two
  // parallel calls sets the floor. `loadPurchaseBonusForProduct` still waits
  // on the product (it reads the id / price / categories) so it kicks off
  // right after the first await resolves — small penalty vs. the win of
  // batching the two big independent calls together.
  const [oeProductRaw, pdpLabels] = await Promise.all([
    numericId !== null ? loadProductById(numericId) : Promise.resolve(null),
    loadPdpSystemTexts(),
  ]);
  // Purchase-bonus badge: shown only when the OE `purchase-of-goods` rule
  // applies to this product. Loaded server-side so the block is either
  // rendered with the computed points or omitted entirely.
  const purchaseBonus = oeProductRaw ? await loadPurchaseBonusForProduct(oeProductRaw) : null;
  // Reviews used to be pre-seeded here with a sync `loadProductReviews(50)`
  // for the sub-title stars + "(N reviews)" hint, but that added a whole OE
  // form-data round-trip to TTFB. Now the sub-title stars start at 0 on the
  // initial paint and hydrate from `<ReviewsAsync>` which streams the same
  // data — same UX after ~100 ms of streaming, hundreds of ms off TTFB.
  const oeProduct: PdpCatalogProduct | null = oeProductRaw
    ? adaptCatalogProductToPdpProduct(oeProductRaw)
    : null;
  const product = oeProduct;
  // Build breadcrumb labels from the product's OE category path so each
  // product lands on its actual taxonomy chain rather than a hardcoded one.
  const categoryBreadcrumbs = oeProductRaw
    ? categoryPathToBreadcrumbs(oeProductRaw.categories?.[0])
    : [];

  // Aggregate rating computed from OE product reviews. Empty cohort defaults
  // to 0 — schema.org consumers handle a 0-count rating gracefully.
  const reviews = product?.reviews ?? [];
  const avgRating = reviews.length > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  const productSpecs = product?.specs ?? [];
  const materialSpec = productSpecs.find((s) => s.label === PM.specCompositionLabel || s.label === PM.specMaterialLabel);

  const productSchema = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: [product.image, ...(product.galleryImages ?? [])].filter(Boolean),
        description: product.productDetails?.[0] ?? `${product.name} by ${product.brand ?? SITE_NAME}`,
        brand: {
          '@type': 'Brand',
          name: product.brand ?? SITE_NAME,
        },
        sku: id,
        ...(materialSpec ? { material: materialSpec.value } : {}),
        additionalProperty: productSpecs.map((s) => ({
          '@type': 'PropertyValue',
          name: s.label,
          value: s.value,
        })),
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: avgRating,
          reviewCount: reviews.length,
          bestRating: 5,
          worstRating: 1,
        },
        review: reviews.map((r) => ({
          '@type': 'Review',
          name: r.title,
          reviewBody: r.body,
          reviewRating: {
            '@type': 'Rating',
            ratingValue: r.rating,
            bestRating: 5,
            worstRating: 1,
          },
          author: {
            '@type': 'Person',
            name: r.author,
          },
          datePublished: r.date,
        })),
        offers: {
          '@type': 'Offer',
          url: `${SITE_URL}/product/${id}`,
          priceCurrency: CURRENCY,
          price: product.salePrice ?? product.price,
          priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          availability: product.inStock !== false ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: {
            '@type': 'Organization',
            name: SITE_NAME,
          },
          shippingDetails: {
            '@type': 'OfferShippingDetails',
            shippingRate: {
              '@type': 'MonetaryAmount',
              value: product.price >= FREE_SHIPPING_THRESHOLD ? '0' : '3.99',
              currency: CURRENCY,
            },
            shippingDestination: {
              '@type': 'DefinedRegion',
              addressCountry: DELIVERY_COUNTRY,
            },
            deliveryTime: {
              '@type': 'ShippingDeliveryTime',
              handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
              transitTime: { '@type': 'QuantitativeValue', minValue: DELIVERY_MIN_DAYS, maxValue: DELIVERY_MAX_DAYS, unitCode: 'DAY' },
            },
          },
          hasMerchantReturnPolicy: {
            '@type': 'MerchantReturnPolicy',
            applicableCountry: DELIVERY_COUNTRY,
            returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
            merchantReturnDays: RETURN_WINDOW_DAYS,
            returnMethod: 'https://schema.org/ReturnByMail',
            returnFees: 'https://schema.org/FreeReturn',
          },
        },
      }
    : null;

  const breadcrumbSchema = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: BC.home, item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: product.brand ?? BC.productsFallback, item: SITE_URL },
          { '@type': 'ListItem', position: 3, name: product.name, item: `${SITE_URL}/product/${id}` },
        ],
      }
    : null;

  // Reviews and the "You May Also Like" carousel each get their own Suspense
  // boundary so the main PDP body renders immediately. The skeletons stay on
  // screen until OE finishes resolving the form-data records and the
  // frequently-ordered block respectively.
  // Derive the "View all in this category" href from the product's OE
  // taxonomy path (e.g. `/women/women_clothing/costumes` → `/women/clothing`).
  // Falls back to home when the product has no categories — no gender/type
  // is guessed from the id prefix (that legacy heuristic has been removed).
  const categoryViewAllHref = categoryPathToViewAllHref(oeProductRaw?.categories?.[0]);
  // Full OE category path (e.g. `/women/women_clothing/outerwear`) — used by
  // the recommendations carousel to backfill from the same shelf when the
  // stats-driven `frequently_ordered_block` has too few products.
  const productCategoryPath = oeProductRaw?.categories?.[0];
  // Effective gender for the recommendations filter. OE's `gender` attribute
  // is left blank on many products, but the category path (`/women/...` vs
  // `/men/...`) is authoritative — use it as a fallback so a women's product
  // never surfaces men's items in the carousel.
  const effectiveGender: 'W' | 'M' | 'U' | '' = (() => {
    const g = oeProductRaw?.gender;
    if (g) return g;
    const p = (productCategoryPath ?? '').toLowerCase();
    if (p.startsWith('/women')) return 'W';
    if (p.startsWith('/men')) return 'M';
    return '';
  })();
  const reviewsSlot = numericId !== null ? (
    <Suspense fallback={<ReviewsSkeleton />}>
      <ReviewsAsync productId={numericId} />
    </Suspense>
  ) : null;
  const recommendationsSlot = numericId !== null ? (
    <Suspense fallback={<RecommendationsSkeleton />}>
      <FrequentlyOrderedAsync productId={numericId} categoryViewAllHref={categoryViewAllHref} productGender={effectiveGender} />
    </Suspense>
  ) : null;

  // OE-attached product blocks (`Products.getProductBlockById`). Rendered
  // via `<PageBlocksRenderer>` inside `ProductDetailPage`. Empty when the
  // product has no admin-attached blocks.
  const productBlocks = numericId !== null ? await loadProductBlocks(numericId) : [];

  return (
    <>
      {productSchema && <JsonLd data={productSchema} />}
      {breadcrumbSchema && <JsonLd data={breadcrumbSchema} />}
      <PdpLabelsProvider data={pdpLabels}>
        <ProductDetailPage
          initialProduct={oeProduct ?? undefined}
          categoryBreadcrumbs={categoryBreadcrumbs}
          reviewsSlot={reviewsSlot}
          recommendationsSlot={recommendationsSlot}
          currentGender={oeProductRaw?.gender}
          bonusPoints={purchaseBonus?.points}
          categoryViewAllHref={categoryViewAllHref}
          productBlocks={productBlocks}
        />
      </PdpLabelsProvider>
    </>
  );
}
