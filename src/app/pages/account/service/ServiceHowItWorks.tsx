'use client';

import { SERVICE_LABELS as L_FALLBACK } from '@/app/pages/account/service/copy';
import { useDict } from '@/lib/oneentry/labels/DictContext';

export function ServiceHowItWorks() {
  const L = useDict('service_maintenance_', L_FALLBACK);
  // Rebuilt from the flat `howStepNTitle` / `howStepNBody` keys so every string passes through the dictionary; the badge is the index.
  const steps = [1, 2, 3, 4].map((n) => ({
    step: String(n).padStart(2, '0'),
    title: L[`howStep${n}Title` as keyof typeof L] as string,
    body: L[`howStep${n}Body` as keyof typeof L] as string,
  }));
  return (
    <div className="mt-10">
      <p className="mb-4 text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase">{L.howItWorks}</p>
      <div className="grid grid-cols-2 gap-px bg-white sm:grid-cols-4">
        {steps.map((card) => (
          <div key={card.step} className="bg-white px-5 py-6">
            <p className="mb-2 text-2xl font-extrabold text-accent">{card.step}</p>
            <p className="mb-1.5 text-xs font-bold tracking-wide uppercase">{card.title}</p>
            <p className="text-xs leading-relaxed text-gray-500">{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
