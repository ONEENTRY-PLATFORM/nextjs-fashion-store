import React from 'react';

interface RadioCardProps {
  id?: string;
  checked: boolean;
  onChange: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  /**
   * Right-hand badge. Optional so the card stays generic; checkout passes
   *  the CMS-managed "FREE" copy. Omit to render no badge.
   */
  badge?: string;
  children?: React.ReactNode;
}

export function RadioCard({ checked, onChange, icon, title, subtitle, badge, children }: RadioCardProps) {
  return (
    <div
      className={`mb-4 rounded-none border-2 transition-all duration-200 ${
        checked ? 'border-black' : 'border-[#e5e7eb]'
      }`}
    >
      <button
        role="radio"
        aria-checked={checked}
        className="flex w-full items-center gap-4 px-5 py-4 text-left focus-visible:outline-none"
        onClick={onChange}
      >
        <span
          className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 bg-white ${
            checked ? 'border-black' : 'border-[#c8c8c8]'
          }`}
        >
          {checked && <span className="size-2.5 rounded-full bg-black" />}
        </span>
        <span className={`transition-colors duration-200 ${checked ? 'text-black' : 'text-gray-400'}`}>{icon}</span>
        <div className="flex-1">
          <p className={`text-sm tracking-wide ${checked ? 'font-bold' : 'font-medium'}`}>{title}</p>
          <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
        </div>
        {badge && (
          <span className="shrink-0 rounded-none border border-[#bbf7d0] bg-[#f0fdf4] px-2 py-0.5 text-xs font-semibold text-green-600">
            {badge}
          </span>
        )}
      </button>
      {checked && children && <div className="border-t border-[#e5e7eb] px-5 pb-5">{children}</div>}
    </div>
  );
}
