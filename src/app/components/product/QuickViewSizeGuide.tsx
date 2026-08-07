'use client'
import { X } from 'lucide-react';
import { SIZE_GUIDE_LABELS as L } from '../../data/productPageLabels';
import { parseSizeTable, serializeSizeTable } from '../../data/sizeGuide';
import { useT } from '../../../lib/oneentry/labels/DictContext';

/** Quick View shows the metric chart: `size|chest|waist|hips`. */
const QUICK_VIEW_COLUMNS = ['size', 'chest', 'waist', 'hips'] as const;
type QuickViewRow = Record<(typeof QUICK_VIEW_COLUMNS)[number], string>;
const QUICK_VIEW_FALLBACK = L.rows as readonly QuickViewRow[];

export function QuickViewSizeGuide({ onClose }: { onClose: () => void }) {
  const SIZE_GUIDE_ROWS = parseSizeTable<QuickViewRow>(
    useT('size_guide_quick_view_rows', serializeSizeTable(QUICK_VIEW_FALLBACK, QUICK_VIEW_COLUMNS)),
    QUICK_VIEW_COLUMNS,
    QUICK_VIEW_FALLBACK,
  );
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50" role="presentation" onClick={onClose}>
      <div className="bg-white w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="size-guide-title" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 id="size-guide-title" className="text-sm font-semibold uppercase tracking-widest">{L.title}</h3>
          <button onClick={onClose} className="hover:opacity-60 transition-opacity">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-xs text-gray-500 mb-4">{L.measurementsNote}</p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {L.colHeaders.map((h, i) => (
                  <th key={h} className={`border border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-wider ${i === 0 ? 'text-left' : 'text-center'}`}>
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
          <p className="text-xs text-gray-400 mt-4">{L.tipNote}</p>
        </div>
      </div>
    </div>
  );
}
