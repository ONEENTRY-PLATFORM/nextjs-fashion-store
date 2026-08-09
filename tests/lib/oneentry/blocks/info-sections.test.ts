import { describe, expect, it } from 'vitest';

import { buildFaqSchema, faqItemsFromBlocks, infoSectionsFromBlocks } from '@/lib/oneentry/blocks/info-sections';
import type { PageBlock } from '@/lib/oneentry/blocks/page-blocks';

const block = (over: Partial<PageBlock> & { marker: string }): PageBlock => ({
  type: 'common_block',
  title: '',
  position: 0,
  products: [],
  ...over,
});

const section = (
  marker: string,
  attrs: { title?: string; body?: string; eyebrow?: string; image?: string },
  position = 0,
): PageBlock =>
  block({
    marker,
    position,
    attributeValues: {
      ...(attrs.title !== undefined && { info_section_title: { value: attrs.title } }),
      ...(attrs.body !== undefined && { info_section_body: { value: attrs.body } }),
      ...(attrs.eyebrow !== undefined && { info_section_eyebrow: { value: attrs.eyebrow } }),
      ...(attrs.image !== undefined && { info_section_image: { value: attrs.image } }),
    } as PageBlock['attributeValues'],
  });

describe('infoSectionsFromBlocks', () => {
  it('reads copy from attributeValues and sorts by admin position', () => {
    const blocks = [
      section('info_section_two', { title: 'Second', body: 'B' }, 2),
      section('info_section_one', { title: 'First', body: 'A', eyebrow: 'Eyebrow', image: 'img.jpg' }, 1),
    ];

    const sections = infoSectionsFromBlocks(blocks);
    expect(sections.map((s) => s.heading)).toEqual(['First', 'Second']);
    expect(sections[0]).toEqual({
      eyebrow: 'Eyebrow',
      heading: 'First',
      body: 'A',
      image: 'img.jpg',
    });
  });

  it('ignores blocks outside the info_section_ prefix', () => {
    const blocks = [
      section('info_section_a', { title: 'Kept', body: 'x' }),
      block({ marker: 'hero_slider', title: 'Dropped' }),
    ];
    expect(infoSectionsFromBlocks(blocks).map((s) => s.heading)).toEqual(['Kept']);
  });

  it('falls back to the block title when no title attribute is set', () => {
    const blocks = [block({ marker: 'info_section_a', title: 'Block title' })];
    expect(infoSectionsFromBlocks(blocks)[0]?.heading).toBe('Block title');
  });

  it('returns an empty list for missing or empty input', () => {
    expect(infoSectionsFromBlocks(undefined)).toEqual([]);
    expect(infoSectionsFromBlocks([])).toEqual([]);
  });
});

describe('faqItemsFromBlocks', () => {
  it('keeps only question-shaped sections that have an answer', () => {
    const blocks = [
      section('info_section_returns', { title: 'What is your return policy?', body: '30 days.' }, 1),
      section('info_section_story', { title: 'Our story', body: 'Founded in 2020.' }, 2),
      section('info_section_empty', { title: 'Do you ship abroad?', body: '   ' }, 3),
    ];

    expect(faqItemsFromBlocks(blocks)).toEqual([{ question: 'What is your return policy?', answer: '30 days.' }]);
  });

  it('returns nothing when the CMS has no Q&A sections — no schema is emitted', () => {
    const blocks = [section('info_section_story', { title: 'Our story', body: 'Founded in 2020.' })];
    expect(faqItemsFromBlocks(blocks)).toEqual([]);
    expect(faqItemsFromBlocks(undefined)).toEqual([]);
  });

  it('never invents content the page does not render', () => {
    // A block outside the rendered prefix must not leak into the markup.
    const blocks = [block({ marker: 'legacy_faq', title: 'Hidden question?' })];
    expect(faqItemsFromBlocks(blocks)).toEqual([]);
  });
});

describe('buildFaqSchema', () => {
  it('maps pairs to schema.org Question / acceptedAnswer nodes', () => {
    const schema = buildFaqSchema([{ question: 'Q?', answer: 'A.' }]);
    expect(schema).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Q?',
          acceptedAnswer: { '@type': 'Answer', text: 'A.' },
        },
      ],
    });
  });
});
