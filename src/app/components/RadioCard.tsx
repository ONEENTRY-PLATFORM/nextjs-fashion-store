import React from 'react';

interface RadioCardProps {
  id?: string;
  checked: boolean;
  onChange: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}

export function RadioCard({ checked, onChange, icon, title, subtitle, children }: RadioCardProps) {
  return (
    <div
      className={`mb-4 transition-all duration-200 rounded-none border-2 ${
        checked ? 'border-black' : 'border-[#e5e7eb]'
      }`}
    >
      <button
        role="radio"
        aria-checked={checked}
        className="w-full flex items-center gap-4 px-5 py-4 text-left focus-visible:outline-none"
        onClick={onChange}
      >
        <span
          className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-white border-2 ${
            checked ? 'border-black' : 'border-[#c8c8c8]'
          }`}
        >
          {checked && <span className="w-2.5 h-2.5 rounded-full bg-black" />}
        </span>
        <span className={`transition-colors duration-200 ${checked ? 'text-black' : 'text-gray-400'}`}>
          {icon}
        </span>
        <div className="flex-1">
          <p className={`text-sm tracking-wide ${checked ? 'font-bold' : 'font-medium'}`}>
            {title}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        <span className="flex-shrink-0 text-xs px-2 py-0.5 bg-[#f0fdf4] text-green-600 border border-[#bbf7d0] rounded-none font-semibold">
          FREE
        </span>
      </button>
      {checked && children && (
        <div className="px-5 pb-5 border-t border-[#e5e7eb]">
          {children}
        </div>
      )}
    </div>
  );
}
