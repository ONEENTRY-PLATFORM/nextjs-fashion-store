import { useEffect } from 'react';
import { X } from 'lucide-react';
import { SIZE_GUIDE_DATA } from '../../data/sizeGuide';
import { SIZE_GUIDE_MODAL_LABELS as L } from '../../data/productPageLabels';

export function SizeGuideModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-white w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-none"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="tracking-[0.2em] uppercase text-sm font-bold">{L.title}</h2>
          <button onClick={onClose} className="p-1 hover:opacity-60 transition-opacity">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-xs text-gray-500 mb-4">{L.measurementsNote}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#f5f5f5]">
                  {L.colHeaders.map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs tracking-wider uppercase border border-gray-200 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SIZE_GUIDE_DATA.map((row, i) => (
                  <tr key={row.size} className={i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}>
                    <td className="px-4 py-3 text-xs border border-gray-200 font-semibold">{row.size}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 border border-gray-200">{row.us}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 border border-gray-200">{row.bust}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 border border-gray-200">{row.waist}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 border border-gray-200">{row.hip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 p-4 bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-600 leading-relaxed">
              <span className="font-semibold">{L.howToHeader}</span> {L.howToBody}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
