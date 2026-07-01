/** UI timing constants (milliseconds). Use these instead of magic numbers. */
export const TIMINGS = {
  /** Long-press duration to show product title tooltip */
  LONG_PRESS_TOOLTIP: 500,
  /** How long the "Added!" badge stays visible on ProductCard */
  ADDED_TO_CART_DISPLAY: 1500,
  /** Delay before hiding the title tooltip after pointer leaves */
  TOOLTIP_HIDE: 1800,
  /** HeroSlider auto-advance interval */
  HERO_SLIDE_INTERVAL: 5000,
  /** HeroSlider CSS transition duration */
  HERO_SLIDE_TRANSITION: 600,
  /** Login mock network delay */
  LOGIN_MOCK_DELAY: 600,
} as const;

/** Storage keys used in sessionStorage / localStorage (outside Redux). */
export const STORAGE_KEYS = {
  HOMEPAGE_ANIMATED: 'homepageAnimated',
} as const;

/** Limits for Redux slices. */
export const LIMITS = {
  RECENTLY_VIEWED_MAX: 100,
} as const;
