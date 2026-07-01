const MULTI_GRADIENT =
  'conic-gradient(#f00 0deg,#ff0 60deg,#0f0 120deg,#0ff 180deg,#00f 240deg,#f0f 300deg,#f00 360deg)';

interface ColorSwatchProps {
  color: string;
  selected: boolean;
  /** Diameter in px. Default: 14 */
  size?: number;
}

export function ColorSwatch({ color, selected, size = 14 }: ColorSwatchProps) {
  const isWhite = color === '#FFFFFF' || color === '#FFFFFFFF';
  const outlineWidth = size >= 20 ? '2.5px' : '2px';
  const outlineOffset = size >= 20 ? 1.5 : 1;

  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        background: color === 'multi' ? MULTI_GRADIENT : color,
        border: isWhite ? '1px solid #ddd' : 'none',
        outline: selected ? `${outlineWidth} solid #000` : 'none',
        outlineOffset,
      }}
    />
  );
}
