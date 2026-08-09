'use client';
import { useDict } from '../../../lib/oneentry/labels/DictContext';
import { PRICE_RANGE_LABELS as L_FALLBACK } from '../../data/commonLabels';
import { CURRENCY } from '../../data/currencyConfig';

interface PriceRangeSliderProps {
  minBound: number;
  maxBound: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
}

export function PriceRangeSlider({ minBound, maxBound, value, onChange }: PriceRangeSliderProps) {
  const L = useDict('interface_controls_price_', L_FALLBACK);
  const leftPct = ((value[0] - minBound) / (maxBound - minBound)) * 100;
  const rightPct = ((value[1] - minBound) / (maxBound - minBound)) * 100;

  return (
    <div className="min-w-65 p-4">
      <div className="relative mb-5 h-1">
        <div className="absolute inset-0 bg-gray-200" />
        <div className="absolute h-full bg-accent" style={{ left: leftPct + '%', width: rightPct - leftPct + '%' }} />
      </div>
      <div className="mb-3">
        <div className="mb-1.5 flex justify-between text-xs text-gray-500">
          <span>{L.minPrice}</span>
          <span className="font-semibold text-black">{CURRENCY.formatInteger(value[0])}</span>
        </div>
        <input
          type="range"
          min={minBound}
          max={maxBound}
          value={value[0]}
          onChange={(e) => onChange([Math.min(+e.target.value, value[1] - 10), value[1]])}
          className="w-full [accent-color:var(--accent)]"
        />
      </div>
      <div className="mb-4">
        <div className="mb-1.5 flex justify-between text-xs text-gray-500">
          <span>{L.maxPrice}</span>
          <span className="font-semibold text-black">{CURRENCY.formatInteger(value[1])}</span>
        </div>
        <input
          type="range"
          min={minBound}
          max={maxBound}
          value={value[1]}
          onChange={(e) => onChange([value[0], Math.max(+e.target.value, value[0] + 10)])}
          className="w-full [accent-color:var(--accent)]"
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-1 border border-gray-300 px-2 py-1.5 transition-colors focus-within:border-black">
          <span className="text-xs text-gray-400">{CURRENCY.symbol}</span>
          <input
            type="number"
            min={minBound}
            max={maxBound}
            value={value[0]}
            onChange={(e) => onChange([Math.min(+e.target.value, value[1] - 10), value[1]])}
            className="w-full bg-transparent text-xs focus-visible:outline-none"
          />
        </div>
        <span className="text-sm text-gray-300">—</span>
        <div className="flex flex-1 items-center gap-1 border border-gray-300 px-2 py-1.5 transition-colors focus-within:border-black">
          <span className="text-xs text-gray-400">{CURRENCY.symbol}</span>
          <input
            type="number"
            min={minBound}
            max={maxBound}
            value={value[1]}
            onChange={(e) => onChange([value[0], Math.max(+e.target.value, value[0] + 10)])}
            className="w-full bg-transparent text-xs focus-visible:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
