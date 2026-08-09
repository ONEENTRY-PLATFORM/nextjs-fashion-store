'use client';
import { AlertTriangle, Check, ChevronDown, Plus, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { getServiceRequestsAction } from '../../../lib/oneentry/catalog/service-requests-action';
import { useDict, useT } from '../../../lib/oneentry/labels/DictContext';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { BANNER_BG, SALE_COLOR } from '../../constants/colors';
import { SERVICE_LABELS } from '../../data/accountLabels';
import { type ServiceCategory, type ServiceRequest, type ServiceStatus } from '../../data/serviceData';
import { ServiceHowItWorks } from './service/ServiceHowItWorks';
import { ServiceRequestForm } from './service/ServiceRequestForm';
import { ACCENT, fmt, SectionTitle } from './shared';

const SERVICE_FILTER_KEYS: ServiceStatus[] = ['open', 'in-progress', 'ready', 'completed', 'cancelled'];

export function ServiceMaintenanceSection() {
  const L = useDict('service_maintenance_', SERVICE_LABELS);
  // Nested objects are structure to `mergeDict`, so the category names get
  // their own overlay rather than staying frozen in code.
  const CATEGORIES = useDict('service_maintenance_category_', SERVICE_LABELS.categoryLabels);
  // `null` means "still loading" — one piece of state instead of a pair kept
  // in sync from inside the effect (a synchronous `setState` in `useEffect`).
  const [services, setServices] = useState<ServiceRequest[] | null>(null);
  const loading = services === null;
  const serviceList = services ?? [];
  useEffect(() => {
    let cancelled = false;
    void getServiceRequestsAction().then((items) => {
      if (!cancelled) setServices(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const title = useT('service_maintenance_title', L.title);
  const eyebrow = useT('service_maintenance_care_repair', L.eyebrow);
  const bannerHead = useT('service_maintenance_your_requests', L.bannerHeading);
  const lLoadingAria = useT('service_maintenance_loading_aria', L.loadingAria);
  const lActive = useT('service_maintenance_active', L.statActive);
  const lCompleted = useT('service_maintenance_completed', L.statCompleted);
  const lTotalSpent = useT('service_maintenance_total_spent', L.statTotalSpent);
  const lNewRequest = useT('service_maintenance_new_request_cta', L.newRequest);
  const lFilterAll = useT('service_maintenance_status_tab_all', L.filterAll);
  const sOpen = useT('service_maintenance_status_tab_open', L.statuses.open);
  const sInProgress = useT('service_maintenance_status_tab_in_progress', L.statuses['in-progress']);
  const sReady = useT('service_maintenance_status_tab_ready', L.statuses.ready);
  const sCompletedStt = useT('service_maintenance_status_tab_completed', L.statuses.completed);
  const lFieldItem = useT('service_maintenance_item', L.fieldItem);
  const lFieldRef = useT('service_maintenance_ref', L.fieldRef);
  const lFieldType = useT('service_maintenance_type', L.fieldType);
  const lFieldCost = useT('service_maintenance_cost', L.fieldCost);
  const lProgress = useT('service_maintenance_progress', L.progressLabel);
  const lDroppedOff = useT('service_maintenance_date_off', L.fieldDroppedOff);
  const lEstReady = useT('service_maintenance_est_ready', L.fieldEstReady);
  const lServiceType = useT('service_maintenance_service_type', L.fieldServiceType);
  const lReqDetails = useT('service_maintenance_request_details_title', L.requestDetails);

  const SERVICE_STATUS_CONFIG: Record<
    ServiceStatus,
    { label: string; bg: string; border: string; text: string; dot: string }
  > = {
    open: { label: sOpen, bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', dot: '#2563eb' },
    'in-progress': { label: sInProgress, bg: '#fffbeb', border: '#fde68a', text: '#b45309', dot: '#f59e0b' },
    ready: { label: sReady, bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', dot: '#22c55e' },
    completed: { label: sCompletedStt, bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280', dot: '#9ca3af' },
    cancelled: { label: L.statuses.cancelled, bg: '#fef2f2', border: '#fecaca', text: SALE_COLOR, dot: SALE_COLOR },
  };

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<ServiceStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });

  const filtered = activeFilter === 'all' ? serviceList : serviceList.filter((s) => s.status === activeFilter);
  const activeCount = serviceList.filter((s) => ['open', 'in-progress', 'ready'].includes(s.status)).length;
  const completedCount = serviceList.filter((s) => s.status === 'completed').length;
  const totalCost = serviceList.filter((s) => s.cost !== null).reduce((a, s) => a + (s.cost ?? 0), 0);

  return (
    <div
      style={
        {
          '--sale': SALE_COLOR,
          '--accent': ACCENT,
          '--banner-bg': BANNER_BG,
        } as React.CSSProperties
      }
    >
      <SectionTitle title={title} />

      {/* Stats banner */}
      <div className="mb-8 flex flex-col items-start justify-between gap-4 bg-(--banner-bg) px-8 py-7 sm:flex-row sm:items-center">
        <div>
          <p className="mb-1 text-xs tracking-[0.3em] text-gray-400 uppercase">{eyebrow}</p>
          <h2 className="text-[clamp(1rem,2vw,1.2rem)] font-bold tracking-widest uppercase">{bannerHead}</h2>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-8">
            {[
              { label: lActive, value: activeCount, color: '#b45309' },
              { label: lCompleted, value: completedCount, color: '#16a34a' },
              { label: lTotalSpent, value: fmt(totalCost), color: ACCENT },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-extrabold" style={{ color: stat.color }}>
                  {stat.value}
                </p>
                <p className="text-xs whitespace-nowrap text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
          <button
            onMouseEnter={() => setHoveredBtn('new')}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={() => setShowForm((v) => !v)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold tracking-[0.15em] text-white uppercase transition-colors focus-visible:outline-none ${
              showForm ? 'bg-(--sale)' : hoveredBtn === 'new' ? 'bg-accent' : 'bg-black'
            }`}
          >
            {showForm ? (
              <>
                <X size={11} /> {L.cancel}
              </>
            ) : (
              <>
                <Plus size={11} /> {lNewRequest}
              </>
            )}
          </button>
        </div>
      </div>

      {showForm && <ServiceRequestForm onCancel={() => setShowForm(false)} />}

      {/* Filter chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-1.5 text-xs font-bold tracking-[0.15em] uppercase transition-colors focus-visible:outline-none ${
            activeFilter === 'all' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {lFilterAll} ({serviceList.length})
        </button>
        {SERVICE_FILTER_KEYS.map((f) => {
          const count = serviceList.filter((s) => s.status === f).length;
          if (count === 0) return null;
          const cfg = SERVICE_STATUS_CONFIG[f];
          const isActive = activeFilter === f;
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="px-4 py-1.5 text-xs font-bold tracking-[0.15em] uppercase transition-colors focus-visible:outline-none"
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
      {loading ? (
        <div className="space-y-px bg-black" aria-busy="true" aria-label={lLoadingAria}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex h-28 items-center gap-4 bg-white p-4">
              <div className="h-24 w-20 animate-pulse bg-gray-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-56 animate-pulse bg-gray-100" />
                <div className="h-3 w-32 animate-pulse bg-gray-100" />
                <div className="h-3 w-24 animate-pulse bg-gray-100" />
              </div>
              <div className="h-6 w-20 animate-pulse bg-gray-100" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 bg-(--banner-bg) py-20">
          <p className="text-center text-sm text-gray-400">{L.emptyFiltered}</p>
        </div>
      ) : (
        <div className="space-y-px bg-black">
          {filtered.map((req) => {
            const cfg = SERVICE_STATUS_CONFIG[req.status];
            const isOpen = expanded.has(req.id);
            const stepOrder: ServiceStatus[] = ['open', 'in-progress', 'ready', 'completed'];
            const curIdx = stepOrder.indexOf(req.status);
            return (
              <div key={req.id} className="bg-white">
                <div className="flex items-center gap-4 px-5 py-4">
                  <button
                    onClick={() => toggle(req.id)}
                    className={`flex size-7 shrink-0 items-center justify-center focus-visible:outline-none ${
                      isOpen ? 'bg-black' : 'bg-gray-100'
                    }`}
                  >
                    <ChevronDown
                      size={13}
                      color={isOpen ? '#fff' : '#6b7280'}
                      className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
                    />
                  </button>

                  <div className="relative h-15 w-12 shrink-0 overflow-hidden">
                    <ImageWithFallback src={req.img} alt={req.item} fill sizes="48px" className="object-cover" />
                  </div>

                  <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-4">
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[10px] tracking-widest text-gray-400 uppercase">{lFieldItem}</p>
                      <p className="truncate text-xs font-bold">{req.item}</p>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-widest text-gray-400 uppercase">{lFieldRef}</p>
                      <p className="text-xs font-semibold">{req.ref}</p>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-widest text-gray-400 uppercase">{lFieldType}</p>
                      <p className="text-xs font-semibold">{CATEGORIES[req.category]}</p>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-widest text-gray-400 uppercase">{lFieldCost}</p>
                      <p className="text-xs font-semibold">
                        {req.cost !== null ? fmt(req.cost) : <span className="text-gray-400">{L.costTbc}</span>}
                      </p>
                    </div>
                  </div>

                  <span
                    className="hidden shrink-0 items-center gap-1.5 border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase sm:flex"
                    style={{ backgroundColor: cfg.bg, borderColor: cfg.border, color: cfg.text }}
                  >
                    <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: cfg.dot }} />
                    {cfg.label}
                  </span>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    {/* Progress timeline */}
                    <div className="bg-[#fafafa] px-5 py-4">
                      <p className="mb-3 text-[10px] font-bold tracking-widest text-gray-400 uppercase">{lProgress}</p>
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
                                  className="flex size-6 items-center justify-center"
                                  style={{ backgroundColor: done ? (isCurrent ? scfg.text : '#000') : '#e5e7eb' }}
                                >
                                  {done && !isCurrent ? (
                                    <Check size={10} color="#fff" />
                                  ) : isCurrent ? (
                                    <span className="size-2 rounded-full bg-white" />
                                  ) : (
                                    <span className="size-2 rounded-full bg-gray-300" />
                                  )}
                                </div>
                                <p
                                  className={`text-[9px] tracking-wider whitespace-nowrap uppercase ${
                                    done ? 'font-bold text-black' : 'font-normal text-gray-400'
                                  }`}
                                >
                                  {scfg.label}
                                </p>
                              </div>
                              {i < stepOrder.length - 1 && (
                                <div
                                  className={`mx-1 mb-4 h-px flex-1 ${
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
                    <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
                      {[
                        { label: lDroppedOff, value: req.droppedOff },
                        { label: lEstReady, value: req.estimatedReady ?? L.costTbc },
                        { label: lServiceType, value: CATEGORIES[req.category] },
                        { label: lFieldCost, value: req.cost !== null ? fmt(req.cost) : L.costTbc },
                      ].map((cell) => (
                        <div key={cell.label} className="bg-white px-4 py-3">
                          <p className="text-[10px] tracking-widest text-gray-400 uppercase">{cell.label}</p>
                          <p className="mt-0.5 text-xs font-bold">{cell.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Description */}
                    <div className="border-t border-gray-100 bg-[#fafafa] px-5 py-3">
                      <p className="mb-1 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                        {lReqDetails}
                      </p>
                      <p className="text-xs text-gray-600">{req.description}</p>
                    </div>

                    {/* Notes */}
                    <div className="flex items-start gap-2 border-t border-[#fde68a] bg-[#fffbeb] px-5 py-3">
                      <AlertTriangle size={12} color="#b45309" className="mt-0.5 shrink-0" />
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
