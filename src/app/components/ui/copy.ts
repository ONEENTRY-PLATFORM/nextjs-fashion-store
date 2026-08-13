/** Copy shared by this feature's components, overlaid by the OneEntry dictionary at render time. */

export const CAROUSEL_LABELS = {
  previous: 'Previous',
  next: 'Next',
  previousSlide: 'Previous slide',
  nextSlide: 'Next slide',
  slides: 'Slides',
  featuredCollections: 'Featured collections',
  carouselRole: 'carousel',
  slideRole: 'slide',
} as const;

export const HORIZONTAL_SCROLLER_LABELS = {
  scrollLeft: 'Scroll left',
  scrollRight: 'Scroll right',
} as const;

export const SIZE_DROPDOWN_LABELS = {
  sizeLabel: 'Size:',
  clothingSizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const,
  shoeSizes: ['36', '37', '38', '39', '40', '41', '42'] as const,
  oneSize: 'One Size',
} as const;
