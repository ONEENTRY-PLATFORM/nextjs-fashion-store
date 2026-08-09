import { X } from 'lucide-react';
import { useEffect } from 'react';

import { SIZE_GUIDE_MODAL_LABELS as L_FALLBACK } from '@/app/data/productPageLabels';
import { parseSizeGuide, serializeSizeGuide, SIZE_GUIDE_DATA } from '@/app/data/sizeGuide';
import { useDict, useList, useT } from '@/lib/oneentry/labels/DictContext';

export function SizeGuideModal({ onClose }: { onClose: () => void }) {
  const L = useDict('size_guide_', L_FALLBACK);
  // The chart itself is editable too — one row per line, `size|us|bust|waist|hip`.
  const rows = parseSizeGuide(useT('size_guide_rows', serializeSizeGuide(SIZE_GUIDE_DATA)));
  // The rows already come from the CMS; the header row was the one part of
  // this table still frozen in code, because `mergeDict` skips arrays.
  const colHeaders = useList('size_guide_col_headers', L.colHeaders);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-none bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-sm font-bold tracking-[0.2em] uppercase">{L.title}</h2>
          <button onClick={onClose} className="p-1 transition-opacity hover:opacity-60">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="mb-4 text-xs text-gray-500">{L.measurementsNote}</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#f5f5f5]">
                  {colHeaders.map((h) => (
                    <th
                      key={h}
                      className="border border-gray-200 px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.size} className={i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}>
                    <td className="border border-gray-200 px-4 py-3 text-xs font-semibold">{row.size}</td>
                    <td className="border border-gray-200 px-4 py-3 text-xs text-gray-600">{row.us}</td>
                    <td className="border border-gray-200 px-4 py-3 text-xs text-gray-600">{row.bust}</td>
                    <td className="border border-gray-200 px-4 py-3 text-xs text-gray-600">{row.waist}</td>
                    <td className="border border-gray-200 px-4 py-3 text-xs text-gray-600">{row.hip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs leading-relaxed text-gray-600">
              <span className="font-semibold">{L.howToHeader}</span> {L.howToBody}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
