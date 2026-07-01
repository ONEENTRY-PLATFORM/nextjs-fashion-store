'use client'
import { PRICE_RANGE_LABELS as L } from '../data/commonLabels';
import { CURRENCY } from '../data/currencyConfig';

interface PriceRangeSliderProps {
  minBound: number;
  maxBound: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
}

export function PriceRangeSlider({ minBound, maxBound, value, onChange }: PriceRangeSliderProps) {
  const leftPct = ((value[0] - minBound) / (maxBound - minBound)) * 100;
  const rightPct = ((value[1] - minBound) / (maxBound - minBound)) * 100;

  return (
    <div className="px-4 py-4 min-w-[260px]">
      <div className="relative mb-5 h-[4px]">
        <div className="absolute inset-0 bg-gray-200" />
        <div
          className="absolute h-full bg-[var(--accent)]"
          style={{ left: leftPct + '%', width: (rightPct - leftPct) + '%' }}
        />
      </div>
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>{L.minPrice}</span>
          <span className="text-black font-semibold">{CURRENCY.formatInteger(value[0])}</span>
        </div>
        <input
          type="range" min={minBound} max={maxBound} value={value[0]}
          onChange={e => onChange([Math.min(+e.target.value, value[1] - 10), value[1]])}
          className="w-full [accent-color:var(--accent)]"
        />
      </div>
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>{L.maxPrice}</span>
          <span className="text-black font-semibold">{CURRENCY.formatInteger(value[1])}</span>
        </div>
        <input
          type="range" min={minBound} max={maxBound} value={value[1]}
          onChange={e => onChange([value[0], Math.max(+e.target.value, value[0] + 10)])}
          className="w-full [accent-color:var(--accent)]"
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 border border-gray-300 px-2 py-1.5 flex-1 focus-within:border-black transition-colors">
          <span className="text-xs text-gray-400">{CURRENCY.symbol}</span>
          <input
            type="number" min={minBound} max={maxBound} value={value[0]}
            onChange={e => onChange([Math.min(+e.target.value, value[1] - 10), value[1]])}
            className="w-full text-xs focus-visible:outline-none bg-transparent"
          />
        </div>
        <span className="text-gray-300 text-sm">—</span>
        <div className="flex items-center gap-1 border border-gray-300 px-2 py-1.5 flex-1 focus-within:border-black transition-colors">
          <span className="text-xs text-gray-400">{CURRENCY.symbol}</span>
          <input
            type="number" min={minBound} max={maxBound} value={value[1]}
            onChange={e => onChange([value[0], Math.max(+e.target.value, value[0] + 10)])}
            className="w-full text-xs focus-visible:outline-none bg-transparent"
          />
        </div>
      </div>
    </div>
  );
}
