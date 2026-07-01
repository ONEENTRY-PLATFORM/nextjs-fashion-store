'use client'
import React, { useEffect, useState } from 'react';
import { ImageWithFallback } from '../../components/ImageWithFallback';
import { type ServiceRequest, type ServiceStatus, type ServiceCategory } from '../../data/serviceData';
import { getServiceRequestsAction } from '../../../lib/oneentry/catalog/service-requests-action';
import { ChevronDown, Check, Plus, X, AlertTriangle } from 'lucide-react';
import { SectionTitle, ACCENT, fmt } from './shared';
import { SALE_COLOR, BANNER_BG } from '../../constants/colors';
import { ServiceRequestForm } from './service/ServiceRequestForm';
import { ServiceHowItWorks } from './service/ServiceHowItWorks';
import { SERVICE_LABELS as L } from '../../data/accountLabels';
import { useT } from '../../../lib/oneentry/labels/AccountLabelsContext';

const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  alteration:  L.categoryLabels.alteration,
  repair:      L.categoryLabels.repair,
  cleaning:    L.categoryLabels.cleaning,
  restoration: L.categoryLabels.restoration,
  other:       L.categoryLabels.other,
};

const SERVICE_FILTER_KEYS: ServiceStatus[] = ['open', 'in-progress', 'ready', 'completed', 'cancelled'];

