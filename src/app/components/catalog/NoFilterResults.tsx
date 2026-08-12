'use client';
import Image from 'next/image';

import { COMMON_EMPTY_STATES as L } from '@/app/components/catalog/copy';
import { useT } from '@/lib/oneentry/labels/DictContext';

interface NoFilterResultsProps {
  onClearAll: () => void;
}

export function NoFilterResults({ onClearAll }: NoFilterResultsProps) {
  const lHeading = useT('interface_controls_no_results_found', L.noResultsFound);
  const lBody = useT('interface_controls_no_results_body', L.noFilterResultsBody);
  const lClear = useT('interface_controls_clear_all_filters', L.clearAllFilters);
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      {/* Icon */}
      <div className="mb-6">
        <Image src="/icons/ui/no-results.svg" alt="" width={64} height={64} unoptimized />
      </div>

      {/* Heading */}
      <h3 className="mb-2 text-base font-medium tracking-wide text-[#111] uppercase">{lHeading}</h3>

      {/* Subtext */}
      <p className="mb-8 max-w-xs text-sm leading-relaxed text-gray-400">{lBody}</p>

      {/* CTA */}
      <button
        onClick={onClearAll}
        className="rounded-none bg-black px-8 py-2.5 text-xs tracking-widest text-white uppercase transition-colors hover:bg-gray-800 focus-visible:outline-none"
      >
        {lClear}
      </button>
    </div>
  );
}
