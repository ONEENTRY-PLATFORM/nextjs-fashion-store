'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '../../store/hooks';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { ImageWithFallback } from '../../components/ImageWithFallback';
import { SectionTitle, fmt, ACCENT } from './shared';
import { SALE_COLOR, BANNER_BG } from '../../constants/colors';
import { ChevronDown, Package, Clock, RotateCcw, XCircle } from 'lucide-react';
import { MY_ORDERS_LABELS as L } from '../../data/accountLabels';
import { MY_ORDERS_DYNAMIC_ARIA } from '../../data/commonLabels';
import { useT } from '../../../lib/oneentry/labels/AccountLabelsContext';
import { cancelOrderAction, type OeOrder } from '../../../lib/oneentry/auth/actions';
import type { UserOrder } from '../../data/userData';

/** Map a raw OneEntry order to the shape the UI already expects. */
function adaptOeOrder(o: OeOrder): UserOrder {
  const total = parseFloat(o.totalSum) || 0;
  const date = o.createdDate
    ? new Date(o.createdDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
  // Prefer OE's admin-panel display title (`statusLocalizeInfos.title` —
  // what the merchant sees in the CMS). Only fall back to the marker map
  // when the response didn't carry a title, and only in the last resort
  // pretty-print the raw marker so the badge never reads as an empty string.
  const raw = o.statusIdentifier?.toString().trim() ?? '';
  const key = raw.toLowerCase();
  const statusMap: Record<string, UserOrder['status']> = {
    delivered: 'Delivered',
    completed: 'Delivered',
    cancelled: 'Cancelled',
    canceled: 'Cancelled',
    processing: 'Processing',
    new: 'Processing',
    pending: 'Processing',
  };
  const status: UserOrder['status'] = (o.statusTitle && o.statusTitle.trim())
    || statusMap[key]
    || (raw
      ? raw
          .replace(/[_-]+/g, ' ')
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Processing');
  const orderItems = o.products.map((p) => ({
    name: p.title,
    size: '',
    color: '',
    qty: p.quantity,
    price: p.price,
    img: p.image,
    productId: p.id,
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
    oeId: o.id,
    oeStorage: o.storage,
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
  const { addItem } = useCart();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [cancelTarget, setCancelTarget] = useState<UserOrder | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  // Local overlay so a just-cancelled order flips its badge immediately.
  // OE's `oeOrders` prop only refreshes on next login/hydration.
  const [locallyCancelledIds, setLocallyCancelledIds] = useState<Set<number>>(new Set());

  const handleReorder = (order: UserOrder) => {
    // Push every OE-sourced line item back into the cart. Mock rows without
    // `productId` are ignored — they can't be resolved to a real product.
    for (const item of order.orderItems) {
      if (typeof item.productId !== 'number') continue;
      addItem({
        id: String(item.productId),
        name: item.name,
        brand: '',
        color: item.color,
        sku: '',
        size: item.size,
        quantity: item.qty,
        price: item.price,
        image: item.img,
      });
    }
    router.push('/cart');
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget?.oeId || !cancelTarget.oeStorage) return;
    setCancelBusy(true);
    setCancelError(null);
    const res = await cancelOrderAction(cancelTarget.oeId, cancelTarget.oeStorage);
    setCancelBusy(false);
    if (!res.ok) {
      setCancelError(res.error);
      return;
    }
    setLocallyCancelledIds((prev) => new Set(prev).add(cancelTarget.oeId!));
    setCancelTarget(null);
  };

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

  // Static colours for the three canonical buckets that ship with the UI.
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

  // Semantic palette + deterministic fallback so merchant-defined statuses
  // (whatever OE returns via `statusLocalizeInfos.title`) don't all read as
  // neutral grey. Keyword rules run first so "Shipped" always looks like a
  // shipping state, then anything unmatched gets a stable hash-picked colour
  // so two different unknown statuses stay visually distinct.
  const KEYWORD_TINTS: Array<{ match: RegExp; color: string; bg: string }> = [
    { match: /cancel|reject|fail|declin|void/i,             color: '#dc2626', bg: '#fef2f2' },
    { match: /refund|return/i,                              color: '#9333ea', bg: '#faf5ff' },
    { match: /deliver|complete|success|finish|done|closed/i,color: '#16a34a', bg: '#f0fdf4' },
    { match: /paid|payment.?received/i,                     color: '#10b981', bg: '#ecfdf5' },
    { match: /ship|transit|dispatch|out.for.delivery/i,     color: '#2563eb', bg: '#eff6ff' },
    { match: /confirm|accepted|approved/i,                  color: '#0891b2', bg: '#ecfeff' },
    { match: /process|preparing|packing|assembl/i,          color: '#d97706', bg: '#fffbeb' },
    { match: /pending|awaiting|hold|await/i,                color: '#ca8a04', bg: '#fefce8' },
    { match: /new|received|created|placed/i,                color: '#6366f1', bg: '#eef2ff' },
  ];
  // 12-colour fallback palette — enough distinct hues that any random
  // status string picks a colour that reads as its own state.
  const FALLBACK_PALETTE: Array<{ color: string; bg: string }> = [
    { color: '#0d9488', bg: '#f0fdfa' },
    { color: '#7c3aed', bg: '#f5f3ff' },
    { color: '#db2777', bg: '#fdf2f8' },
    { color: '#0ea5e9', bg: '#f0f9ff' },
    { color: '#65a30d', bg: '#f7fee7' },
    { color: '#f97316', bg: '#fff7ed' },
    { color: '#0369a1', bg: '#f0f9ff' },
    { color: '#c2410c', bg: '#fff7ed' },
    { color: '#4d7c0f', bg: '#f7fee7' },
    { color: '#0f766e', bg: '#f0fdfa' },
    { color: '#6d28d9', bg: '#f5f3ff' },
    { color: '#be185d', bg: '#fdf2f8' },
  ];
  const hashIdx = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h) % FALLBACK_PALETTE.length;
  };
  const statusStyle = (label: string): { color: string; bg: string } => {
    if (statusColor[label]) return { color: statusColor[label], bg: statusBg[label] };
    for (const { match, color, bg } of KEYWORD_TINTS) if (match.test(label)) return { color, bg };
    return FALLBACK_PALETTE[hashIdx(label.toLowerCase())];
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
        {orders.map(rawOrder => {
          // Overlay the local-cancel snapshot so the badge flips immediately
          // after the user confirms — OE's `oeOrders` prop only refreshes
          // on next login/hydration, which would otherwise leave the badge
          // stale until page reload.
          const order: UserOrder = rawOrder.oeId != null && locallyCancelledIds.has(rawOrder.oeId)
            ? { ...rawOrder, status: 'Cancelled' }
            : rawOrder;
          const isOpen = expanded.has(order.id);
          const { color, bg } = statusStyle(order.status);
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
                      {order.orderItems.some((it) => typeof it.productId === 'number') && (
                        <button
                          onClick={() => handleReorder(order)}
                          className="flex items-center gap-1.5 text-xs tracking-wide uppercase focus-visible:outline-none hover:underline font-semibold text-gray-500"
                        >
                          <RotateCcw size={11} /> {lReorder}
                        </button>
                      )}
                      {/* Cancel — only for OE-backed orders that aren't already
                          cancelled/delivered. Uses the shared `/cancel/i` bucket
                          so tenant-specific markers (`home_cancelled`, `store_pickup_cancelled`, …)
                          all match. */}
                      {order.oeId != null && order.oeStorage
                        && !locallyCancelledIds.has(order.oeId)
                        && !/cancel|deliver|complete|refund|return/i.test(order.status)
                        && (
                          <button
                            onClick={() => { setCancelError(null); setCancelTarget(order); }}
                            className="flex items-center gap-1.5 text-xs tracking-wide uppercase focus-visible:outline-none hover:underline font-semibold text-[var(--sale)]"
                          >
                            <XCircle size={11} /> Cancel
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

      {/* Cancel-confirmation modal — appears when the shopper clicks the
          Cancel button on an order row. Backdrop is a plain fixed overlay
          rather than a portal so it doesn't drag in extra infra just for
          this local flow. */}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-order-title"
          onClick={(e) => { if (e.target === e.currentTarget && !cancelBusy) setCancelTarget(null); }}
        >
          <div className="bg-white max-w-sm w-full p-6 border border-[#e5e7eb]">
            <h3 id="cancel-order-title" className="text-sm tracking-widest uppercase font-bold mb-3">
              Cancel order
            </h3>
            <p className="text-sm text-gray-700 mb-5">
              Do you want to cancel order <strong>{cancelTarget.id}</strong>?
            </p>
            {cancelError && (
              <p className="text-xs text-[var(--sale)] mb-3" role="alert">{cancelError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelBusy}
                className="px-4 py-2 text-xs tracking-wider uppercase font-semibold border border-[#d1d5db] hover:bg-gray-50 disabled:opacity-50"
              >
                No
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelBusy}
                className="px-4 py-2 text-xs tracking-wider uppercase font-bold text-white bg-black hover:bg-primary-women active:bg-primary-men disabled:opacity-60"
              >
                {cancelBusy ? '…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
