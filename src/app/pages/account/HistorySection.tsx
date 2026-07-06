'use client'
import React, { useState, useRef, useEffect } from 'react';
import { useAppSelector } from '../../store/hooks';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { ImageWithFallback } from '../../components/ImageWithFallback';
import { type HistoryOrderStatus, type HistoryOrder } from '../../data/userData';
import { ChevronDown, Check, RotateCcw, Package } from 'lucide-react';
import { SectionTitle, ACCENT, fmt } from './shared';
import { SALE_COLOR, BANNER_BG } from '../../constants/colors';
import { TrackingModal } from './history/TrackingModal';
import { HISTORY_LABELS as L } from '../../data/accountLabels';
import { useT } from '../../../lib/oneentry/labels/AccountLabelsContext';
import type { OeOrder } from '../../../lib/oneentry/auth/actions';

const HISTORY_FILTERS: HistoryOrderStatus[] = ['delivered', 'shipped', 'processing', 'cancelled', 'returned'];

/**
 * Bucket an OE order into one of our five UI statuses. OE namespaces status
 * markers per storage on this tenant — `home_new`, `home_paid`, `home_shipped`,
 * `home_delivered`, `home_cancelled`, `store_pickup_ready`, etc. — so the
 * old exact-match dictionary bucketed everything as `processing`. Substring
 * regex on the marker handles every merchant naming convention (`home_*`,
 * `pickup_*`, `locker_*`, camelCase, etc.). `returned` beats `cancelled`
 * beats `delivered` beats `shipped` beats `processing` — reversals win over
 * fulfillment, most-fulfilled state wins over less-fulfilled.
 */
function bucketOeStatus(statusIdentifier: string): HistoryOrderStatus {
  const s = statusIdentifier.toLowerCase();
  if (!s) return 'processing';
  if (/return/.test(s))                                           return 'returned';
  if (/cancel|refund|reject|void|fail|declin/.test(s))            return 'cancelled';
  if (/deliver|complete|done|closed|finish|received|arrived/.test(s)) return 'delivered';
  if (/ship|dispatch|transit|out.?for.?delivery|paid/.test(s))    return 'shipped';
  return 'processing';
}

