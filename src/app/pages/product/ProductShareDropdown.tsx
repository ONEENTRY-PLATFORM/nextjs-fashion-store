'use client';
import { Check, Link2, Share2 } from 'lucide-react';
import Image from 'next/image';
import React from 'react';

import { SHARE_DROPDOWN_LABELS } from '@/app/data/productPageLabels';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

const ShareIcon = ({ src, alt }: { src: string; alt: string }) => (
  <Image src={src} alt={alt} width={14} height={14} unoptimized />
);

type ShareLinkDef = { label: string; icon: React.ReactNode; getHref: (url: string) => string };
const SHARE_LINKS: ShareLinkDef[] = [
  {
    label: SHARE_DROPDOWN_LABELS.facebook,
    icon: <ShareIcon src="/icons/share/facebook.svg" alt={SHARE_DROPDOWN_LABELS.facebook} />,
    getHref: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    label: SHARE_DROPDOWN_LABELS.twitter,
    icon: <ShareIcon src="/icons/share/x.svg" alt={SHARE_DROPDOWN_LABELS.twitterShortName} />,
    getHref: (url) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
  },
  {
    label: SHARE_DROPDOWN_LABELS.pinterest,
    icon: <ShareIcon src="/icons/share/pinterest.svg" alt={SHARE_DROPDOWN_LABELS.pinterest} />,
    getHref: (url) => `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}`,
  },
  {
    label: SHARE_DROPDOWN_LABELS.whatsapp,
    icon: <ShareIcon src="/icons/share/whatsapp.svg" alt={SHARE_DROPDOWN_LABELS.whatsapp} />,
    getHref: (url) => `https://wa.me/?text=${encodeURIComponent(url)}`,
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
  shareRef,
  showShare,
  setShowShare,
  copied,
  onCopyLink,
}: ProductShareDropdownProps) {
  const L = useDict('product_card_actions_share_', SHARE_DROPDOWN_LABELS);
  const lShare = useT('product-card_share', L.triggerLabel);
  return (
    <div ref={shareRef} className="relative">
      <button
        onClick={() => setShowShare((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-black"
      >
        <Share2 size={13} /> {lShare}
      </button>

      {showShare && (
        <div className="absolute top-7 right-0 z-50 min-w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {SHARE_LINKS.map((item) => (
            <a
              key={item.label}
              href={item.getHref(typeof window !== 'undefined' ? window.location.href : '')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-2.5 text-xs text-gray-700 transition-colors hover:bg-gray-50"
              onClick={() => setShowShare(false)}
            >
              {item.icon}
              {item.label}
            </a>
          ))}

          <div className="mx-2 my-1 border-t border-gray-100" />

          <button
            onClick={onCopyLink}
            className={`flex w-full items-center gap-3 px-4 py-2.5 text-xs transition-colors ${
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
