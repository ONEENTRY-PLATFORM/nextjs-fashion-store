'use client'
import { SERVICE_LABELS as L_FALLBACK } from '../../../data/accountLabels';
import { useAccountDict } from '../../../../lib/oneentry/labels/AccountLabelsContext';

export function ServiceHowItWorks() {
  const L = useAccountDict('service_maintenance', 'service_maintenance_', L_FALLBACK);
  return (
    <div className="mt-10">
      <p className="text-[10px] tracking-[0.3em] uppercase text-gray-400 mb-4 font-bold">{L.howItWorks}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white">
        {L.howSteps.map(card => (
          <div key={card.step} className="bg-white px-5 py-6">
            <p className="text-2xl mb-2 font-extrabold text-accent">{card.step}</p>
            <p className="text-xs mb-1.5 tracking-wide uppercase font-bold">{card.title}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