/** Map an OE order into the HistoryOrder shape this section already expects. */
function adaptOeToHistory(o: OeOrder): HistoryOrder {
  const total = parseFloat(o.totalSum) || 0;
  const date = o.createdDate
    ? new Date(o.createdDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
  return {
    id: `oe-${o.id}`,
    orderNo: `OE-${o.id}`,
    date,
    status: bucketOeStatus(o.statusIdentifier ?? ''),
    // Preserve OE's admin-panel display name so the row can render "Home Paid"
    // etc. verbatim — see ORDER_STATUS_CONFIG override below.
    statusTitle: o.statusTitle || undefined,
    total,
    itemCount: o.products.length,
    trackingNo: null,
    items: o.products.map((p) => ({
      name: p.title,
      size: '',
      color: '',
      qty: p.quantity,
      price: p.price,
      img: p.image,
    })),
  };
}

export function HistorySection() {
  const { user, isLoggedIn } = useAuth();
  const mockHistory = useAppSelector(s => s.user.data.purchaseHistory);
  const MOCK_HISTORY_ORDERS: HistoryOrder[] = isLoggedIn && user?.oeOrders
    ? user.oeOrders.map(adaptOeToHistory)
    : mockHistory;
  const title       = useT('purchase_history', 'purchase_history_title',                 L.title);
  const eyebrow     = useT('purchase_history', 'purchase_history_transaction_records',   L.eyebrow);
  const bannerHead  = useT('purchase_history', 'purchase_history_your_order',            L.bannerHeading);
  const lTotalOrd   = useT('purchase_history', 'purchase_history_total_orders',          L.totalOrders);
  const lDelivered  = useT('purchase_history', 'purchase_history_delivered',             L.delivered);
  const lTotalSpent = useT('purchase_history', 'purchase_history_total_spent',           L.totalSpent);
  const lFilterAll  = useT('purchase_history', 'purchase_history_status_tab_all',        L.filterAll);
  const sDelivered  = useT('purchase_history', 'purchase_history_status_tab_delivered',  L.statuses.delivered);
  const sShipped    = useT('purchase_history', 'purchase_history_status_tab_shipped',    L.statuses.shipped);
  const sCancelled  = useT('purchase_history', 'purchase_history_status_tab_cancelled',  L.statuses.cancelled);
  const sReturned   = useT('purchase_history', 'purchase_history_status_tab_returned',   L.statuses.returned);
  const lRowOrder   = useT('purchase_history', 'purchase_history_order',                 L.rowOrder);
  const lRowDate    = useT('purchase_history', 'purchase_history_date',                  L.rowDate);
  const lRowItems   = useT('purchase_history', 'purchase_history_items',                 L.rowItems);
  const lRowTotal   = useT('purchase_history', 'purchase_history_total',                 L.rowTotal);
  const lReorder    = useT('purchase_history', 'purchase_history_reorder',               L.reorder);
  const lViewBtn    = useT('purchase_history', 'purchase_history_view_cta',              L.viewBtn);
  const lOrderTotal = useT('purchase_history', 'purchase_history_order_total',           L.orderTotal);

  const ORDER_STATUS_CONFIG: Record<HistoryOrderStatus, { label: string; bg: string; border: string; text: string }> = {
    delivered:  { label: sDelivered,            bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
    shipped:    { label: sShipped,              bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb' },
    processing: { label: L.statuses.processing, bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
    cancelled:  { label: sCancelled,            bg: '#fef2f2', border: '#fecaca', text: SALE_COLOR },
    returned:   { label: sReturned,             bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280' },
  };

  const { addItem, openMiniCart } = useCart();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<HistoryOrderStatus | 'all'>('all');
  const [trackingModal, setTrackingModal] = useState<{ trackingNo: string; orderNo: string } | null>(null);
  const [hoveredReorder, setHoveredReorder] = useState<string | null>(null);
  const [reorderedIds, setReorderedIds] = useState<Set<string>>(new Set());
  const reorderTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    return () => { reorderTimersRef.current.forEach(t => clearTimeout(t)); };
  }, []);

  const toggle = (id: string) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const handleReorder = (id: string) => {
    const order = MOCK_HISTORY_ORDERS.find(o => o.id === id);
    if (!order) return;

    order.items.forEach((item, idx) => {
      addItem({
        id: `reorder-${id}-${idx}`,
        name: item.name,
        brand: '',
        color: item.color,
        sku: `REORDER-${id}-${idx}`,
        size: item.size,
        quantity: item.qty,
        price: item.price,
        image: item.img,
      });
    });
    openMiniCart();

    const existing = reorderTimersRef.current.get(id);
    if (existing) clearTimeout(existing);
    setReorderedIds(prev => { const s = new Set(prev); s.add(id); return s; });
    const t = setTimeout(() => {
      setReorderedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      reorderTimersRef.current.delete(id);
    }, 2000);
    reorderTimersRef.current.set(id, t);
  };

  const filtered = activeFilter === 'all' ? MOCK_HISTORY_ORDERS : MOCK_HISTORY_ORDERS.filter(o => o.status === activeFilter);

  const totalSpent = MOCK_HISTORY_ORDERS.filter(o => o.status === 'delivered').reduce((a, o) => a + o.total, 0);
  const totalOrders = MOCK_HISTORY_ORDERS.length;
  const deliveredCount = MOCK_HISTORY_ORDERS.filter(o => o.status === 'delivered').length;

  return (
    <div
      style={{
        '--sale': SALE_COLOR,
        '--accent': ACCENT,
        '--banner-bg': BANNER_BG,
      } as React.CSSProperties}
    >
      {trackingModal && (
        <TrackingModal
          trackingNo={trackingModal.trackingNo}
          orderNo={trackingModal.orderNo}
          onClose={() => setTrackingModal(null)}
        />
      )}
      <SectionTitle title={title} />

      {/* Stats banner */}
      <div className="mb-8 px-8 py-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--banner-bg)]">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-gray-400 mb-1">{eyebrow}</p>
          <h2 className="tracking-widest uppercase text-[clamp(1rem,2vw,1.2rem)] font-bold">
            {bannerHead}
          </h2>
        </div>
        <div className="flex gap-8">
          {[
            { label: lTotalOrd,   value: totalOrders,    color: '#000' },
            { label: lDelivered,  value: deliveredCount, color: '#16a34a' },
            { label: lTotalSpent, value: fmt(totalSpent), color: ACCENT },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-extrabold" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs text-gray-500 whitespace-nowrap">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-1.5 text-xs tracking-[0.15em] uppercase focus-visible:outline-none transition-colors font-bold ${
            activeFilter === 'all' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {lFilterAll} ({MOCK_HISTORY_ORDERS.length})
        </button>
        {HISTORY_FILTERS.map(f => {
          const count = MOCK_HISTORY_ORDERS.filter(o => o.status === f).length;
          if (count === 0) return null;
          const cfg = ORDER_STATUS_CONFIG[f];
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

      {/* Order list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-[var(--banner-bg)]">
          <p className="text-sm text-gray-400 text-center">{L.emptyText}</p>
        </div>
      ) : (
        <div className="space-y-px bg-black">
          {filtered.map(order => {
            const cfg = ORDER_STATUS_CONFIG[order.status];
            const isOpen = expanded.has(order.id);
            const isReordered = reorderedIds.has(order.id);
            const canReorder = order.status !== 'processing';
            return (
              <div key={order.id} className="bg-white">
                {/* Order header row */}
                <div className="flex items-center gap-4 px-5 py-4">
                  <button
                    onClick={() => toggle(order.id)}
                    className={`w-7 h-7 flex items-center justify-center flex-shrink-0 focus-visible:outline-none transition-colors ${
                      isOpen ? 'bg-black' : 'bg-gray-100'
                    }`}
                  >
                    <ChevronDown
                      size={13}
                      color={isOpen ? '#fff' : '#6b7280'}
                      className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
                    />
                  </button>

                  <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-0.5">
                    <div>
                      <p className="text-[10px] text-gray-400 tracking-widest uppercase">{lRowOrder}</p>
                      <p className="text-xs truncate font-bold">{order.orderNo}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 tracking-widest uppercase">{lRowDate}</p>
                      <p className="text-xs font-semibold">{order.date}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 tracking-widest uppercase">{lRowItems}</p>
                      <p className="text-xs font-semibold">{order.itemCount} {order.itemCount > 1 ? L.itemPlural : L.itemSingular}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 tracking-widest uppercase">{lRowTotal}</p>
                      <p className="text-xs font-bold">{fmt(order.total)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="px-2 py-0.5 text-[10px] tracking-wider uppercase hidden sm:inline-block border font-bold"
                      style={{ backgroundColor: cfg.bg, borderColor: cfg.border, color: cfg.text }}
                    >
                      {order.statusTitle ?? cfg.label}
                    </span>
                    {order.trackingNo && (
                      <button
                        onClick={() => setTrackingModal({ trackingNo: order.trackingNo!, orderNo: order.orderNo })}
                        className="w-8 h-8 flex items-center justify-center focus-visible:outline-none hover:opacity-70 transition-opacity bg-gray-100"
                        title={L.trackTitleTpl(order.trackingNo)}
                      >
                        <Package size={13} color="#6b7280" />
                      </button>
                    )}
                    <button
                      onMouseEnter={() => setHoveredReorder(order.id)}
                      onMouseLeave={() => setHoveredReorder(null)}
                      onClick={() => canReorder && handleReorder(order.id)}
                      disabled={!canReorder}
                      className={`px-3 py-2 text-[10px] tracking-[0.12em] uppercase text-white flex items-center gap-1 focus-visible:outline-none font-bold transition-colors duration-200 ${
                        !canReorder
                          ? 'bg-gray-300 cursor-not-allowed'
                          : isReordered
                            ? 'bg-[var(--sale)] cursor-pointer'
                            : hoveredReorder === order.id
                              ? 'bg-[var(--accent)] cursor-pointer'
                              : 'bg-black cursor-pointer'
                      }`}
                    >
                      {isReordered ? <><Check size={10} /> {L.reorderDone}</> : <><RotateCcw size={10} /> {lReorder}</>}
                    </button>
                  </div>
                </div>

                {/* Expanded items */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    {order.trackingNo && (
                      <div className="flex items-center gap-2 px-5 py-2.5 text-xs bg-[#f9fafb]">
                        <Package size={11} color="#6b7280" />
                        <span className="text-gray-500">{L.trackingPrefix}</span>
                        <span className="font-bold text-black">{order.trackingNo}</span>
                        <button
                          onClick={() => setTrackingModal({ trackingNo: order.trackingNo!, orderNo: order.orderNo })}
                          className="ml-1 underline text-xs focus-visible:outline-none hover:opacity-70 transition-opacity text-[var(--accent)] font-[inherit]"
                        >
                          {lViewBtn}
                        </button>
                      </div>
                    )}
                    <div className="space-y-px bg-gray-100">
                      {order.items.map((item) => (
                        <div key={`${item.name}-${item.size}`} className="flex items-center gap-4 px-5 py-3 bg-white">
                          <div className="relative flex-shrink-0 overflow-hidden w-14 h-[70px]">
                            <ImageWithFallback src={item.img} alt={item.name} fill sizes="56px" className="object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs truncate font-bold">{item.name}</p>
                            <div className="flex gap-3 mt-0.5">
                              <span className="text-[11px] text-gray-500">{L.itemSize}: <span className="font-semibold text-black">{item.size}</span></span>
                              <span className="text-[11px] text-gray-500">{L.itemColourPrefix} <span className="font-semibold text-black">{item.color}</span></span>
                              <span className="text-[11px] text-gray-500">{L.itemQtyPrefix} <span className="font-semibold text-black">{item.qty}</span></span>
                            </div>
                          </div>
                          <p className="text-xs flex-shrink-0 font-bold">{fmt(item.price * item.qty)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end items-center gap-4 px-5 py-3 bg-[var(--banner-bg)]">
                      <span className="text-xs text-gray-500 tracking-widest uppercase">{lOrderTotal}</span>
                      <span className="text-sm font-extrabold">{fmt(order.total)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
