'use client';
import { ExternalLink, Package, X } from 'lucide-react';
import { useEffect } from 'react';

import { useDict } from '../../../../lib/oneentry/labels/DictContext';
import { HISTORY_LABELS as L_FALLBACK } from '../../../data/accountLabels';

interface TrackingModalProps {
  trackingNo: string;
  orderNo: string;
  onClose: () => void;
}

export function TrackingModal({ trackingNo, orderNo, onClose }: TrackingModalProps) {
  const L = useDict('purchase_history_', L_FALLBACK);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const trackingUrl = `https://www.royalmail.com/track-your-item#/tracking-results/${trackingNo}`;

  return (
    <div className="fixed inset-0 z-500 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white font-[Inter,sans-serif]">
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-5">
          <div>
            <p className="mb-0.5 text-[10px] tracking-[0.25em] text-gray-400 uppercase">
              {L.trackPrefix} {orderNo}
            </p>
            <h2 className="text-sm font-bold tracking-widest uppercase">{L.trackHeading}</h2>
          </div>
          <button onClick={onClose} className="transition-opacity hover:opacity-60 focus-visible:outline-none">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex items-center gap-3 border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3">
            <Package size={16} color="#6b7280" />
            <div>
              <p className="mb-0.5 text-[10px] tracking-widest text-gray-400 uppercase">{L.trackCarrierLabel}</p>
              <p className="text-sm font-bold">{L.trackCarrierName}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] tracking-widest text-gray-400 uppercase">{L.trackingNumber}</p>
            <div className="flex items-center justify-between border border-[#e5e7eb] px-4 py-3">
              <span className="text-sm font-bold tracking-widest">{trackingNo}</span>
              <button
                onClick={() => navigator.clipboard.writeText(trackingNo).catch(() => {})}
                className="text-[10px] font-semibold tracking-widest text-accent uppercase transition-opacity hover:opacity-60 focus-visible:outline-none"
              >
                {L.copy}
              </button>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-gray-500">{L.trackInstructions}</p>

          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 bg-black py-3 text-xs font-bold tracking-[0.15em] text-white uppercase transition-opacity hover:opacity-90 focus-visible:outline-none"
          >
            <ExternalLink size={13} />
            {L.trackCta}
          </a>
        </div>
      </div>
    </div>
  );
}
