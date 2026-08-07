'use client'
import Image from 'next/image';
import { COMMON_EMPTY_STATES as L } from '../../data/commonLabels';
import { useT } from '../../../lib/oneentry/labels/DictContext';

interface NoFilterResultsProps {
  onClearAll: () => void;
}

export function NoFilterResults({ onClearAll }: NoFilterResultsProps) {
  const lHeading = useT('interface_controls_no_results_found', L.noResultsFound);
  const lBody    = useT('interface_controls_no_results_body',  L.noFilterResultsBody);
  const lClear   = useT('interface_controls_clear_all_filters', L.clearAllFilters);
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      {/* Icon */}
      <div className="mb-6">
        <Image src="/icons/ui/no-results.svg" alt="" width={64} height={64} unoptimized />
      </div>

      {/* Heading */}
      <h3 className="text-base font-medium tracking-wide uppercase mb-2 text-[#111]">
        {lHeading}
      </h3>

      {/* Subtext */}
      <p className="text-sm text-gray-400 mb-8 max-w-xs leading-relaxed">
        {lBody}
      </p>

      {/* CTA */}
      <button
        onClick={onClearAll}
        className="px-8 py-2.5 text-xs tracking-widest uppercase text-white bg-black hover:bg-gray-800 transition-colors focus-visible:outline-none rounded-none"
      >
        {lClear}
      </button>
    </div>
  );
}
