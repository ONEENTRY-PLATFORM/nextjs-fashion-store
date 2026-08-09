'use client';
import { useDict } from '../../../../lib/oneentry/labels/DictContext';
import { SERVICE_LABELS as L_FALLBACK } from '../../../data/accountLabels';

export function ServiceHowItWorks() {
  const L = useDict('service_maintenance_', L_FALLBACK);
  return (
    <div className="mt-10">
      <p className="mb-4 text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase">{L.howItWorks}</p>
      <div className="grid grid-cols-2 gap-px bg-white sm:grid-cols-4">
        {L.howSteps.map((card) => (
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
