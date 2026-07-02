'use client'
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type RefObject } from 'react';
import { SUB_CATEGORIES, type Gender, type SubCat, type MegaSection } from '../data/categories';
import { SALE_YELLOW } from '../constants/colors';

interface HeaderMegaMenuProps {
  activeGender: Gender;
  accentColor: string;
  urlSubCat: string | null;
  activeDropdown: SubCat;
  currentDropdownData: MegaSection[] | null;
  dropdownRef: RefObject<HTMLDivElement>;
  onSubCatEnter: (cat: string) => void;
  onSubCatLeave: () => void;
  onDropdownEnter: () => void;
  onDropdownLeave: () => void;
  onCloseDropdown: () => void;
  getNavHref: (gender: Gender, subcat: string, item?: string) => string;
}

export function HeaderMegaMenu({
  activeGender,
  accentColor,
  urlSubCat,
  activeDropdown,
  currentDropdownData,
  dropdownRef,
  onSubCatEnter,
  onSubCatLeave,
  onDropdownEnter,
  onDropdownLeave,
  onCloseDropdown,
  getNavHref,
}: HeaderMegaMenuProps) {
  const router = useRouter();

  return (
    <div
      className="hidden lg:block text-white transition-colors duration-150 ease-in-out relative bg-[var(--accent)]"
      style={{ '--accent': accentColor, '--sale-yellow': SALE_YELLOW } as React.CSSProperties}
      onMouseLeave={onSubCatLeave}
    >
      <div className="max-w-screen-2xl mx-auto px-8 lg:px-12">
        <div className="flex items-center justify-center">
          {SUB_CATEGORIES.map((cat) => {
            const key = cat.toLowerCase();
            const hasDropdown = ['shoes', 'clothing', 'bags', 'accessories'].includes(key);
            // Carry the currently active gender onto the flat /new and /sale
            // pages so their product list is scoped to that gender (matches the
            // menu context the shopper is in).
            const genderQs = `?gender=${activeGender}`;
            const catalogHref = hasDropdown
              ? getNavHref(activeGender, key)
              : key === 'new' ? `/new${genderQs}` : null;
            const isSale = key === 'sale';
            const isActive = activeDropdown === key || urlSubCat === key;
            return (
              <button
                key={cat}
                aria-current={urlSubCat === key ? 'page' : undefined}
                onMouseEnter={() => onSubCatEnter(cat)}
                onClick={() => {
                  if (catalogHref) router.push(catalogHref);
                  else if (isSale) router.push(`/sale${genderQs}`);
                }}
                className={`relative px-5 py-3 text-xs tracking-widest uppercase transition-all duration-100 ${
                  isSale
                    ? 'text-[var(--sale-yellow)] font-extrabold tracking-[0.22em] bg-[#da1e1e]/35 cursor-pointer'
                    : `text-white ${urlSubCat === key ? 'font-bold' : 'font-medium'} ${
                        isActive ? 'bg-black/15' : 'bg-transparent'
                      } ${catalogHref ? 'cursor-pointer' : 'cursor-default'}`
                }`}
              >
                {isSale ? (
                  <span className="flex items-center gap-1">
                    {cat}
                    <span className="inline-block w-[5px] h-[5px] rounded-full align-middle bg-[var(--sale-yellow)] animate-pulse" />
                  </span>
                ) : (
                  <>
                    {cat}
                    {hasDropdown && (
                      <span className="ml-1 inline-block">
                        <ChevronDown size={11} className="inline-block" />
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mega Dropdown */}
      {currentDropdownData && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 bg-white text-black shadow-xl z-50 border-t-2 border-[var(--accent)]"
          onMouseEnter={onDropdownEnter}
          onMouseLeave={onDropdownLeave}
        >
          <div className="max-w-screen-2xl mx-auto px-8 py-8">
            <div className="flex gap-16">
              {currentDropdownData.map((section, idx) => (
                <div key={`${section.title}-${idx}`} className="flex-1 min-w-[160px]">
                  <h4 className="text-xs tracking-widest uppercase mb-4 pb-2 border-b border-gray-200 text-[var(--accent)]">
                    {section.title}
                  </h4>
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li key={`${item.pageUrl || item.label}`}>
                        <Link
                          href={activeDropdown ? getNavHref(activeGender, activeDropdown, item.pageUrl || item.label) : '/'}
                          onClick={onCloseDropdown}
                          className="text-sm text-gray-700 hover:text-black hover:underline transition-colors block"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
