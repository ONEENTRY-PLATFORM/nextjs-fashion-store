'use client'
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { ImageWithFallback } from '../../components/ImageWithFallback';
import { useRouter } from 'next/navigation';
import { type WaitingItem } from '../../data/userData';
import { getWaitingListAction } from '../../../lib/oneentry/catalog/waiting-list-action';
import { Bell, ShoppingBag, Check, Trash2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { SectionTitle, ACCENT, fmt } from './shared';
import { SALE_COLOR, BANNER_BG } from '../../constants/colors';
import { WAITING_LIST_LABELS as L } from '../../data/accountLabels';
import { useT } from '../../../lib/oneentry/labels/AccountLabelsContext';

export function WaitingListSection() {
  const router = useRouter();
  const title       = useT('waiting_list', 'waiting_list_title',               L.title);
  const bannerEye   = useT('waiting_list', 'waiting_list_top_banner_sub_title', L.bannerEyebrow);
  const bannerHead  = useT('waiting_list', 'waiting_list_top_banner_title',    L.bannerHeading);
  const sBack       = useT('waiting_list', 'waiting_list_back_in_stock',       L.statuses.back_in_stock);
  const sLow        = useT('waiting_list', 'waiting_list_low_stock',           L.statuses.low_stock);
  const sOut        = useT('waiting_list', 'waiting_list_out_of_stock',        L.statuses.out_of_stock);
  const addedPfx    = useT('waiting_list', 'waiting_list_added',               L.addedPrefix);
  const ctaUnavail  = useT('waiting_list', 'waiting_list_item_status_unavailable', L.ctaUnavailable);
  const ctaAddCart  = useT('waiting_list', 'waiting_list_item_status_add_to_card', L.ctaAddToCart);
  const step1Title  = useT('waiting_list', 'waiting_list_01_title',            L.howSteps[0].title);
  const step1Text   = useT('waiting_list', 'waiting_list_01_text',             L.howSteps[0].desc);
  const step2Title  = useT('waiting_list', 'waiting_list_02_title',            L.howSteps[1].title);
  const step2Text   = useT('waiting_list', 'waiting_list_02_text',             L.howSteps[1].desc);
  const step3Title  = useT('waiting_list', 'waiting_list_03_title',            L.howSteps[2].title);
  const step3Text   = useT('waiting_list', 'waiting_list_03_text',             L.howSteps[2].desc);

  const STATUS_CONFIG = {
    back_in_stock: { label: sBack, bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
    low_stock:     { label: sLow,  bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
    out_of_stock:  { label: sOut,  bg: '#fef2f2', border: '#fecaca', text: SALE_COLOR },
  };

  const howSteps = [
    { step: L.howSteps[0].step, title: step1Title, desc: step1Text },
    { step: L.howSteps[1].step, title: step2Title, desc: step2Text },
    { step: L.howSteps[2].step, title: step3Title, desc: step3Text },
  ];
  const { isLoggedIn, user } = useAuth();
  const { items: wishlistItems, removeItem } = useWishlist();
  const { addItem: addToCart } = useCart();
  const wishlistIds = useMemo(() => new Set(wishlistItems.map(i => i.id)), [wishlistItems]);

  // Waiting list is derived from /me/wishlist: each wishlist item is enriched
  // with current OE stock status (out_of_stock / low_stock / back_in_stock).
  const [waitingList, setWaitingList] = useState<WaitingItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!isLoggedIn || !user?.wishlistItems || user.wishlistItems.length === 0) {
      setWaitingList([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getWaitingListAction().then((items) => {
      if (cancelled) return;
      setWaitingList(items);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [isLoggedIn, user?.wishlistItems]);

  // Local-only overrides for notify toggle (not persisted)
  const [notifyOverrides, setNotifyOverrides] = useState<Record<string, boolean>>({});
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [hoveredAdd, setHoveredAdd] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const removeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    return () => {
      if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
      addTimersRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  const items = useMemo(
    () => waitingList
      .filter(i => wishlistIds.has(i.id) || i.id === removingId)
      .map(i => ({ ...i, notify: notifyOverrides[i.id] ?? i.notify })),
    [waitingList, wishlistIds, removingId, notifyOverrides],
  );

  const toggleNotify = (id: string) => {
    const current = notifyOverrides[id] ?? waitingList.find(i => i.id === id)?.notify ?? false;
    setNotifyOverrides(prev => ({ ...prev, [id]: !current }));
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
    setAddedIds(prev => { const s = new Set(prev); s.add(item.id); return s; });
    const t = setTimeout(() => {
      setAddedIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
      addTimersRef.current.delete(item.id);
    }, 2000);
    addTimersRef.current.set(item.id, t);
  };

  const counts = {
    back_in_stock: items.filter(i => i.status === 'back_in_stock').length,
    low_stock:     items.filter(i => i.status === 'low_stock').length,
    out_of_stock:  items.filter(i => i.status === 'out_of_stock').length,
  };

  return (
    <div
      style={{
        '--sale': SALE_COLOR,
        '--accent': ACCENT,
        '--banner-bg': BANNER_BG,
      } as React.CSSProperties}
    >
      <SectionTitle title={title} />

      {/* Header banner */}
      <div className="mb-8 px-8 py-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--banner-bg)]">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-gray-400 mb-1">{bannerEye}</p>
          <h2 className="tracking-widest uppercase text-[clamp(1rem,2vw,1.2rem)] font-bold">
            {bannerHead}
          </h2>
        </div>
        <div className="flex gap-6">
          {(['back_in_stock', 'low_stock', 'out_of_stock'] as const).map(key => (
            <div key={key} className="text-center">
              <p className="text-2xl font-extrabold" style={{ color: STATUS_CONFIG[key].text }}>{counts[key]}</p>
              <p className="text-xs text-gray-500 whitespace-nowrap">{STATUS_CONFIG[key].label}</p>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-px bg-black" aria-busy="true" aria-label="Loading waiting list">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-white h-[112px]">
              <div className="w-20 h-24 bg-gray-100 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-40 bg-gray-100 animate-pulse" />
                <div className="h-3 w-24 bg-gray-100 animate-pulse" />
                <div className="h-6 w-20 bg-gray-100 animate-pulse mt-2" />
              </div>
              <div className="h-9 w-32 bg-gray-100 animate-pulse" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-[var(--banner-bg)]">
          <Bell size={32} className="text-gray-300" />
          <p className="text-sm text-gray-400 text-center max-w-xs">{L.emptyText}</p>
        </div>
      ) : (
        <div className="space-y-px bg-black">
          {items.map(item => {
            const cfg = STATUS_CONFIG[item.status];
            const isAdded = addedIds.has(item.id);
            const isRemoving = removingId === item.id;
            const canAdd = item.status !== 'out_of_stock';
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className={`flex bg-white transition-opacity duration-300 cursor-pointer ${
                  isRemoving ? 'opacity-0' : 'opacity-100'
                }`}
                onClick={() => router.push(`/product/${item.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/product/${item.id}`); } }}
                aria-label={`${L.viewProductPrefix} ${item.name}`}
              >
                {/* Image */}
                <div className="relative flex-shrink-0 overflow-hidden w-[110px] h-[140px]">
                  <ImageWithFallback src={item.img} alt={item.name} fill sizes="110px" className="object-cover" />
                  <div
                    className="absolute top-2 left-2 px-2 py-0.5 text-[10px] tracking-wider uppercase border font-bold"
                    style={{ backgroundColor: cfg.bg, borderColor: cfg.border, color: cfg.text }}
                  >
                    {cfg.label}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 px-5 py-4 flex flex-col justify-between min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 tracking-widest uppercase mb-0.5">{item.brand}</p>
                      <p className="text-sm truncate pr-2 font-bold">{item.name}</p>
                      <div className="flex gap-4 mt-1">
                        <span className="text-xs text-gray-500">{L.sizeLabel} <span className="font-semibold text-black">{item.size}</span></span>
                        <span className="text-xs text-gray-500">{L.colourLabel} <span className="font-semibold text-black">{item.color}</span></span>
                      </div>
                      <p className="text-xs text-gray-300 mt-1">{addedPfx} {item.addedDate}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleNotify(item.id); }}
                        aria-label={item.notify ? `${L.notifyDisableAria} ${item.name}` : `${L.notifyEnableAria} ${item.name}`}
                        aria-pressed={item.notify}
                        className={`w-8 h-8 flex items-center justify-center focus-visible:outline-none transition-colors ${
                          item.notify ? 'bg-black' : 'bg-gray-100'
                        }`}
                      >
                        <Bell size={13} color={item.notify ? '#fff' : '#9ca3af'} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }}
                        aria-label={`${L.removeAriaPrefix} ${item.name} ${L.removeAriaSuffix}`}
                        className="w-8 h-8 flex items-center justify-center focus-visible:outline-none bg-gray-100 hover:bg-[#fef2f2] transition-colors"
                      >
                        <Trash2 size={13} color={SALE_COLOR} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <p className="text-sm font-bold">{fmt(item.price)}</p>
                    <button
                      onMouseEnter={() => setHoveredAdd(item.id)}
                      onMouseLeave={() => setHoveredAdd(null)}
                      onClick={(e) => { e.stopPropagation(); canAdd && handleAdd(item); }}
                      disabled={!canAdd}
                      className={`px-5 py-2 text-xs tracking-[0.15em] uppercase text-white flex items-center gap-1.5 focus-visible:outline-none rounded-none font-bold transition-colors duration-200 ${
                        !canAdd
                          ? 'bg-gray-300 cursor-not-allowed'
                          : isAdded
                            ? 'bg-[var(--sale)] cursor-pointer'
                            : hoveredAdd === item.id
                              ? 'bg-[var(--accent)] cursor-pointer'
                              : 'bg-black cursor-pointer'
                      }`}
                    >
                      {isAdded ? <><Check size={11} /> {L.ctaAdded}</> : !canAdd ? ctaUnavail : <><ShoppingBag size={11} /> {ctaAddCart}</>}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* How it works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white mt-10">
        {howSteps.map(s => (
          <div key={s.step} className="bg-white px-5 py-6">
            <p className="text-xs tracking-widest mb-2 font-extrabold text-[var(--accent)]">{s.step}</p>
            <p className="text-sm mb-1.5 font-bold">{s.title}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
