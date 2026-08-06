'use client'
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, User, Heart, ShoppingBag, Menu } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import logoImage from '../../../assets/kekimoro-logo-black.png';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import { HeaderSearch } from './HeaderSearch';
import { HeaderMegaMenu } from './HeaderMegaMenu';
import { HeaderMobileDrawer } from './HeaderMobileDrawer';
import { HeaderTopBar } from './HeaderTopBar';

const MiniCart       = dynamic(() => import('../cart/MiniCart').then(m => ({ default: m.MiniCart })));
const LoginModal     = dynamic(() => import('../auth/LoginModal').then(m => ({ default: m.LoginModal })));
const RegisterModal  = dynamic(() => import('../auth/RegisterModal').then(m => ({ default: m.RegisterModal })));
const QuickViewModal = dynamic(() => import('../product/QuickViewModal').then(m => ({ default: m.QuickViewModal })));

import { type Gender, type SubCat } from '../../data/categories';
import { useHeaderMenu } from '../../../lib/oneentry/menus/HeaderMenuContext';
import { adaptHeaderMenuToMega } from '../../../lib/oneentry/menus/adapt-header';
import { HEADER_ARIA } from '../../data/commonLabels';
import {
  LOGO_ALT,
  SEARCH_PLACEHOLDER,
  ACCOUNT_HREF, WISHLIST_HREF,
  GENDER_NAV_HREFS,
  WOMEN_COLOR,
  MEN_COLOR,
} from '../../data/headerConfig';
import { useInterfaceControlsT } from '../../../lib/oneentry/labels/InterfaceControlsLabelsContext';
import { useHeaderT } from '../../../lib/oneentry/labels/HeaderLabelsContext';
import { useMounted } from '../../hooks/useMounted';

