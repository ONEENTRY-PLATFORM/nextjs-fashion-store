/**
 * Returns '#000' or '#fff' — whichever has better contrast
 * against the given background hex color.
 */
export function strikeColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? '#000' : '#fff';
}
