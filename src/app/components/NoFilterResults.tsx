'use client'
import Image from 'next/image';
import { COMMON_EMPTY_STATES as L } from '../data/commonLabels';

interface NoFilterResultsProps {
  onClearAll: () => void;
}

export function NoFilterResults({ onClearAll }: NoFilterResultsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      {/* Icon */}
      <div className="mb-6">
        <Image src="/icons/ui/no-results.svg" alt="" width={64} height={64} unoptimized />
      </div>

      {/* Heading */}
      <h3 className="text-base font-medium tracking-wide uppercase mb-2 text-[#111]">
        {L.noResultsFound}
      </h3>

      {/* Subtext */}
      <p className="text-sm text-gray-400 mb-8 max-w-xs leading-relaxed">
        {L.noFilterResultsBody}
      </p>

      {/* CTA */}
      <button
        onClick={onClearAll}
        className="px-8 py-2.5 text-xs tracking-widest uppercase text-white bg-black hover:bg-gray-800 transition-colors focus-visible:outline-none rounded-none"
      >
        {L.clearAllFilters}
      </button>
    </div>
  );
}