export function Header() {
  const lSearch = useInterfaceControlsT('search', SEARCH_PLACEHOLDER);
  // Header copy from the OE `header` set — local constants are the fallback.
  const lLogoAlt      = useHeaderT('header_logo_alt', LOGO_ALT);
  const lSearchMobile = useHeaderT('header_search_placeholder_mobile', 'Search...');
  const aOpenMenu     = useHeaderT('header_aria_open_menu', 'Open menu');
  const aToggleSearch = useHeaderT('header_aria_toggle_search', 'Toggle search');
  const aSearchDesk   = useHeaderT('header_aria_search_desktop', 'Search products');
  const aSearchMob    = useHeaderT('header_aria_search_mobile', 'Search products');
  const aAccount      = useHeaderT('header_aria_account', 'My account');
  const aWishlist     = useHeaderT('header_aria_wishlist', 'Wishlist');
  const aBag          = useHeaderT('header_aria_bag', 'Shopping bag');
  const [activeGender, setActiveGender] = useState<Gender>('women');
  const [activeDropdown, setActiveDropdown] = useState<SubCat>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGender, setMobileGender] = useState<Gender>('women');
  const [mobileExpandedCat, setMobileExpandedCat] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const mounted = useMounted();
  const dropdownRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // On category pages the gender is in the path (`/women/...`, `/men/...`).
  // On flat pages (`/new`, `/sale`) it comes from the `?gender=` query so the
  // shopper's context sticks across those unrouted screens.
  const urlGender: Gender = (() => {
    if (pathname.startsWith('/men')) return 'men';
    if (pathname.startsWith('/women')) return 'women';
    const q = searchParams?.get('gender');
    if (q === 'men') return 'men';
    return 'women';
  })();
  const urlSubCat: string | null = (() => {
    if (pathname.includes('/clothing')) return 'clothing';
    if (pathname.includes('/shoes')) return 'shoes';
    if (pathname.includes('/bags')) return 'bags';
    if (pathname.includes('/accessories')) return 'accessories';
    if (pathname === '/sale' || pathname.startsWith('/sale/')) return 'sale';
    if (pathname === '/new' || pathname.startsWith('/new-arrivals')) return 'new';
    return null;
  })();


  useEffect(() => {
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, []);

  // Navigating to a gendered route resets both switches. React's sanctioned
  // "adjust state when a prop changes" pattern — a `setState` during render
  // is re-run immediately without committing the stale tree, whereas doing it
  // in an effect paints the old gender for one frame first (and is the
  // cascading-render pattern the lint rule rejects).
  const [prevUrlGender, setPrevUrlGender] = useState<Gender>('women');
  if (urlGender !== prevUrlGender) {
    setPrevUrlGender(urlGender);
    setActiveGender(urlGender);
    setMobileGender(urlGender);
  }

  const { totalItems, openMiniCart } = useCart();
  const { isLoggedIn, openLoginModal } = useAuth();
  const { count: wishlistCount } = useWishlist();

  const accentColor = activeGender === 'women' ? WOMEN_COLOR : MEN_COLOR;

  const handleSubCatEnter = useCallback((cat: string) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const key = cat.toLowerCase();
    if (['shoes', 'clothing', 'bags', 'accessories'].includes(key)) {
      setActiveDropdown(key as SubCat);
    } else {
      setActiveDropdown(null);
    }
  }, []);

  const handleSubCatLeave = useCallback(() => {
    hideTimer.current = setTimeout(() => setActiveDropdown(null), 150);
  }, []);

  const handleDropdownEnter = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const handleDropdownLeave = useCallback(() => {
    hideTimer.current = setTimeout(() => setActiveDropdown(null), 150);
  }, []);

  // Mega menu is sourced exclusively from the OE `header` menu — no static
  // fallback. When OE returns nothing the dropdown simply doesn't render.
  const cmsHeaderMenu = useHeaderMenu();
  const mega = adaptHeaderMenuToMega(cmsHeaderMenu);
  const currentDropdownData = activeDropdown && mega ? mega[activeGender][activeDropdown] : null;

  const getNavHref = useCallback(
    (gender: Gender, subcat: string, item?: string): string => {
      let base: string;
      switch (subcat) {
        case 'clothing': base = gender === 'women' ? '/women/clothing' : '/men/clothing'; break;
        case 'bags': base = gender === 'men' ? '/men/bags' : '/women/bags'; break;
        case 'shoes': base = gender === 'women' ? '/women/shoes' : '/men/shoes'; break;
        case 'accessories': base = gender === 'women' ? '/women/accessories' : '/men/accessories'; break;
        default: return '#';
      }
      // Menu items carry the OE `pageUrl` of the underlying category — the
      // catalog page then filters `p.categories[]` down to that exact leaf,
      // so clicking "Dresses & Skirts" actually shows dresses & skirts.
      if (item) return `${base}?category=${encodeURIComponent(item)}`;
      return base;
    },
    []
  );

  return (
    <header
      className="sticky top-0 z-50 bg-white"
      style={{
        '--women': WOMEN_COLOR,
        '--men': MEN_COLOR,
        '--accent': accentColor,
      } as React.CSSProperties}
    >
      <HeaderTopBar />

      {/* ── MAIN HEADER ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-384 mx-auto px-8 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden flex items-center justify-center w-10 h-10 hover:opacity-70 transition-opacity"
                aria-label={aOpenMenu}
              >
                <Menu size={22} />
              </button>
              <Link href="/" className="shrink-0">
                <Image src={logoImage} alt={lLogoAlt} width={146} height={32} className="object-contain" priority />
              </Link>
            </div>

            <nav aria-label={HEADER_ARIA.mainNavigation} className="hidden lg:flex items-center justify-center flex-1 mx-8">
              <div className="flex items-center gap-6">
                {(['women', 'men'] as Gender[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => {
                      setActiveGender(g);
                      // Stay on /new or /sale when the shopper swaps
                      // gender — just re-scope the current page instead of
                      // yanking them into `/women/clothing`.
                      if (pathname === '/new' || pathname === '/sale') {
                        router.push(`${pathname}?gender=${g}`);
                      } else {
                        router.push(GENDER_NAV_HREFS[g]);
                      }
                    }}
                    className={`relative flex items-center h-10 text-sm tracking-widest uppercase font-medium transition-all duration-150 ease-in-out ${
                      urlGender === g ? (g === 'women' ? 'text-(--women)' : 'text-(--men)') : 'text-black'
                    }`}
                  >
                    {g.toUpperCase()}
                    {urlGender === g && (
                      <span
                        className={`absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-150 ${
                          urlGender === 'women' ? 'bg-(--women)' : 'bg-(--men)'
                        }`}
                      />
                    )}
                  </button>
                ))}
              </div>
            </nav>

            <div className="flex items-center">
              <div className="hidden lg:flex relative w-64">
                <HeaderSearch
                  placeholder={lSearch}
                  ariaLabel={aSearchDesk}
                  variant="desktop"
                />
              </div>
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="md:hidden flex items-center justify-center w-10 h-10 hover:opacity-70 transition-opacity"
                aria-label={aToggleSearch}
              >
                <Search size={20} />
              </button>
              <button
                className="hidden md:flex items-center justify-center min-w-10 min-h-10 hover:opacity-70 transition-opacity"
                onClick={() => isLoggedIn ? router.push(ACCOUNT_HREF) : openLoginModal()}
                aria-label={aAccount}
              >
                <User size={20} />
              </button>
              <button
                className="relative flex items-center justify-center min-w-10 min-h-10 hover:opacity-70 transition-opacity"
                onClick={() => router.push(WISHLIST_HREF)}
                aria-label={aWishlist}
              >
                <Heart size={20} />
                {mounted && wishlistCount > 0 && (
                  <span
                    data-testid="header-wishlist-count"
                    className="absolute -top-1 -right-1 text-white w-4 h-4 flex items-center justify-center text-[10px] bg-(--women)"
                  >
                    {wishlistCount}
                  </span>
                )}
              </button>
              <button
                className="relative flex items-center justify-center min-w-10 min-h-10 hover:opacity-70 transition-opacity"
                onClick={openMiniCart}
                aria-label={aBag}
              >
                <ShoppingBag size={20} />
                {mounted && totalItems > 0 && (
                  <span
                    // No class here contains "badge", so the specs'
                    // `[class*="badge"]` locator never matched the counter.
                    data-testid="header-cart-count"
                    className="absolute -top-1 -right-1 text-white w-4 h-4 flex items-center justify-center text-[10px] bg-accent"
                  >
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>

          {searchOpen && (
            <div className="md:hidden pb-4">
              <HeaderSearch
                placeholder={lSearchMobile}
                ariaLabel={aSearchMob}
                autoFocus
                variant="mobile"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── SUBCATEGORY NAV + MEGA DROPDOWN ── */}
      <HeaderMegaMenu
        activeGender={activeGender}
        accentColor={accentColor}
        urlSubCat={urlSubCat}
        activeDropdown={activeDropdown}
        currentDropdownData={currentDropdownData}
        dropdownRef={dropdownRef}
        onSubCatEnter={handleSubCatEnter}
        onSubCatLeave={handleSubCatLeave}
        onDropdownEnter={handleDropdownEnter}
        onDropdownLeave={handleDropdownLeave}
        onCloseDropdown={() => setActiveDropdown(null)}
        getNavHref={getNavHref}
      />

      {/* ── MOBILE DRAWER ── */}
      <HeaderMobileDrawer
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        mobileGender={mobileGender}
        onMobileGenderChange={setMobileGender}
        mobileExpandedCat={mobileExpandedCat}
        setMobileExpandedCat={setMobileExpandedCat}
        accentColor={accentColor}
        urlSubCat={urlSubCat}
        getNavHref={getNavHref}
      />

      <MiniCart />
      <LoginModal />
      <RegisterModal />
      <QuickViewModal />
    </header>
  );
}
