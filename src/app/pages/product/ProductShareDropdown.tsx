'use client'
import React from 'react';
import Image from 'next/image';
import { Share2, Check, Link2 } from 'lucide-react';
import { SHARE_DROPDOWN_LABELS as L } from '../../data/productPageLabels';
import { useProductCardT } from '../../../lib/oneentry/labels/ProductCardLabelsContext';

const ShareIcon = ({ src, alt }: { src: string; alt: string }) => (
  <Image src={src} alt={alt} width={14} height={14} unoptimized />
);

type ShareLinkDef = { label: string; icon: React.ReactNode; getHref: (url: string) => string };
const SHARE_LINKS: ShareLinkDef[] = [
  {
    label: L.facebook,
    icon: <ShareIcon src="/icons/share/facebook.svg" alt={L.facebook} />,
    getHref: url => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    label: L.twitter,
    icon: <ShareIcon src="/icons/share/x.svg" alt={L.twitterShortName} />,
    getHref: url => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
  },
  {
    label: L.pinterest,
    icon: <ShareIcon src="/icons/share/pinterest.svg" alt={L.pinterest} />,
    getHref: url => `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}`,
  },
  {
    label: L.whatsapp,
    icon: <ShareIcon src="/icons/share/whatsapp.svg" alt={L.whatsapp} />,
    getHref: url => `https://wa.me/?text=${encodeURIComponent(url)}`,
  },
];

interface ProductShareDropdownProps {
  shareRef: React.RefObject<HTMLDivElement | null>;
  showShare: boolean;
  setShowShare: (v: ((prev: boolean) => boolean) | boolean) => void;
  copied: boolean;
  onCopyLink: () => void;
}

export function ProductShareDropdown({
  shareRef, showShare, setShowShare, copied, onCopyLink,
}: ProductShareDropdownProps) {
  const lShare = useProductCardT('product-card_share', L.triggerLabel);
  return (
    <div ref={shareRef} className="relative">
      <button
        onClick={() => setShowShare(v => !v)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-black transition-colors"
      >
        <Share2 size={13} /> {lShare}
      </button>

      {showShare && (
        <div className="absolute right-0 top-7 z-50 bg-white border border-gray-200 shadow-lg py-1 min-w-[160px] rounded-md">
          {SHARE_LINKS.map(item => (
            <a
              key={item.label}
              href={item.getHref(typeof window !== 'undefined' ? window.location.href : '')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setShowShare(false)}
            >
              {item.icon}
              {item.label}
            </a>
          ))}

          <div className="border-t border-gray-100 mx-2 my-1" />

          <button
            onClick={onCopyLink}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs transition-colors ${
              copied ? 'text-green-600' : 'text-[#374151]'
            }`}
          >
            {copied ? <Check size={14} className="text-green-600" /> : <Link2 size={14} />}
            {copied ? L.linkCopied : L.copyLink}
          </button>
        </div>
      )}
    </div>
  );
}
