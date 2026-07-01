import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSlides = vi.fn();

vi.mock('../index', () => ({
  oneentry: { Blocks: { getSlides } },
  isOneEntryEnabled: true,
}));

const importFresh = async () => {
  vi.resetModules();
  return import('./category-section');
};

beforeEach(() => { getSlides.mockReset(); });

describe('loadCategorySection', () => {
  it('groups child slides under parent chips and normalizes them', async () => {
    getSlides.mockResolvedValue({
      items: [
        // Parents (chips) — SDK already returns attributeValues flat (no lang wrapper)
        { id: 1, parentId: null, position: 1, attributeValues: { string_id1: 'Outerwear' } },
        { id: 2, parentId: null, position: 2, attributeValues: { string_id1: 'Tops' } },
        // Children
        {
          id: 10,
          parentId: 1,
          position: 1,
          attributeValues: {
            string_id1: 'Jackets',
            image_id4: [{ downloadLink: 'https://cdn/jackets.jpg' }],
          },
        },
        {
          id: 11,
          parentId: 2,
          position: 1,
          attributeValues: {
            string_id1: 'T-Shirts',
            string_id3: '/men/clothing?clothingType=T-Shirts',
            image_id4: [{ downloadLink: 'https://cdn/tshirts.jpg' }],
          },
        },
      ],
    });
    const { loadCategorySection } = await importFresh();
    const result = await loadCategorySection();
    expect(result.chips).toEqual(['Outerwear', 'Tops']);
    expect(result.categories).toEqual([
      {
        id: 'outerwear-jackets',
        label: 'Jackets',
        chip: 'Outerwear',
        image: 'https://cdn/jackets.jpg',
        href: '/women/clothing?clothingType=Jackets',
      },
      {
        id: 'tops-t-shirts',
        label: 'T-Shirts',
        chip: 'Tops',
        image: 'https://cdn/tshirts.jpg',
        href: '/men/clothing?clothingType=T-Shirts',
      },
    ]);
  });

  it('drops children without image or label', async () => {
    getSlides.mockResolvedValue({
      items: [
        { id: 1, parentId: null, attributeValues: { string_id1: 'Sports' } },
        { id: 10, parentId: 1, attributeValues: { string_id1: 'No image' } },
        { id: 11, parentId: 1, attributeValues: { image_id4: [{ downloadLink: 'x' }] } },
      ],
    });
    const { loadCategorySection } = await importFresh();
    const result = await loadCategorySection();
    expect(result.categories).toEqual([]);
  });

  it('returns empty result when SDK throws', async () => {
    getSlides.mockRejectedValue(new Error('boom'));
    const { loadCategorySection } = await importFresh();
    expect(await loadCategorySection()).toEqual({ chips: [], categories: [] });
  });
});

describe('loadCategorySection — disabled', () => {
  it('returns empty result when SDK is disabled', async () => {
    vi.resetModules();
    vi.doMock('../index', () => ({ oneentry: null, isOneEntryEnabled: false }));
    const { loadCategorySection } = await import('./category-section');
    expect(await loadCategorySection()).toEqual({ chips: [], categories: [] });
    vi.doUnmock('../index');
  });
});
