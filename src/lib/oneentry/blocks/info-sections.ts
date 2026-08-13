import type { PageBlock } from './page-blocks';

/** Marker prefix of the OE `common_block`s that carry the editorial sections of an info page. */
export const INFO_SECTION_BLOCK_PREFIX = 'info_section_';

/** One editorial section as authored in the OE admin panel. */
export interface InfoSectionContent {
  eyebrow: string;
  heading: string;
  body: string;
  image: string;
}

/** A question/answer pair harvested from the rendered sections. */
export interface FaqItem {
  question: string;
  answer: string;
}

const attrString = (block: PageBlock, marker: string): string => {
  const av = block.attributeValues as Record<string, { value?: unknown }> | undefined;
  const v = av?.[marker]?.value;
  return typeof v === 'string' ? v : '';
};

/** Adapt OE section blocks to the info-page layout shape, sorted by the admin-defined position. */
export function infoSectionsFromBlocks(blocks: PageBlock[] | undefined): InfoSectionContent[] {
  if (!blocks?.length) return [];
  return blocks
    .filter((b) => b.marker?.startsWith(INFO_SECTION_BLOCK_PREFIX))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((b) => ({
      eyebrow: attrString(b, 'info_section_eyebrow'),
      heading: attrString(b, 'info_section_title') || b.title || '',
      body: attrString(b, 'info_section_body'),
      image: attrString(b, 'info_section_image'),
    }))
    .filter((s) => s.heading.length > 0 || s.body.length > 0);
}

/** Question/answer pairs for `FAQPage` structured data, taken from the sections the page actually renders. */
export function faqItemsFromBlocks(blocks: PageBlock[] | undefined): FaqItem[] {
  return infoSectionsFromBlocks(blocks)
    .map((s) => ({ question: s.heading.trim(), answer: s.body.trim() }))
    .filter((qa) => qa.question.endsWith('?') && qa.answer.length > 0);
}

/** `FAQPage` JSON-LD for the given pairs. */
export function buildFaqSchema(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}
