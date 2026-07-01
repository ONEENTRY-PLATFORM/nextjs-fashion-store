import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function AccordionSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-200">
      <button
        className="w-full flex items-center justify-between py-4 text-left focus-visible:outline-none"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-xs tracking-[0.15em] uppercase font-semibold">{title}</span>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}
        />
      </button>
      {open && <div className="pb-5">{children}</div>}
    </div>
  );
}
