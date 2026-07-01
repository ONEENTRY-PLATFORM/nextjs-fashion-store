'use client'
import { useEffect } from 'react';
import { X, Package, ExternalLink } from 'lucide-react';
import { HISTORY_LABELS as L } from '../../../data/accountLabels';

interface TrackingModalProps {
  trackingNo: string;
  orderNo: string;
  onClose: () => void;
}

export function TrackingModal({ trackingNo, orderNo, onClose }: TrackingModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const trackingUrl = `https://www.royalmail.com/track-your-item#/tracking-results/${trackingNo}`;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md font-[Inter,sans-serif]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#e5e7eb]">
          <div>
            <p className="text-[10px] tracking-[0.25em] uppercase text-gray-400 mb-0.5">{L.trackPrefix} {orderNo}</p>
            <h2 className="text-sm tracking-[0.1em] uppercase font-bold">{L.trackHeading}</h2>
          </div>
          <button onClick={onClose} className="hover:opacity-60 transition-opacity focus-visible:outline-none">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="px-6 py-6 space-y-5">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#f9fafb] border border-[#e5e7eb]">
            <Package size={16} color="#6b7280" />
            <div>
              <p className="text-[10px] text-gray-400 tracking-widest uppercase mb-0.5">{L.trackCarrierLabel}</p>
              <p className="text-sm font-bold">{L.trackCarrierName}</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] text-gray-400 tracking-widest uppercase mb-2">{L.trackingNumber}</p>
            <div className="flex items-center justify-between px-4 py-3 border border-[#e5e7eb]">
              <span className="text-sm tracking-widest font-bold">{trackingNo}</span>
              <button
                onClick={() => navigator.clipboard.writeText(trackingNo).catch(() => {})}
                className="text-[10px] tracking-widest uppercase hover:opacity-60 transition-opacity focus-visible:outline-none font-semibold text-[var(--accent)]"
              >
                {L.copy}
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed">
            {L.trackInstructions}
          </p>

          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 text-xs tracking-[0.15em] uppercase text-white focus-visible:outline-none hover:opacity-90 transition-opacity bg-black font-bold"
          >
            <ExternalLink size={13} />
            {L.trackCta}
          </a>
        </div>
      </div>
    </div>
  );
}
