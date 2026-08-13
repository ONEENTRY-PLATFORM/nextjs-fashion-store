'use client';

import { useDict } from '@/lib/oneentry/labels/DictContext';

export const SERVICE_HOW_IT_WORKS_LABELS = {
  howItWorks: 'How It Works',
  // Flat, not an array of objects: `mergeDict` overlays strings only, so a nested step would stay frozen in code.
  howStep1Title: 'Submit Request',
  howStep1Body: 'Tell us what your item needs — repair, cleaning, alteration or resoling.',
  howStep2Title: 'Drop Off',
  howStep2Body: 'Bring your item to any Kekimoro store with your confirmation reference.',
  howStep3Title: 'We Get to Work',
  howStep3Body: 'Our specialist technicians assess and complete your service request.',
  howStep4Title: 'Collect',
  howStep4Body: "You'll be notified when ready. Collect in-store or request delivery.",
} as const;

const L_FALLBACK = SERVICE_HOW_IT_WORKS_LABELS;

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
