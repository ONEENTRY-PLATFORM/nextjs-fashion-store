'use client';
import { Search } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Product } from '@/app/components/product/ProductCard';
import { HEADER_SEARCH_LABELS as HS } from '@/app/data/commonLabels';
import { trackActivity } from '@/app/utils/track-activity';
import { useRouter } from '@/lib/i18n/navigation';
import { searchProductsAction } from '@/lib/oneentry/catalog/search-action';
import { useT } from '@/lib/oneentry/labels/DictContext';

/**
 * Shortest query worth sending to OE — one or two characters match almost
 *  the whole catalogue and the dropdown becomes noise.
 */
const MIN_QUERY_LENGTH = 2;

/** Idle time before a query is sent, in ms. */
const SEARCH_DEBOUNCE_MS = 350;

/**
 * Debounced vector-search input. Wraps the existing Header input + dropdown.
 * Variants are pre-collapsed by the server action so the dropdown shows one
 * card per product.
 */
export function HeaderSearch({
  placeholder,
  ariaLabel,
  autoFocus = false,
  variant = 'desktop',
}: {
  placeholder: string;
  ariaLabel: string;
  autoFocus?: boolean;
  variant?: 'desktop' | 'mobile';
}) {
  const router = useRouter();
  const lSearching = useT('interface_controls_searching', HS.searching);
  const lNoResults = useT('interface_controls_no_results', HS.noResults);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  // Results are stored together with the query that produced them. Deriving
  // `results` / `loading` from that pair means a new keystroke invalidates
  // the old hits during render — no effect has to reset them, which is the
  // cascading-render pattern React flags (MCP `common-mistakes`).
  const [hits, setHits] = useState<{ query: string; items: Product[] }>({ query: '', items: [] });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const requestSeqRef = useRef(0);

  const text = query.trim();
  const searchable = text.length >= MIN_QUERY_LENGTH;
  const results = searchable && hits.query === text ? hits.items : [];
  const loading = searchable && hits.query !== text;

  useEffect(() => {
    const term = query.trim();
    if (term.length < MIN_QUERY_LENGTH) return;
    const timer = setTimeout(async () => {
      const seq = ++requestSeqRef.current;
      const found = await searchProductsAction(term);
      // Ignore out-of-order responses
      if (seq !== requestSeqRef.current) return;
      setHits({ query: term, items: found });
      trackActivity({ type: 'search', query: term, meta: { resultsCount: found.length } });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', onDocClick);
      return () => document.removeEventListener('mousedown', onDocClick);
    }
  }, [open]);

  const handleSelect = useCallback(
    (id: string) => {
      setOpen(false);
      // Clearing the query is enough — `results` is derived from it, so the
      // stale hits drop out on the same render.
      setQuery('');
      router.push(`/product/${id}`);
    },
    [router],
  );

  const inputClass =
    variant === 'desktop'
      ? 'w-full border border-gray-300 px-4 py-2 text-sm outline-none focus:border-black transition-colors rounded-none'
      : 'w-full border border-gray-300 px-4 py-2 text-sm outline-none rounded-none';

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={inputClass}
          aria-label={ariaLabel}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-500">
          <Search size={variant === 'desktop' ? 20 : 16} />
        </span>
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 max-h-[70vh] overflow-y-auto border border-gray-200 bg-white shadow-lg">
          {loading ? (
            <p className="px-4 py-3 text-xs tracking-wide text-gray-400 uppercase">{lSearching}</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-xs tracking-wide text-gray-400 uppercase">{lNoResults}</p>
          ) : (
            <ul role="listbox">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => handleSelect(p.id)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-gray-50 focus:bg-gray-50 focus-visible:outline-none"
                  >
                    <div className="relative h-14 w-12 shrink-0 bg-gray-100">
                      {p.image && (
                        <Image src={p.image} alt={p.name} fill sizes="48px" className="object-cover" unoptimized />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      {p.brand && <p className="truncate text-xs text-gray-500">{p.brand}</p>}
                    </div>
                    <p className="shrink-0 text-sm font-semibold">{p.price}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