export function ServiceMaintenanceSection() {
  const [services, setServices] = useState<ServiceRequest[]>([]);
  useEffect(() => {
    let cancelled = false;
    void getServiceRequestsAction().then((items) => {
      if (!cancelled) setServices(items);
    });
    return () => { cancelled = true; };
  }, []);
  const title         = useT('service_maintenance', 'service_maintenance_title',                   L.title);
  const eyebrow       = useT('service_maintenance', 'service_maintenance_care_repair',             L.eyebrow);
  const bannerHead    = useT('service_maintenance', 'service_maintenance_your_requests',           L.bannerHeading);
  const lActive       = useT('service_maintenance', 'service_maintenance_active',                  L.statActive);
  const lCompleted    = useT('service_maintenance', 'service_maintenance_completed',               L.statCompleted);
  const lTotalSpent   = useT('service_maintenance', 'service_maintenance_total_spent',             L.statTotalSpent);
  const lNewRequest   = useT('service_maintenance', 'service_maintenance_new_request_cta',         L.newRequest);
  const lFilterAll    = useT('service_maintenance', 'service_maintenance_status_tab_all',          L.filterAll);
  const sOpen         = useT('service_maintenance', 'service_maintenance_status_tab_open',         L.statuses.open);
  const sInProgress   = useT('service_maintenance', 'service_maintenance_status_tab_in_progress',  L.statuses['in-progress']);
  const sReady        = useT('service_maintenance', 'service_maintenance_status_tab_ready',        L.statuses.ready);
  const sCompletedStt = useT('service_maintenance', 'service_maintenance_status_tab_completed',    L.statuses.completed);
  const lFieldItem    = useT('service_maintenance', 'service_maintenance_item',                    L.fieldItem);
  const lFieldRef     = useT('service_maintenance', 'service_maintenance_ref',                     L.fieldRef);
  const lFieldType    = useT('service_maintenance', 'service_maintenance_type',                    L.fieldType);
  const lFieldCost    = useT('service_maintenance', 'service_maintenance_cost',                    L.fieldCost);
  const lProgress     = useT('service_maintenance', 'service_maintenance_progress',                L.progressLabel);
  const lDroppedOff   = useT('service_maintenance', 'service_maintenance_date_off',                L.fieldDroppedOff);
  const lEstReady     = useT('service_maintenance', 'service_maintenance_est_ready',               L.fieldEstReady);
  const lServiceType  = useT('service_maintenance', 'service_maintenance_service_type',            L.fieldServiceType);
  const lReqDetails   = useT('service_maintenance', 'service_maintenance_request_details_title',   L.requestDetails);

  const SERVICE_STATUS_CONFIG: Record<ServiceStatus, { label: string; bg: string; border: string; text: string; dot: string }> = {
    open:          { label: sOpen,               bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', dot: '#2563eb' },
    'in-progress': { label: sInProgress,         bg: '#fffbeb', border: '#fde68a', text: '#b45309', dot: '#f59e0b' },
    ready:         { label: sReady,              bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', dot: '#22c55e' },
    completed:     { label: sCompletedStt,       bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280', dot: '#9ca3af' },
    cancelled:     { label: L.statuses.cancelled, bg: '#fef2f2', border: '#fecaca', text: SALE_COLOR, dot: SALE_COLOR },
  };

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<ServiceStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  const toggle = (id: string) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const filtered = activeFilter === 'all' ? services : services.filter(s => s.status === activeFilter);
  const activeCount = services.filter(s => ['open', 'in-progress', 'ready'].includes(s.status)).length;
  const completedCount = services.filter(s => s.status === 'completed').length;
  const totalCost = services.filter(s => s.cost !== null).reduce((a, s) => a + (s.cost ?? 0), 0);

  return (
    <div
      style={{
        '--sale': SALE_COLOR,
        '--accent': ACCENT,
        '--banner-bg': BANNER_BG,
      } as React.CSSProperties}
    >
      <SectionTitle title={title} />

      {/* Stats banner */}
      <div className="mb-8 px-8 py-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--banner-bg)]">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-gray-400 mb-1">{eyebrow}</p>
          <h2 className="tracking-widest uppercase text-[clamp(1rem,2vw,1.2rem)] font-bold">
            {bannerHead}
          </h2>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-8">
            {[
              { label: lActive,     value: activeCount,    color: '#b45309' },
              { label: lCompleted,  value: completedCount, color: '#16a34a' },
              { label: lTotalSpent, value: fmt(totalCost), color: ACCENT   },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-extrabold" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs text-gray-500 whitespace-nowrap">{stat.label}</p>
              </div>
            ))}
          </div>
          <button
            onMouseEnter={() => setHoveredBtn('new')}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={() => setShowForm(v => !v)}
            className={`px-4 py-2.5 text-xs tracking-[0.15em] uppercase text-white flex items-center gap-1.5 focus-visible:outline-none transition-colors font-bold ${
              showForm
                ? 'bg-[var(--sale)]'
                : hoveredBtn === 'new'
                  ? 'bg-[var(--accent)]'
                  : 'bg-black'
            }`}
          >
            {showForm ? <><X size={11} /> {L.cancel}</> : <><Plus size={11} /> {lNewRequest}</>}
          </button>
        </div>
      </div>

      {showForm && <ServiceRequestForm onCancel={() => setShowForm(false)} />}

      {/* Filter chips */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-1.5 text-xs tracking-[0.15em] uppercase focus-visible:outline-none transition-colors font-bold ${
            activeFilter === 'all' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {lFilterAll} ({services.length})
        </button>
        {SERVICE_FILTER_KEYS.map(f => {
          const count = services.filter(s => s.status === f).length;
          if (count === 0) return null;
          const cfg = SERVICE_STATUS_CONFIG[f];
          const isActive = activeFilter === f;
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="px-4 py-1.5 text-xs tracking-[0.15em] uppercase focus-visible:outline-none transition-colors font-bold"
              style={{
                backgroundColor: isActive ? cfg.text : '#f3f4f6',
                color: isActive ? '#fff' : cfg.text,
              }}
            >
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Request list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-[var(--banner-bg)]">
          <p className="text-sm text-gray-400 text-center">{L.emptyFiltered}</p>
        </div>
      ) : (
        <div className="space-y-px bg-black">
          {filtered.map(req => {
            const cfg = SERVICE_STATUS_CONFIG[req.status];
            const isOpen = expanded.has(req.id);
            const stepOrder: ServiceStatus[] = ['open', 'in-progress', 'ready', 'completed'];
            const curIdx = stepOrder.indexOf(req.status);
            return (
              <div key={req.id} className="bg-white">
                <div className="flex items-center gap-4 px-5 py-4">
                  <button
                    onClick={() => toggle(req.id)}
                    className={`w-7 h-7 flex items-center justify-center flex-shrink-0 focus-visible:outline-none ${
                      isOpen ? 'bg-black' : 'bg-gray-100'
                    }`}
                  >
                    <ChevronDown
                      size={13}
                      color={isOpen ? '#fff' : '#6b7280'}
                      className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
                    />
                  </button>

                  <div className="relative flex-shrink-0 overflow-hidden w-12 h-[60px]">
                    <ImageWithFallback src={req.img} alt={req.item} fill sizes="48px" className="object-cover" />
                  </div>

                  <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-0.5">
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[10px] text-gray-400 tracking-widest uppercase">{lFieldItem}</p>
                      <p className="text-xs truncate font-bold">{req.item}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 tracking-widest uppercase">{lFieldRef}</p>
                      <p className="text-xs font-semibold">{req.ref}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 tracking-widest uppercase">{lFieldType}</p>
                      <p className="text-xs font-semibold">{SERVICE_CATEGORY_LABELS[req.category]}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 tracking-widest uppercase">{lFieldCost}</p>
                      <p className="text-xs font-semibold">
                        {req.cost !== null ? fmt(req.cost) : <span className="text-gray-400">{L.costTbc}</span>}
                      </p>
                    </div>
                  </div>

                  <span
                    className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 text-[10px] tracking-wider uppercase flex-shrink-0 border font-bold"
                    style={{ backgroundColor: cfg.bg, borderColor: cfg.border, color: cfg.text }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
                    {cfg.label}
                  </span>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    {/* Progress timeline */}
                    <div className="px-5 py-4 bg-[#fafafa]">
                      <p className="text-[10px] tracking-widest uppercase text-gray-400 mb-3 font-bold">{lProgress}</p>
                      <div className="flex items-center">
                        {stepOrder.map((step, i) => {
                          const stepIdx = i;
                          const done = stepIdx <= curIdx && req.status !== 'cancelled';
                          const isCurrent = stepIdx === curIdx && req.status !== 'cancelled';
                          const scfg = SERVICE_STATUS_CONFIG[step];
                          return (
                            <div
                              key={step}
                              className={`flex items-center ${i < stepOrder.length - 1 ? 'flex-1' : 'flex-none'}`}
                            >
                              <div className="flex flex-col items-center gap-1">
                                <div
                                  className="w-6 h-6 flex items-center justify-center"
                                  style={{ backgroundColor: done ? (isCurrent ? scfg.text : '#000') : '#e5e7eb' }}
                                >
                                  {done && !isCurrent
                                    ? <Check size={10} color="#fff" />
                                    : isCurrent
                                      ? <span className="w-2 h-2 rounded-full bg-white" />
                                      : <span className="w-2 h-2 rounded-full bg-gray-300" />}
                                </div>
                                <p
                                  className={`text-[9px] tracking-wider uppercase whitespace-nowrap ${
                                    done ? 'text-black font-bold' : 'text-gray-400 font-normal'
                                  }`}
                                >
                                  {scfg.label}
                                </p>
                              </div>
                              {i < stepOrder.length - 1 && (
                                <div
                                  className={`flex-1 h-px mx-1 mb-4 ${
                                    stepIdx < curIdx && req.status !== 'cancelled' ? 'bg-black' : 'bg-[#e5e7eb]'
                                  }`}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Detail grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100">
                      {[
                        { label: lDroppedOff,  value: req.droppedOff },
                        { label: lEstReady,    value: req.estimatedReady ?? L.costTbc },
                        { label: lServiceType, value: SERVICE_CATEGORY_LABELS[req.category] },
                        { label: lFieldCost,   value: req.cost !== null ? fmt(req.cost) : L.costTbc },
                      ].map(cell => (
                        <div key={cell.label} className="bg-white px-4 py-3">
                          <p className="text-[10px] text-gray-400 tracking-widest uppercase">{cell.label}</p>
                          <p className="text-xs mt-0.5 font-bold">{cell.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Description */}
                    <div className="px-5 py-3 border-t border-gray-100 bg-[#fafafa]">
                      <p className="text-[10px] text-gray-400 tracking-widest uppercase mb-1 font-bold">{lReqDetails}</p>
                      <p className="text-xs text-gray-600">{req.description}</p>
                    </div>

                    {/* Notes */}
                    <div className="px-5 py-3 flex items-start gap-2 bg-[#fffbeb] border-t border-[#fde68a]">
                      <AlertTriangle size={12} color="#b45309" className="mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-[#b45309]">{req.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ServiceHowItWorks />
    </div>
  );
}
