import React, { useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ProductReviewsSection } from '../app/pages/product/ProductReviewsSection';
import type { ProductReview } from '../app/components/ProductCard';

// ─── Mock reviews ────────────────────────────────────────────────────────────

const MOCK_REVIEWS: ProductReview[] = [
  {
    id: 1,
    author: 'Jane D.',
    rating: 5,
    date: '2024-11-15',
    title: 'Absolutely love this dress',
    body: 'The fabric is so soft and the fit is perfect. I ordered my usual size S and it fits beautifully. Will definitely buy again.',
    size: 'S',
    helpful: 12,
    verified: true,
  },
  {
    id: 2,
    author: 'Sophie L.',
    rating: 4,
    date: '2024-10-28',
    title: 'Great quality, slightly long',
    body: 'Love the material and the colour. The length runs a tiny bit long on me (I am 5\'4\') but otherwise perfect.',
    size: 'XS',
    helpful: 7,
    verified: true,
  },
  {
    id: 3,
    author: 'Maria K.',
    rating: 5,
    date: '2024-10-10',
    title: 'Perfect for special occasions',
    body: 'Wore this to a wedding and got so many compliments. The satin drapes beautifully and doesn\'t crease easily.',
    size: 'M',
    helpful: 20,
    verified: false,
  },
  {
    id: 4,
    author: 'Claire T.',
    rating: 3,
    date: '2024-09-05',
    title: 'Nice but runs small',
    body: 'Beautiful dress but I had to size up. Quality is good.',
    size: 'L',
    helpful: 4,
    verified: true,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildRatingCounts(reviews: ProductReview[]) {
  return [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => Math.round(r.rating) === stars).length;
    const pct = reviews.length ? (count / reviews.length) * 100 : 0;
    return { stars, count, pct };
  });
}

function avgOf(reviews: ProductReview[]) {
  if (!reviews.length) return 0;
  return (
    Math.round(
      (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10,
    ) / 10
  );
}

// ─── Wrapper provides the ref ─────────────────────────────────────────────────

type SectionProps = React.ComponentProps<typeof ProductReviewsSection>;

function ReviewsSectionWrapper(props: Omit<SectionProps, 'reviewsRef'>) {
  const ref = useRef<HTMLDivElement>(null);
  return <ProductReviewsSection {...props} reviewsRef={ref} />;
}

// ─── Meta ────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Components / ProductReviewsSection',
  component: ReviewsSectionWrapper,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    setShowAllReviews: () => {},
    setShowReviewModal: () => {},
  },
} satisfies Meta<typeof ReviewsSectionWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ─────────────────────────────────────────────────────────────────

export const WithReviews: Story = {
  name: 'Default — with reviews',
  args: {
    productReviews: MOCK_REVIEWS,
    avgRating: avgOf(MOCK_REVIEWS),
    ratingCounts: buildRatingCounts(MOCK_REVIEWS),
    visibleReviews: MOCK_REVIEWS.slice(0, 3),
    showAllReviews: false,
  },
};

export const ShowAll: Story = {
  name: 'Show All — all reviews visible',
  args: {
    productReviews: MOCK_REVIEWS,
    avgRating: avgOf(MOCK_REVIEWS),
    ratingCounts: buildRatingCounts(MOCK_REVIEWS),
    visibleReviews: MOCK_REVIEWS,
    showAllReviews: true,
  },
};

export const Empty: Story = {
  name: 'Empty — zero reviews (new empty-state UI)',
  args: {
    productReviews: [],
    avgRating: 0,
    ratingCounts: buildRatingCounts([]),
    visibleReviews: [],
    showAllReviews: false,
  },
};

export const EmptyWithPurchaseNotice: Story = {
  name: 'Empty — zero reviews + purchase notice (signed-in, no purchase)',
  args: {
    productReviews: [],
    avgRating: 0,
    ratingCounts: buildRatingCounts([]),
    visibleReviews: [],
    showAllReviews: false,
    purchaseNotice: 'Only shoppers who have received this product can leave a review.',
  },
};
