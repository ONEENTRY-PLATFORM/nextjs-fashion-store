import type { Metadata } from 'next';
import { Suspense } from 'react';

import { JsonLd } from '@/app/components/system/JsonLd';
import type { CatalogProduct as PdpCatalogProduct } from '@/app/data/productCatalog';
import { PRODUCT_META_COPY as PM, SCHEMA_BREADCRUMBS as BC, SITE_URL } from '@/app/data/seoData';
import { FrequentlyOrderedAsync } from '@/app/pages/product/FrequentlyOrderedAsync';
import { RecommendationsSkeleton } from '@/app/pages/product/RecommendationsSkeleton';
import { ReviewsAsync } from '@/app/pages/product/ReviewsAsync';
import { ReviewsSkeleton } from '@/app/pages/product/ReviewsSkeleton';
import { ProductDetailPage } from '@/app/pages/ProductDetailPage';
import { priceValidUntil } from '@/app/utils/price-valid-until';
import { loadProductBlocks } from '@/lib/oneentry/blocks/page-blocks';
import { adaptCatalogProductToPdpProduct } from '@/lib/oneentry/catalog/adapt';
import { loadCatalogRoutes } from '@/lib/oneentry/catalog/catalog-routes';
import { categoryPathToBreadcrumbs, categoryPathToViewAllHref, loadProductById } from '@/lib/oneentry/catalog/products';
import { loadProductSpecLabels } from '@/lib/oneentry/catalog/spec-labels';
import { loadStores } from '@/lib/oneentry/catalog/stores';
import { getSiteSettings } from '@/lib/oneentry/dictionary';
import { loadPurchaseBonusForProduct } from '@/lib/oneentry/discounts/purchase-bonus';
import { FormPlaceholdersProvider } from '@/lib/oneentry/forms/FormPlaceholdersContext';
import { loadFormContent } from '@/lib/oneentry/forms/placeholders';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const numericId = /^\d+$/.test(id) ? Number(id) : null;
  const product =
    numericId !== null
      ? await loadProductById(numericId).then((p) => (p ? adaptCatalogProductToPdpProduct(p) : null))
      : null;

  // Brand name, currency and the delivery promise quoted in the description
  // are editor-owned, and must match the offer the same page publishes as
  // structured data further down.
  const { brand: siteBrand, commerce, currency } = await getSiteSettings();

  if (!product) {
    return {
      title: PM.notFoundTitleTpl(siteBrand.siteName),
      robots: { index: false, follow: false },
    };
  }

  const price = PM.pricedAsTpl(currency.symbol, product.salePrice, product.price);

  const title = `${product.name} | ${product.brand ?? siteBrand.siteName}`;
  const description = `${PM.buyTpl(product.name, product.brand ?? siteBrand.siteName, price)} ${
    product.productDetails?.[0] ?? PM.fallbackDescription
  } ${PM.shippingNoteTpl(currency.symbol, commerce.freeShippingThreshold)}`;

  return {
    title,
    description,
    keywords: [
      product.name,
      product.brand,
      product.clothingType ?? product.shoeType ?? product.bagType ?? product.accessoryType,
      product.material,
      PM.keywordBuyOnline,
      siteBrand.siteName,
    ]
      .filter(Boolean)
      .join(', '),
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${SITE_URL}/product/${id}`,
      siteName: siteBrand.siteName,
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
      data1: product.salePrice ? `${currency.symbol}${product.salePrice}` : `${currency.symbol}${product.price}`,
      label2: PM.twitterAvailLabel,
      data2: product.inStock === false ? PM.outOfStock : PM.inStock,
    },
    // Facebook product namespace tags for richer social previews
    other: {
      'product:price:amount': product.salePrice ?? product.price,
      'product:price:currency': currency.code,
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
  // Brand, currency and the delivery / returns terms published as structured
  // data are editor-owned — the same values the metadata above quotes.
  const { brand: siteBrand, commerce, currency } = await getSiteSettings();
  // PDP copy now travels with the root layout's dictionary, so this is just
  // the product load. `loadPurchaseBonusForProduct` still waits on it (it
  // reads the id / price / categories).
  const oeProductRaw = numericId !== null ? await loadProductById(numericId) : null;
  // Purchase-bonus badge: shown only when the OE `purchase-of-goods` rule
  // applies to this product. Loaded server-side so the block is either
  // rendered with the computed points or omitted entirely.
  const purchaseBonus = oeProductRaw ? await loadPurchaseBonusForProduct(oeProductRaw) : null;
  // Reviews used to be pre-seeded here with a sync `loadProductReviews(50)`
  // for the sub-title stars + "(N reviews)" hint, but that added a whole OE
  // form-data round-trip to TTFB. Now the sub-title stars start at 0 on the
  // initial paint and hydrate from `<ReviewsAsync>` which streams the same
  // data — same UX after ~100 ms of streaming, hundreds of ms off TTFB.
  // Specification row labels live in the `product_specs` OE set; the adapter
  // takes them as an argument so it can stay synchronous for tests/previews.
  const specLabels = oeProductRaw ? await loadProductSpecLabels() : null;
  const oeProduct: PdpCatalogProduct | null = oeProductRaw
    ? adaptCatalogProductToPdpProduct(oeProductRaw, specLabels ?? undefined)
    : null;
  const product = oeProduct;
  // Build the breadcrumb chain from the product's OE category path so each
  // product lands on its actual taxonomy rather than a hardcoded one. The
  // gender segment (`women`) has no route of its own — the storefront enters
  // that taxonomy through its first category (`/women/clothing`), so resolve
  // it from the CMS catalog tree and let the crumb link there. When OE is
  // unreachable the crumb simply stays unlinked.
  const productCategory = oeProductRaw?.categories?.[0];
  const genderSegment = (productCategory ?? '').split('/').filter(Boolean)[0];
  const genderHref = await (async () => {
    if (!genderSegment) return undefined;
    const routes = (await loadCatalogRoutes()).filter((r) => r.gender === genderSegment);
    // `clothing` is the landing every other gender link in the storefront uses
    // (`PAGE_REGISTRY`, the empty-cart CTA, the store locator …). Fall back to
    // whichever category the CMS lists first when the tenant has no such leaf.
    const landing = routes.find((r) => r.path === `${genderSegment}/clothing`) ?? routes[0];
    return landing ? `/${landing.path}` : undefined;
  })();
  const categoryBreadcrumbs = categoryPathToBreadcrumbs(productCategory, genderHref);

  // Aggregate rating computed from OE product reviews. Empty cohort defaults
  // to 0 — schema.org consumers handle a 0-count rating gracefully.
  const reviews = product?.reviews ?? [];
  const avgRating =
    reviews.length > 0 ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : 0;

  const productSpecs = product?.specs ?? [];
  const materialSpec = productSpecs.find(
    (s) => s.label === PM.specCompositionLabel || s.label === PM.specMaterialLabel,
  );

  const productSchema = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: [product.image, ...(product.galleryImages ?? [])].filter(Boolean),
        description: product.productDetails?.[0] ?? `${product.name} by ${product.brand ?? siteBrand.siteName}`,
        brand: {
          '@type': 'Brand',
          name: product.brand ?? siteBrand.siteName,
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
          priceCurrency: currency.code,
          price: product.salePrice ?? product.price,
          priceValidUntil: priceValidUntil(),
          availability: product.inStock !== false ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: {
            '@type': 'Organization',
            name: siteBrand.siteName,
          },
          shippingDetails: {
            '@type': 'OfferShippingDetails',
            shippingRate: {
              '@type': 'MonetaryAmount',
              value: product.price >= commerce.freeShippingThreshold ? '0' : String(commerce.standardShippingPrice),
              currency: currency.code,
            },
            shippingDestination: {
              '@type': 'DefinedRegion',
              addressCountry: commerce.deliveryCountry,
            },
            deliveryTime: {
              '@type': 'ShippingDeliveryTime',
              handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
              transitTime: {
                '@type': 'QuantitativeValue',
                minValue: commerce.deliveryMinDays,
                maxValue: commerce.deliveryMaxDays,
                unitCode: 'DAY',
              },
            },
          },
          hasMerchantReturnPolicy: {
            '@type': 'MerchantReturnPolicy',
            applicableCountry: commerce.deliveryCountry,
            returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
            merchantReturnDays: commerce.returnWindowDays,
            returnMethod: 'https://schema.org/ReturnByMail',
            returnFees: 'https://schema.org/FreeReturn',
          },
        },
      }
    : null;

  // Structured data mirrors the visible breadcrumb: the same category chain,
  // with each crumb's own url where the storefront has one. It used to list
  // the brand pointing at the site root, which described a trail no visitor
  // could follow.
  const breadcrumbSchema = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: BC.home, item: SITE_URL },
          ...categoryBreadcrumbs.map((crumb, i) => ({
            '@type': 'ListItem',
            position: i + 2,
            name: crumb.name,
            ...(crumb.href ? { item: `${SITE_URL}${crumb.href}` } : {}),
          })),
          {
            '@type': 'ListItem',
            position: categoryBreadcrumbs.length + 2,
            name: product.name,
            item: `${SITE_URL}/product/${id}`,
          },
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
  const categoryViewAllHref = categoryPathToViewAllHref(productCategory);
  // Full OE category path (e.g. `/women/women_clothing/outerwear`) — used by
  // the recommendations carousel to backfill from the same shelf when the
  // stats-driven `frequently_ordered_block` has too few products.
  const productCategoryPath = productCategory;
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
  const reviewsSlot =
    numericId !== null ? (
      <Suspense fallback={<ReviewsSkeleton />}>
        <ReviewsAsync productId={numericId} />
      </Suspense>
    ) : null;
  const recommendationsSlot =
    numericId !== null ? (
      <Suspense fallback={<RecommendationsSkeleton />}>
        <FrequentlyOrderedAsync
          productId={numericId}
          categoryViewAllHref={categoryViewAllHref}
          productGender={effectiveGender}
        />
      </Suspense>
    ) : null;

  // OE-attached product blocks (`Products.getProductBlockById`). Rendered
  // via `<PageBlocksRenderer>` inside `ProductDetailPage`. Empty when the
  // product has no admin-attached blocks.
  const productBlocks = numericId !== null ? await loadProductBlocks(numericId) : [];

  // Reserve-in-store picker: real branches from the OE `stores` page tree,
  // slimmed to what the modal renders. Previously the modal shipped five
  // hardcoded London stores with invented stock badges.
  const reserveStores = (await loadStores()).map((s) => ({
    id: s.id,
    ...(s.oeId !== undefined && { oeId: s.oeId }),
    name: s.name,
    address: [s.address, s.postcode].filter(Boolean).join(', '),
  }));

  // `reserve_in_store` is the one OE form that only this route renders, so its
  // content is loaded here instead of the root layout — no reason to ship it in
  // every other page's RSC payload. `FormPlaceholdersProvider` merges with the
  // layout-level map, so the newsletter / review copy stays readable below.
  const reserveInStoreForm = await loadFormContent('reserve_in_store');

  return (
    <>
      {productSchema && <JsonLd data={productSchema} />}
      {breadcrumbSchema && <JsonLd data={breadcrumbSchema} />}
      <FormPlaceholdersProvider forms={{ reserve_in_store: reserveInStoreForm }}>
        <ProductDetailPage
          initialProduct={oeProduct ?? undefined}
          categoryBreadcrumbs={categoryBreadcrumbs}
          reviewsSlot={reviewsSlot}
          recommendationsSlot={recommendationsSlot}
          currentGender={oeProductRaw?.gender}
          bonusPoints={purchaseBonus?.points}
          categoryViewAllHref={categoryViewAllHref}
          productBlocks={productBlocks}
          reserveStores={reserveStores}
        />
      </FormPlaceholdersProvider>
    </>
  );
}
