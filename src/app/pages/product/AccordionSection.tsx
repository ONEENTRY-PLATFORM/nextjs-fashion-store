import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function AccordionSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-200">
      <button
        className="flex w-full items-center justify-between py-4 text-left focus-visible:outline-none"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-xs font-semibold tracking-[0.15em] uppercase">{title}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}
        />
      </button>
      {open && <div className="pb-5">{children}</div>}
    </div>
  );
}
