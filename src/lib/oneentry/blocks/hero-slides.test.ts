import { beforeEach, describe, expect, it, vi } from 'vitest';

// unstable_cache is transparent in tests — call the wrapped fn directly.
vi.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
}));

const getSlides = vi.fn();

vi.mock('../index', () => ({
  oneentry: { Blocks: { getSlides } },
  isOneEntryEnabled: true,
  isError: (v: unknown) =>
    !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
}));

const importFresh = async () => {
  vi.resetModules();
  return import('./hero-slides');
};

beforeEach(() => {
  getSlides.mockReset();
});

describe('loadHeroSlides', () => {
  it('maps OneEntry slide format to typed HeroSlideFromCms', async () => {
    getSlides.mockResolvedValue({
      total: 1,
      items: [
        {
          id: 7,
          position: 1,
          visible: true,
          attributeValues: {
            string_id1: 'The Stylist Edit',
            string_id2: "Women's Collection",
            string_id3: 'Curated looks',
            string_id5: 'Shop the Edit',
            string_id6: '/women/clothing',
            image_id4: [{ downloadLink: 'https://cdn/hero1.jpg' }],
          },
        },
      ],
    });
    const { loadHeroSlides } = await importFresh();
    const slides = await loadHeroSlides();
    expect(slides).toEqual([
      {
        id: 7,
        image: 'https://cdn/hero1.jpg',
        eyebrow: "Women's Collection",
        headline: 'The Stylist Edit',
        subtext: 'Curated looks',
        cta: 'Shop the Edit',
        href: '/women/clothing',
        align: 'left',
        gender: 'women',
      },
    ]);
  });

  it('drops slides without an image', async () => {
    getSlides.mockResolvedValue({
      items: [{ id: 1, attributeValues: { string_id1: 'No image slide' } }],
    });
    const { loadHeroSlides } = await importFresh();
    expect(await loadHeroSlides()).toEqual([]);
  });

  it('returns [] when SDK throws', async () => {
    getSlides.mockRejectedValue(new Error('boom'));
    const { loadHeroSlides } = await importFresh();
    expect(await loadHeroSlides()).toEqual([]);
  });
});

describe('loadHeroSlides — disabled', () => {
  it('returns [] when SDK is disabled', async () => {
    vi.resetModules();
    vi.doMock('../index', () => ({ oneentry: null, isOneEntryEnabled: false }));
    const { loadHeroSlides } = await import('./hero-slides');
    expect(await loadHeroSlides()).toEqual([]);
    vi.doUnmock('../index');
  });
});
