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
  return import('./homepage-collections');
};

beforeEach(() => {
  getSlides.mockReset();
});

describe('loadHomepageCollections', () => {
  it('maps OneEntry slides to typed items', async () => {
    getSlides.mockResolvedValue({
      items: [
        {
          id: 39,
          attributeValues: {
            string_id1: 'Best Dress for You',
            string_id2: 'Shop Dresses',
            string_id4: 'Shop Dresses',
            string_id5: '/women/clothing',
            image_id3: [{ downloadLink: 'https://cdn/dress.jpg' }],
          },
        },
      ],
    });
    const { loadHomepageCollections } = await importFresh();
    const items = await loadHomepageCollections();
    expect(items).toEqual([
      {
        id: 39,
        image: 'https://cdn/dress.jpg',
        title: 'Best Dress for You',
        subtitle: 'Shop Dresses',
        buttonText: 'Shop Dresses',
        link: '/women/clothing',
      },
    ]);
  });

  it('drops items without an image', async () => {
    getSlides.mockResolvedValue({
      items: [{ id: 1, attributeValues: { string_id1: 'no pic' } }],
    });
    const { loadHomepageCollections } = await importFresh();
    expect(await loadHomepageCollections()).toEqual([]);
  });

  it('returns [] when SDK throws', async () => {
    getSlides.mockRejectedValue(new Error('boom'));
    const { loadHomepageCollections } = await importFresh();
    expect(await loadHomepageCollections()).toEqual([]);
  });
});
