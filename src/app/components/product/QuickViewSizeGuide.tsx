'use client';
import { X } from 'lucide-react';

import {
  parseSizeTable,
  QUICK_VIEW_COLUMNS,
  QUICK_VIEW_SIZE_DATA,
  type QuickViewSizeRow,
  serializeSizeTable,
} from '@/app/data/sizeGuide';
import { useDict, useList, useT } from '@/lib/oneentry/labels/DictContext';

// ─── QuickViewSizeGuide ─────────────────────────────────────────────────────
export const SIZE_GUIDE_LABELS = {
  title: 'Size Guide',
  measurementsNote: 'All measurements are in centimeters (cm).',
  colHeaders: ['Size', 'Chest', 'Waist', 'Hips'] as const,
  tipNote: 'Tip: If you are between sizes, we recommend choosing the larger size.',
} as const;

export function QuickViewSizeGuide({ onClose }: { onClose: () => void }) {
  const L = useDict('size_guide_qv_', SIZE_GUIDE_LABELS);
  // Header row of the table — an array, so it needs a marker of its own.
  const colHeaders = useList('size_guide_qv_col_headers', L.colHeaders);
  const SIZE_GUIDE_ROWS = parseSizeTable<QuickViewSizeRow>(
    useT('size_guide_quick_view_rows', serializeSizeTable(QUICK_VIEW_SIZE_DATA, QUICK_VIEW_COLUMNS)),
    QUICK_VIEW_COLUMNS,
    QUICK_VIEW_SIZE_DATA,
  );
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-black/50"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="mx-4 max-h-[80vh] w-full max-w-lg overflow-y-auto bg-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-guide-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 id="size-guide-title" className="text-sm font-semibold tracking-widest uppercase">
            {L.title}
          </h3>
          <button onClick={onClose} className="transition-opacity hover:opacity-60">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="mb-4 text-xs text-gray-500">{L.measurementsNote}</p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                {colHeaders.map((h, i) => (
                  <th
                    key={h}
                    className={`border border-gray-200 px-3 py-2 text-xs font-semibold tracking-wider uppercase ${i === 0 ? 'text-left' : 'text-center'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SIZE_GUIDE_ROWS.map((row) => (
                <tr key={row.size} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-3 py-2 font-medium">{row.size}</td>
                  <td className="border border-gray-200 px-3 py-2 text-center text-gray-600">{row.chest}</td>
                  <td className="border border-gray-200 px-3 py-2 text-center text-gray-600">{row.waist}</td>
                  <td className="border border-gray-200 px-3 py-2 text-center text-gray-600">{row.hips}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-gray-400">{L.tipNote}</p>
        </div>
      </div>
    </div>
  );
}
