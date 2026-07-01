/** Canonical hex → human-readable name map for all product swatches. */
export const HEX_COLOR_NAMES: Record<string, string> = {
  '#000000': 'Black',       '#FFFFFF': 'White',       '#ffffff': 'White',
  '#808080': 'Gray',        '#A0A0A0': 'Light Gray',  '#C0C0C0': 'Silver',
  '#36454F': 'Charcoal',    '#4A3728': 'Dark Brown',  '#5C3A1E': 'Brown',
  '#8B4513': 'Saddle Brown','#A0522D': 'Sienna',       '#5C4A3A': 'Warm Brown',
  '#800020': 'Burgundy',    '#8B0000': 'Dark Red',     '#4A0000': 'Dark Maroon',
  '#1B3A5C': 'Navy',        '#4169E1': 'Royal Blue',   '#6495ED': 'Cornflower Blue',
  '#D4AF37': 'Gold',        '#C4A882': 'Camel',        '#C19A6B': 'Camel',
  '#F88A8A': 'Pink',        '#FFB6C1': 'Blush',        '#FFE4E1': 'Misty Rose',
  '#E8DCC8': 'Beige',       '#F5E6D3': 'Cream',        '#F5F5F0': 'Off-White',
  '#F5F0E8': 'Ivory',       '#DA1E1E': 'Red',           '#FF6B6B': 'Coral Red',
  '#FF6B00': 'Orange',      '#FFD700': 'Yellow',
  '#808000': 'Olive',       '#8B864E': 'Khaki',         '#BDB76B': 'Khaki',
  '#556B2F': 'Olive Green', '#2E8B57': 'Forest Green',  '#3D5A4C': 'Forest Green',
  '#800080': 'Purple',
};

/** Returns a human-readable colour name for a hex value, falling back to the hex itself. */
export function hexToColorName(hex: string): string {
  return HEX_COLOR_NAMES[hex.toUpperCase()] ?? HEX_COLOR_NAMES[hex] ?? hex;
}
