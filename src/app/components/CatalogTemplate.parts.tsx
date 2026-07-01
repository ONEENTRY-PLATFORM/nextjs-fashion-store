'use client'
import Image from 'next/image';

export function ColsIcon({ cols, active }: { cols: 3 | 4; active: boolean }) {
  const variant = active ? 'active' : 'inactive';
  const w = cols === 4 ? 22 : 17;
  return (
    <Image
      src={`/icons/ui/cols-${cols}-${variant}.svg`}
      alt=""
      width={w}
      height={15}
      aria-hidden="true"
      unoptimized
    />
  );
}

export const CheckMark = () =>
  <Image src="/icons/ui/check.svg" alt="" width={8} height={8} unoptimized />;

export function CheckboxUI({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex-shrink-0 flex items-center justify-center transition-colors w-[14px] h-[14px] rounded-none border ${
        checked ? 'border-black bg-black' : 'border-[#bbb] bg-white'
      }`}
    >
      {checked && <CheckMark />}
    </span>
  );
}

export function SortOptionBtn({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 transition-colors flex items-center justify-between ${
        active ? 'bg-[#f5f5f5]' : 'bg-white'
      }`}
    >
      {label}
      {active && <span className="text-[var(--accent)]">✓</span>}
    </button>
  );
}
