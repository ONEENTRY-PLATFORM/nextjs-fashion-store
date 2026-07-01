'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import type { Product } from './ProductCard';
import { searchProductsAction } from '../../lib/oneentry/catalog/search-action';
import { trackActivity } from '../utils/track-activity';

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
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const text = query.trim();
    if (text.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const seq = ++requestSeqRef.current;
      const found = await searchProductsAction(text);
      // Ignore out-of-order responses
      if (seq !== requestSeqRef.current) return;
      setResults(found);
      setLoading(false);
      trackActivity({ type: 'search', query: text, meta: { resultsCount: found.length } });
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
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

  const handleSelect = useCallback((id: string) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    router.push(`/product/${id}`);
  }, [router]);

  const inputClass = variant === 'desktop'
    ? 'w-full border border-gray-300 px-4 py-2 text-sm outline-none focus:border-black transition-colors rounded-none'
    : 'w-full border border-gray-300 px-4 py-2 text-sm outline-none rounded-none';

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={inputClass}
          aria-label={ariaLabel}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
          <Search size={variant === 'desktop' ? 20 : 16} />
        </span>
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-200 shadow-lg max-h-[70vh] overflow-y-auto">
          {loading ? (
            <p className="px-4 py-3 text-xs text-gray-400 tracking-wide uppercase">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-400 tracking-wide uppercase">No results</p>
          ) : (
            <ul role="listbox">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => handleSelect(p.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors focus-visible:outline-none focus:bg-gray-50"
                  >
                    <div className="relative flex-shrink-0 w-12 h-14 bg-gray-100">
                      {p.image && (
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                          unoptimized
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate font-medium">{p.name}</p>
                      {p.brand && (
                        <p className="text-xs text-gray-500 truncate">{p.brand}</p>
                      )}
                    </div>
                    <p className="text-sm flex-shrink-0 font-semibold">{p.price}</p>
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
