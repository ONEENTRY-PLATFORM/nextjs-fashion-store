import type { PageBlock } from './page-blocks';

/**
 * Header copy around an OE product block: the small eyebrow above the title,
 * an optional subtitle, and the "View all" link.
 *
 * The block already carries its heading (`block.title`); everything else used
 * to live in `data/sectionTitles.ts`, which meant an editor could rename the
 * carousel but not its eyebrow or its link target. Markers are probed in a
 * few spellings because tenants author these attributes by hand — same
 * heuristic approach `GenericCommonBlock` uses for `common_block`.
 */
export interface SectionChrome {
  eyebrow?: string;
  subtitle?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
}

const EYEBROW_MARKERS = ['section_eyebrow', 'block_eyebrow', 'eyebrow'];
const SUBTITLE_MARKERS = ['section_subtitle', 'block_subtitle', 'subtitle'];
const HREF_MARKERS = ['section_view_all_href', 'view_all_href', 'block_view_all_href', 'view_all_url'];
const LABEL_MARKERS = ['section_view_all_label', 'view_all_label', 'block_view_all_label'];

const readAttr = (block: PageBlock | undefined, markers: string[]): string | undefined => {
  const av = block?.attributeValues as Record<string, { value?: unknown }> | undefined;
  if (!av) return undefined;
  for (const marker of markers) {
    const v = av[marker]?.value;
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return undefined;
};

export function sectionChromeFromBlock(block: PageBlock | undefined): SectionChrome {
  return {
    ...(readAttr(block, EYEBROW_MARKERS) !== undefined && { eyebrow: readAttr(block, EYEBROW_MARKERS) }),
    ...(readAttr(block, SUBTITLE_MARKERS) !== undefined && { subtitle: readAttr(block, SUBTITLE_MARKERS) }),
    ...(readAttr(block, HREF_MARKERS) !== undefined && { viewAllHref: readAttr(block, HREF_MARKERS) }),
    ...(readAttr(block, LABEL_MARKERS) !== undefined && { viewAllLabel: readAttr(block, LABEL_MARKERS) }),
  };
}
