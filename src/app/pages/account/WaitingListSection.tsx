'use client';
import { Bell, Check, ShoppingBag, Trash2 } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { ImageWithFallback } from '@/app/components/ui/ImageWithFallback';
import { BANNER_BG, SALE_COLOR } from '@/app/constants/colors';
import { useAuth } from '@/app/context/AuthContext';
import { useCart } from '@/app/context/CartContext';
import { useWishlist } from '@/app/context/WishlistContext';
import { type WaitingItem } from '@/app/data/userData';
import { useRouter } from '@/lib/i18n/navigation';
import { getWaitingListAction } from '@/lib/oneentry/catalog/waiting-list-action';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

import { ACCENT, fmt, SectionTitle } from './shared';

// ─── Waiting List section ───────────────────────────────────────────────────
export const WAITING_LIST_LABELS = {
  title: 'Waiting List',
  bannerEyebrow: 'Never Miss Out',
  bannerHeading: 'Your Saved Items',
  bannerHint: "We'll notify you when these items are back in stock or drop in price.",
  filterBackInStock: 'Back in stock',
  filterPriceDrop: 'Price drop',
  filterArrivingSoon: 'Arriving soon',
  statuses: {
    back_in_stock: 'Back in Stock',
    low_stock: 'Low Stock',
    out_of_stock: 'Out of Stock',
  },
  emptyText: "Your waiting list is empty. Browse our store and save items to be notified when they're back in stock.",
  viewProductPrefix: 'View product:',
  sizeLabel: 'Size:',
  colourLabel: 'Colour:',
  addedPrefix: 'Added',
  notifyEnableAria: 'Enable notifications for',
  notifyDisableAria: 'Disable notifications for',
  removeAriaPrefix: 'Remove',
  removeAriaSuffix: 'from waiting list',
  ctaAdded: 'Added',
  ctaUnavailable: 'Unavailable',
  ctaAddToCart: 'Add to Cart',
  howSteps: [
    {
      step: '01',
      title: 'Save Your Size',
      desc: 'Add sold-out items to your waiting list with your preferred size and colour.',
    },
    {
      step: '02',
      title: 'Get Notified',
      desc: 'Toggle the bell icon to receive alerts the moment stock is replenished.',
    },
    {
      step: '03',
      title: 'Shop First',
      desc: 'Waiting list members get early access before items go back on general sale.',
    },
  ] as const,
  loadingAria: 'Loading waiting list',
} as const;

