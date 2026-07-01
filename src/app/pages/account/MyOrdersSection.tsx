'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '../../store/hooks';
import { useAuth } from '../../context/AuthContext';
import { ImageWithFallback } from '../../components/ImageWithFallback';
import { SectionTitle, fmt, ACCENT } from './shared';
import { SALE_COLOR, BANNER_BG } from '../../constants/colors';
import { ChevronDown, Package, Clock, RotateCcw } from 'lucide-react';
import { MY_ORDERS_LABELS as L } from '../../data/accountLabels';
import { MY_ORDERS_DYNAMIC_ARIA } from '../../data/commonLabels';
import { useT } from '../../../lib/oneentry/labels/AccountLabelsContext';
import type { OeOrder } from '../../../lib/oneentry/auth/actions';
import type { UserOrder } from '../../data/userData';

/** Map a raw OneEntry order to the shape the UI already expects. */
function adaptOeOrder(o: OeOrder): UserOrder {
  const total = parseFloat(o.totalSum) || 0;
  const date = o.createdDate
    ? new Date(o.createdDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
  // Map OE status identifiers to the 3 UI buckets. Anything we don't recognise
  // falls back to 'Processing' so it still renders.
  const statusMap: Record<string, UserOrder['status']> = {
    delivered: 'Delivered',
    completed: 'Delivered',
    cancelled: 'Cancelled',
    canceled: 'Cancelled',
    processing: 'Processing',
    new: 'Processing',
    pending: 'Processing',
  };
  const status = statusMap[o.statusIdentifier?.toLowerCase?.() ?? ''] ?? 'Processing';
  const orderItems = o.products.map((p) => ({
    name: p.title,
    size: '',
    color: '',
    qty: p.quantity,
    price: p.price,
    img: p.image,
  }));
  return {
    id: `OE-${o.id}`,
    date,
    status,
    items: orderItems.length,
    total,
    image: orderItems[0]?.img ?? '',
    trackingNo: null,
    estimatedDelivery: '',
    orderItems,
  };
}

export function MyOrdersSection() {
  const { user, isLoggedIn } = useAuth();
  const fallback = useAppSelector(s => s.user.data.orders);
  // When signed in, source orders from OE. Otherwise (e.g. dev preview without
  // auth) keep the redux mock so the layout still demoes.
  const orders = isLoggedIn && user?.oeOrders
    ? user.oeOrders.map(adaptOeOrder)
    : fallback;
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const viewDetails = useT('my_orders', 'my_orders_view_order_details', L.viewOrderDetails);
  const hideDetails = useT('my_orders', 'my_order_hide_details',        L.hideDetails);
  const lOrderId    = useT('my_orders', 'my_orders_order_id',           L.orderId);
  const lDatePlaced = useT('my_orders', 'my_orders_date_placed',        L.datePlaced);
  const lStatus     = useT('my_orders', 'my_orders_status',             L.status);
  const lTracking   = useT('my_orders', 'my_orders_tracking',           L.tracking);
  const lEstDeliv   = useT('my_orders', 'my_orders_est_delivery',       L.estDelivery);
  const lOrderTotal = useT('my_orders', 'my_orders_order_total',        L.orderTotal);
  const lItem       = useT('my_orders', 'my_orders_number_of_items',    L.itemSingular);
  const lFullHist   = useT('my_orders', 'my_order_full_history_cta',    L.fullHistory);
  const lReorder    = useT('my_orders', 'my_order_reorder_cta',         L.reorder);

  const statusColor: Record<string, string> = {
    [L.statusDelivered]: '#16a34a',
    [L.statusProcessing]: '#d97706',
    [L.statusCancelled]: SALE_COLOR,
  };
  const statusBg: Record<string, string> = {
    [L.statusDelivered]: '#f0fdf4',
    [L.statusProcessing]: '#fffbeb',
    [L.statusCancelled]: '#fef2f2',
  };

  const toggle = (id: string) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div
      style={{
        '--sale': SALE_COLOR,
        '--accent': ACCENT,
        '--banner-bg': BANNER_BG,
      } as React.CSSProperties}
    >
      <SectionTitle title={L.title} />
      <div className="space-y-3">
        {orders.map(order => {
          const isOpen = expanded.has(order.id);
          const color = statusColor[order.status] ?? '#6b7280';
          const bg = statusBg[order.status] ?? '#f9fafb';
          return (
            <div key={order.id} className="border border-[#e5e7eb]">
              {/* ── Summary row ── */}
              <div className="flex gap-4 p-5">
                <div className="relative w-16 h-20 flex-shrink-0">
                  <ImageWithFallback src={order.image} alt={order.id} fill sizes="64px" className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-bold">{order.id}</p>
                      <p className="text-xs text-gray-400">{order.date}</p>
                    </div>
                    <span
                      className="text-xs px-2 py-1 font-semibold border"
                      style={{ backgroundColor: bg, color, borderColor: `${color}30` }}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-gray-500 text-xs">{order.items} {order.items !== 1 ? L.itemPlural : lItem}</span>
                    <span className="font-bold">{fmt(order.total)}</span>
                  </div>
                  <button
                    onClick={() => toggle(order.id)}
                    className="flex items-center gap-1.5 text-xs tracking-wide uppercase focus-visible:outline-none hover:underline font-semibold"
                    aria-expanded={isOpen}
                    aria-label={MY_ORDERS_DYNAMIC_ARIA.viewDetailsTpl(order.id)}
                  >
                    {isOpen ? hideDetails : viewDetails}
                    <ChevronDown
                      size={12}
                      className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
                    />
                  </button>
                </div>
              </div>

              {/* ── Expanded details ── */}
              {isOpen && (
                <div className="border-t border-[#f0f0f0]">
                  {/* Metadata row */}
                  <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#fafafa]">
                    <div>
                      <p className="text-[10px] text-gray-400 tracking-widest uppercase mb-0.5">{lOrderId}</p>
                      <p className="text-xs font-bold">{order.id}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 tracking-widest uppercase mb-0.5">{lDatePlaced}</p>
                      <p className="text-xs flex items-center gap-1 font-semibold">
                        <Clock size={10} className="text-gray-400" />{order.date}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 tracking-widest uppercase mb-0.5">{lStatus}</p>
                      <p className="text-xs font-bold" style={{ color }}>{order.status}</p>
                    </div>
                    {order.trackingNo && (
                      <div>
                        <p className="text-[10px] text-gray-400 tracking-widest uppercase mb-0.5">{lTracking}</p>
                        <p className="text-xs flex items-center gap-1 font-semibold">
                          <Package size={10} className="text-gray-400" />{order.trackingNo}
                        </p>
                      </div>
                    )}
                    {order.estimatedDelivery && (
                      <div>
                        <p className="text-[10px] text-gray-400 tracking-widest uppercase mb-0.5">{lEstDeliv}</p>
                        <p className="text-xs font-semibold">{order.estimatedDelivery}</p>
                      </div>
                    )}
                  </div>

                  {/* Item rows */}
                  <div className="space-y-px bg-gray-100 border-t border-[#e5e7eb]">
                    {order.orderItems.map((item, idx) => (
                      <div key={`${item.name}-${item.size}-${idx}`} className="flex items-center gap-4 px-5 py-3 bg-white">
                        <div className="relative flex-shrink-0 overflow-hidden w-12 h-[60px]">
                          <ImageWithFallback src={item.img} alt={item.name} fill sizes="48px" className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate font-bold">{item.name}</p>
                          <div className="flex gap-3 mt-0.5">
                            <span className="text-[11px] text-gray-500">{L.itemSize}: <span className="font-semibold text-black">{item.size}</span></span>
                            <span className="text-[11px] text-gray-500">{L.itemColour}: <span className="font-semibold text-black">{item.color}</span></span>
                            <span className="text-[11px] text-gray-500">{L.itemQty}: <span className="font-semibold text-black">{item.qty}</span></span>
                          </div>
                        </div>
                        <p className="text-xs flex-shrink-0 font-bold">{fmt(item.price * item.qty)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Footer: total + actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-[var(--banner-bg)] border-t border-[#e5e7eb]">
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-500 tracking-widest uppercase">{lOrderTotal}</span>
                      <span className="text-sm font-extrabold">{fmt(order.total)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => router.push('/account?tab=history')}
                        className="flex items-center gap-1.5 text-xs tracking-wide uppercase focus-visible:outline-none hover:underline font-semibold text-[var(--accent)]"
                      >
                        {lFullHist}
                      </button>
                      {order.status !== 'Processing' && (
                        <button className="flex items-center gap-1.5 text-xs tracking-wide uppercase focus-visible:outline-none hover:underline font-semibold text-gray-500">
                          <RotateCcw size={11} /> {lReorder}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
