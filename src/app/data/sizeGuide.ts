/** Index signature so the row satisfies the generic table helpers below. */
export interface SizeRow extends Record<string, string> {
  size: string;
  us: string;
  bust: string;
  waist: string;
  hip: string;
}

export const SIZE_GUIDE_DATA: SizeRow[] = [
  { size: 'XS', us: '0-2', bust: '31-32"', waist: '24-25"', hip: '33-34"' },
  { size: 'S', us: '4-6', bust: '33-34"', waist: '26-27"', hip: '35-36"' },
  { size: 'M', us: '8-10', bust: '35-36"', waist: '28-29"', hip: '37-38"' },
  { size: 'L', us: '12-14', bust: '37-39"', waist: '30-32"', hip: '39-41"' },
  { size: 'XL', us: '16-18', bust: '40-42"', waist: '33-35"', hip: '42-44"' },
];

/** Column order of the pipe-separated rows an editor types in the admin panel. */
const SIZE_GUIDE_COLUMNS = ['size', 'us', 'bust', 'waist', 'hip'] as const;

/** Quick View shows the metric chart: `size|chest|waist|hips`. */
export const QUICK_VIEW_COLUMNS = ['size', 'chest', 'waist', 'hips'] as const;

export type QuickViewSizeRow = Record<(typeof QUICK_VIEW_COLUMNS)[number], string>;

/** Measurements, not copy. */
export const QUICK_VIEW_SIZE_DATA: readonly QuickViewSizeRow[] = [
  { size: 'XS', chest: '80–84', waist: '60–64', hips: '86–90' },
  { size: 'S', chest: '84–88', waist: '64–68', hips: '90–94' },
  { size: 'M', chest: '88–92', waist: '68–72', hips: '94–98' },
  { size: 'L', chest: '92–96', waist: '72–76', hips: '98–102' },
  { size: 'XL', chest: '96–100', waist: '76–80', hips: '102–106' },
  { size: 'XXL', chest: '100–104', waist: '80–84', hips: '106–110' },
];

/** Parse a CMS-authored measurement table. */
export function parseSizeTable<T extends Record<string, string>>(
  raw: string | undefined | null,
  columns: readonly (keyof T & string)[],
  fallback: readonly T[],
): readonly T[] {
  if (!raw) return fallback;
  const rows = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('|').map((cell) => cell.trim()))
    .filter((cells) => cells.length === columns.length && cells.every(Boolean))
    .map((cells) => Object.fromEntries(columns.map((c, i) => [c, cells[i]])) as T);
  return rows.length > 0 ? rows : fallback;
}

/** Serialise a table back to the editable form — used to seed the CMS value. */
export function serializeSizeTable<T extends Record<string, string>>(
  rows: readonly T[],
  columns: readonly (keyof T & string)[],
): string {
  return rows.map((r) => columns.map((c) => r[c]).join('|')).join('\n');
}

/** The PDP size guide (inches, with US sizes). */
export const parseSizeGuide = (raw: string | undefined | null): readonly SizeRow[] =>
  parseSizeTable<SizeRow>(raw, SIZE_GUIDE_COLUMNS, SIZE_GUIDE_DATA);

export const serializeSizeGuide = (rows: readonly SizeRow[]): string => serializeSizeTable(rows, SIZE_GUIDE_COLUMNS);
