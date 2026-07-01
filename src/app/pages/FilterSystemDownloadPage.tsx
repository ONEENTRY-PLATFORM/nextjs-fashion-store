'use client'
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ACCENT_WOMEN } from '../constants/colors';
import { FILTER_SYSTEM_MARKDOWN } from '../data/filterSystemMarkdown';
import { FILTER_SYSTEM_DOWNLOAD_LABELS as L } from '../data/filterSystemDownloadLabels';

function triggerDownload() {
  const blob = new Blob([FILTER_SYSTEM_MARKDOWN], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = L.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function FilterSystemDownloadPage() {
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    triggerDownload();
    setDownloaded(true);
  }, []);

  return (
    <div
      className="min-h-screen bg-white flex flex-col items-center justify-center gap-8 px-6 font-[Inter,sans-serif]"
      style={{ '--accent': ACCENT_WOMEN } as React.CSSProperties}
    >
      {/* Icon */}
      <div
        className={`flex items-center justify-center w-[72px] h-[72px] border-2 border-black transition-colors duration-[400ms] ${
          downloaded ? 'bg-black' : 'bg-[#f5f5f5]'
        }`}
      >
        <Image
          src={downloaded ? '/icons/ui/download-white.svg' : '/icons/ui/download-black.svg'}
          alt=""
          width={32}
          height={32}
          unoptimized
        />
      </div>

      {/* Text */}
      <div className="text-center">
        <p className="tracking-[0.2em] uppercase mb-2 text-[11px] text-gray-400">
          {L.brand}
        </p>
        <h1 className="tracking-[0.06em] uppercase mb-3 text-xl font-bold">
          {downloaded ? L.headingDownloaded : L.headingPreparing}
        </h1>
        <p className="text-sm text-gray-500 max-w-xs">
          {downloaded ? L.bodyDownloaded : L.bodyPreparing}
        </p>
      </div>

      {/* Buttons */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <button
          onClick={() => { triggerDownload(); }}
          className="w-full py-3 text-xs tracking-widest uppercase text-white bg-[var(--accent)] rounded-none"
        >
          {L.downloadAgain}
        </button>
        <a
          href={L.returnHomeHref}
          className="text-xs text-gray-400 hover:text-black transition-colors underline"
        >
          {L.returnHome}
        </a>
      </div>

      {/* File info */}
      <div className="w-full max-w-xs px-4 py-3 text-xs text-gray-500 border border-[#e6e6e6] bg-[#fafafa]">
        <div className="flex justify-between mb-1">
          <span>{L.fileLabel}</span>
          <span className="text-black font-medium">{L.filename}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>{L.typeLabel}</span>
          <span className="text-black font-medium">{L.typeMarkdown}</span>
        </div>
        <div className="flex justify-between">
          <span>{L.sizeLabel}</span>
          <span className="text-black font-medium">
            ~{(new Blob([FILTER_SYSTEM_MARKDOWN]).size / 1024).toFixed(1)} {L.sizeSuffix}
          </span>
        </div>
      </div>
    </div>
  );
}