export function WaitingListSection() {
  const L = useDict('waiting_list_', WAITING_LIST_LABELS);
  const router = useRouter();
  const title = useT('waiting_list_title', L.title);
  const bannerEye = useT('waiting_list_top_banner_sub_title', L.bannerEyebrow);
  const bannerHead = useT('waiting_list_top_banner_title', L.bannerHeading);
  const lLoadingAria = useT('waiting_list_loading_aria', L.loadingAria);
  const sBack = useT('waiting_list_back_in_stock', L.statuses.back_in_stock);
  const sLow = useT('waiting_list_low_stock', L.statuses.low_stock);
  const sOut = useT('waiting_list_out_of_stock', L.statuses.out_of_stock);
  const addedPfx = useT('waiting_list_added', L.addedPrefix);
  const ctaUnavail = useT('waiting_list_item_status_unavailable', L.ctaUnavailable);
  const ctaAddCart = useT('waiting_list_item_status_add_to_card', L.ctaAddToCart);
  const step1Title = useT('waiting_list_01_title', L.howSteps[0].title);
  const step1Text = useT('waiting_list_01_text', L.howSteps[0].desc);
  const step2Title = useT('waiting_list_02_title', L.howSteps[1].title);
  const step2Text = useT('waiting_list_02_text', L.howSteps[1].desc);
  const step3Title = useT('waiting_list_03_title', L.howSteps[2].title);
  const step3Text = useT('waiting_list_03_text', L.howSteps[2].desc);

  const STATUS_CONFIG = {
    back_in_stock: { label: sBack, bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
    low_stock: { label: sLow, bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
    out_of_stock: { label: sOut, bg: '#fef2f2', border: '#fecaca', text: SALE_COLOR },
  };

  const howSteps = [
    { step: L.howSteps[0].step, title: step1Title, desc: step1Text },
    { step: L.howSteps[1].step, title: step2Title, desc: step2Text },
    { step: L.howSteps[2].step, title: step3Title, desc: step3Text },
  ];
  const { isLoggedIn, user } = useAuth();
  const { items: wishlistItems, removeItem } = useWishlist();
  const { addItem: addToCart } = useCart();
  const wishlistIds = useMemo(() => new Set(wishlistItems.map((i) => i.id)), [wishlistItems]);

  // Waiting list is derived from /me/wishlist: each wishlist item is enriched
  // with current OE stock status (out_of_stock / low_stock / back_in_stock).
  // Nothing to wait for unless the shopper is signed in with a non-empty
  // wishlist; that condition is derived, so signing out clears the list
  // during render instead of from inside an effect.
  const hasWishlist = Boolean(isLoggedIn && user?.wishlistItems && user.wishlistItems.length > 0);
  const [loaded, setLoaded] = useState<WaitingItem[] | null>(null);
  const waitingList = useMemo(() => (hasWishlist ? (loaded ?? []) : []), [hasWishlist, loaded]);
  const loading = hasWishlist && loaded === null;
  useEffect(() => {
    if (!hasWishlist) return;
    let cancelled = false;
    void getWaitingListAction().then((items) => {
      if (!cancelled) setLoaded(items);
    });
    return () => {
      cancelled = true;
    };
  }, [hasWishlist, user?.wishlistItems]);

  // Local-only overrides for notify toggle (not persisted)
  const [notifyOverrides, setNotifyOverrides] = useState<Record<string, boolean>>({});
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [hoveredAdd, setHoveredAdd] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const removeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    // Captured on mount — the ref object itself never changes, and reading
    // `.current` inside cleanup would resolve after the component unmounted.
    const addTimers = addTimersRef.current;
    return () => {
      if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
      addTimers.forEach((t) => clearTimeout(t));
    };
  }, []);

  const items = useMemo(
    () =>
      waitingList
        .filter((i) => wishlistIds.has(i.id) || i.id === removingId)
        .map((i) => ({ ...i, notify: notifyOverrides[i.id] ?? i.notify })),
    [waitingList, wishlistIds, removingId, notifyOverrides],
  );

  const toggleNotify = (id: string) => {
    const current = notifyOverrides[id] ?? waitingList.find((i) => i.id === id)?.notify ?? false;
    setNotifyOverrides((prev) => ({ ...prev, [id]: !current }));
  };

  const handleRemove = (id: string) => {
    if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
    setRemovingId(id);
    removeTimerRef.current = setTimeout(() => {
      removeItem(id);
      setRemovingId(null);
    }, 350);
  };

  const handleAdd = (item: WaitingItem) => {
    const existing = addTimersRef.current.get(item.id);
    if (existing) clearTimeout(existing);
    addToCart({
      id: `${item.id}-waiting`,
      name: item.name,
      brand: item.brand,
      sku: item.id,
      color: item.color,
      size: item.size,
      quantity: 1,
      price: item.price,
      image: item.img,
    });
    setAddedIds((prev) => {
      const s = new Set(prev);
      s.add(item.id);
      return s;
    });
    const t = setTimeout(() => {
      setAddedIds((prev) => {
        const s = new Set(prev);
        s.delete(item.id);
        return s;
      });
      addTimersRef.current.delete(item.id);
    }, 2000);
    addTimersRef.current.set(item.id, t);
  };

  const counts = {
    back_in_stock: items.filter((i) => i.status === 'back_in_stock').length,
    low_stock: items.filter((i) => i.status === 'low_stock').length,
    out_of_stock: items.filter((i) => i.status === 'out_of_stock').length,
  };

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

      {/* Header banner */}
      <div className="mb-8 flex flex-col items-start justify-between gap-4 bg-(--banner-bg) px-8 py-7 sm:flex-row sm:items-center">
        <div>
          <p className="mb-1 text-xs tracking-[0.3em] text-gray-400 uppercase">{bannerEye}</p>
          <h2 className="text-[clamp(1rem,2vw,1.2rem)] font-bold tracking-widest uppercase">{bannerHead}</h2>
        </div>
        <div className="flex gap-6">
          {(['back_in_stock', 'low_stock', 'out_of_stock'] as const).map((key) => (
            <div key={key} className="text-center">
              <p className="text-2xl font-extrabold" style={{ color: STATUS_CONFIG[key].text }}>
                {counts[key]}
              </p>
              <p className="text-xs whitespace-nowrap text-gray-500">{STATUS_CONFIG[key].label}</p>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-px bg-black" aria-busy="true" aria-label={lLoadingAria}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex h-28 items-center gap-4 bg-white p-4">
              <div className="h-24 w-20 animate-pulse bg-gray-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-40 animate-pulse bg-gray-100" />
                <div className="h-3 w-24 animate-pulse bg-gray-100" />
                <div className="mt-2 h-6 w-20 animate-pulse bg-gray-100" />
              </div>
              <div className="h-9 w-32 animate-pulse bg-gray-100" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 bg-(--banner-bg) py-20">
          <Bell size={32} className="text-gray-300" />
          <p className="max-w-xs text-center text-sm text-gray-400">{L.emptyText}</p>
        </div>
      ) : (
        <div className="space-y-px bg-black">
          {items.map((item) => {
            const cfg = STATUS_CONFIG[item.status];
            const isAdded = addedIds.has(item.id);
            const isRemoving = removingId === item.id;
            const canAdd = item.status !== 'out_of_stock';
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className={`flex cursor-pointer bg-white transition-opacity duration-300 ${
                  isRemoving ? 'opacity-0' : 'opacity-100'
                }`}
                onClick={() => router.push(`/product/${item.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/product/${item.id}`);
                  }
                }}
                aria-label={`${L.viewProductPrefix} ${item.name}`}
              >
                {/* Image */}
                <div className="relative h-35 w-27.5 shrink-0 overflow-hidden">
                  <ImageWithFallback src={item.img} alt={item.name} fill sizes="110px" className="object-cover" />
                  <div
                    className="absolute top-2 left-2 border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase"
                    style={{ backgroundColor: cfg.bg, borderColor: cfg.border, color: cfg.text }}
                  >
                    {cfg.label}
                  </div>
                </div>

                {/* Info */}
                <div className="flex min-w-0 flex-1 flex-col justify-between px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="mb-0.5 text-xs tracking-widest text-gray-400 uppercase">{item.brand}</p>
                      <p className="truncate pr-2 text-sm font-bold">{item.name}</p>
                      <div className="mt-1 flex gap-4">
                        <span className="text-xs text-gray-500">
                          {L.sizeLabel} <span className="font-semibold text-black">{item.size}</span>
                        </span>
                        <span className="text-xs text-gray-500">
                          {L.colourLabel} <span className="font-semibold text-black">{item.color}</span>
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-300">
                        {addedPfx} {item.addedDate}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleNotify(item.id);
                        }}
                        aria-label={
                          item.notify ? `${L.notifyDisableAria} ${item.name}` : `${L.notifyEnableAria} ${item.name}`
                        }
                        aria-pressed={item.notify}
                        className={`flex size-8 items-center justify-center transition-colors focus-visible:outline-none ${
                          item.notify ? 'bg-black' : 'bg-gray-100'
                        }`}
                      >
                        <Bell size={13} color={item.notify ? '#fff' : '#9ca3af'} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(item.id);
                        }}
                        aria-label={`${L.removeAriaPrefix} ${item.name} ${L.removeAriaSuffix}`}
                        className="flex size-8 items-center justify-center bg-gray-100 transition-colors hover:bg-[#fef2f2] focus-visible:outline-none"
                      >
                        <Trash2 size={13} color={SALE_COLOR} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm font-bold">{fmt(item.price)}</p>
                    <button
                      onMouseEnter={() => setHoveredAdd(item.id)}
                      onMouseLeave={() => setHoveredAdd(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canAdd) handleAdd(item);
                      }}
                      disabled={!canAdd}
                      className={`flex items-center gap-1.5 rounded-none px-5 py-2 text-xs font-bold tracking-[0.15em] text-white uppercase transition-colors duration-200 focus-visible:outline-none ${
                        !canAdd
                          ? 'cursor-not-allowed bg-gray-300'
                          : isAdded
                            ? 'cursor-pointer bg-(--sale)'
                            : hoveredAdd === item.id
                              ? 'cursor-pointer bg-accent'
                              : 'cursor-pointer bg-black'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check size={11} /> {L.ctaAdded}
                        </>
                      ) : !canAdd ? (
                        ctaUnavail
                      ) : (
                        <>
                          <ShoppingBag size={11} /> {ctaAddCart}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* How it works */}
      <div className="mt-10 grid grid-cols-1 gap-px bg-white sm:grid-cols-3">
        {howSteps.map((s) => (
          <div key={s.step} className="bg-white px-5 py-6">
            <p className="mb-2 text-xs font-extrabold tracking-widest text-accent">{s.step}</p>
            <p className="mb-1.5 text-sm font-bold">{s.title}</p>
            <p className="text-xs leading-relaxed text-gray-500">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
