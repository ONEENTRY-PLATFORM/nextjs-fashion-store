'use client';
import { ChevronDown } from 'lucide-react';
import { type RefObject } from 'react';

import { SALE_YELLOW } from '@/app/constants/colors';
import { type Gender, type MegaSection, SUB_CATEGORIES, type SubCat } from '@/app/data/categories';
import { Link, useRouter } from '@/lib/i18n/navigation';

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
      className="relative hidden bg-accent text-white transition-colors duration-150 ease-in-out lg:block"
      style={{ '--accent': accentColor, '--sale-yellow': SALE_YELLOW } as React.CSSProperties}
      onMouseLeave={onSubCatLeave}
    >
      <div className="mx-auto max-w-384 px-8 lg:px-12">
        <div className="flex items-center justify-center">
          {SUB_CATEGORIES.map((cat) => {
            const key = cat.toLowerCase();
            const hasDropdown = ['shoes', 'clothing', 'bags', 'accessories'].includes(key);
            // Carry the currently active gender onto the flat /new and /sale
            // pages so their product list is scoped to that gender (matches the
            // menu context the shopper is in).
            const genderQs = `?gender=${activeGender}`;
            const catalogHref = hasDropdown ? getNavHref(activeGender, key) : key === 'new' ? `/new${genderQs}` : null;
            const isSale = key === 'sale';
            const isActive = activeDropdown === key || urlSubCat === key;
            // A tab that navigates must take the dropdown down with it: the
            // pointer stays parked on the button after the click, so no
            // `mouseleave` ever fires and the panel would hang over the page
            // the shopper just landed on. Tabs with nowhere to go keep it open.
            const navHref = catalogHref ?? (isSale ? `/sale${genderQs}` : null);
            return (
              <button
                key={cat}
                data-testid={`mega-nav-${key}`}
                aria-current={urlSubCat === key ? 'page' : undefined}
                onMouseEnter={() => onSubCatEnter(cat)}
                onClick={() => {
                  if (!navHref) return;
                  onCloseDropdown();
                  router.push(navHref);
                }}
                className={`relative px-5 py-3 text-xs tracking-widest uppercase transition-all duration-100 ${
                  isSale
                    ? 'cursor-pointer bg-[#da1e1e]/35 font-extrabold tracking-[0.22em] text-(--sale-yellow)'
                    : `text-white ${urlSubCat === key ? 'font-bold' : 'font-medium'} ${
                        isActive ? 'bg-black/15' : 'bg-transparent'
                      } ${catalogHref ? 'cursor-pointer' : 'cursor-default'}`
                }`}
              >
                {isSale ? (
                  <span className="flex items-center gap-1">
                    {cat}
                    <span className="inline-block size-[5px] animate-pulse rounded-full bg-(--sale-yellow) align-middle" />
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
          data-testid="mega-dropdown"
          className="absolute inset-x-0 top-full z-50 border-t-2 border-accent bg-white text-black shadow-xl"
          onMouseEnter={onDropdownEnter}
          onMouseLeave={onDropdownLeave}
        >
          <div className="mx-auto max-w-384 p-8">
            <div className="flex gap-16">
              {currentDropdownData.map((section, idx) => (
                <div key={`${section.title}-${idx}`} className="min-w-40 flex-1">
                  <h4 className="mb-4 border-b border-gray-200 pb-2 text-xs tracking-widest text-accent uppercase">
                    {section.title}
                  </h4>
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li key={`${item.pageUrl || item.label}`}>
                        <Link
                          href={
                            activeDropdown ? getNavHref(activeGender, activeDropdown, item.pageUrl || item.label) : '/'
                          }
                          onClick={onCloseDropdown}
                          className="block text-sm text-gray-700 transition-colors hover:text-black hover:underline"
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
