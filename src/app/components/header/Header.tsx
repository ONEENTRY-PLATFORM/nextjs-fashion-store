'use client';
import { Heart, Menu, Search, ShoppingBag, User } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/app/context/AuthContext';
import { useCart } from '@/app/context/CartContext';
import { useWishlist } from '@/app/context/WishlistContext';
import logoImage from '@/assets/kekimoro-logo-black.png';

import { HeaderMegaMenu } from './HeaderMegaMenu';
import { HeaderMobileDrawer } from './HeaderMobileDrawer';
import { HeaderSearch } from './HeaderSearch';
import { HeaderTopBar } from './HeaderTopBar';

const MiniCart = dynamic(() => import('@/app/components/cart/MiniCart').then((m) => ({ default: m.MiniCart })));
const LoginModal = dynamic(() => import('@/app/components/auth/LoginModal').then((m) => ({ default: m.LoginModal })));
const RegisterModal = dynamic(() =>
  import('@/app/components/auth/RegisterModal').then((m) => ({ default: m.RegisterModal })),
);
const ResetPasswordModal = dynamic(() =>
  import('@/app/components/auth/ResetPasswordModal').then((m) => ({ default: m.ResetPasswordModal })),
);
const QuickViewModal = dynamic(() =>
  import('@/app/components/product/QuickViewModal').then((m) => ({ default: m.QuickViewModal })),
);

import { type Gender, type SubCat } from '@/app/data/categories';
import {
  ACCOUNT_HREF,
  GENDER_NAV_HREFS,
  LOGO_ALT,
  MEN_COLOR,
  SEARCH_PLACEHOLDER,
  WISHLIST_HREF,
  WOMEN_COLOR,
} from '@/app/data/headerConfig';
import { useMounted } from '@/app/hooks/useMounted';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { useT } from '@/lib/oneentry/labels/DictContext';
import { adaptHeaderMenuToMega } from '@/lib/oneentry/menus/adapt-header';
import { useHeaderMenu } from '@/lib/oneentry/menus/HeaderMenuContext';

export const HEADER_ARIA = {
  mainNavigation: 'Main navigation',
} as const;

/** Reads `?gender=` and hands it to the header, rendering nothing itself. */
function GenderQuerySync({ onChange }: { onChange: (gender: Gender | null) => void }) {
  const searchParams = useSearchParams();
  const queryGender = searchParams?.get('gender');
  useEffect(() => {
    onChange(queryGender === 'men' ? 'men' : queryGender === 'women' ? 'women' : null);
  }, [queryGender, onChange]);
  return null;
}

export function Header() {
  const lSearch = useT('search', SEARCH_PLACEHOLDER);
  // Header copy from the OE `header` set — local constants are the fallback.
  const lLogoAlt = useT('header_logo_alt', LOGO_ALT);
  const lSearchMobile = useT('header_search_placeholder_mobile', 'Search...');
  const aOpenMenu = useT('header_aria_open_menu', 'Open menu');
  const aMainNav = useT('header_aria_main_navigation', HEADER_ARIA.mainNavigation);
  const aToggleSearch = useT('header_aria_toggle_search', 'Toggle search');
  const aSearchDesk = useT('header_aria_search_desktop', 'Search products');
  const aSearchMob = useT('header_aria_search_mobile', 'Search products');
  const aAccount = useT('header_aria_account', 'My account');
  const aWishlist = useT('header_aria_wishlist', 'Wishlist');
  const aBag = useT('header_aria_bag', 'Shopping bag');
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
  // Filled in by `<GenderQuerySync>` below — see the note on that component for why the query is not read here directly.
  const [queryGender, setQueryGender] = useState<Gender | null>(null);

  // On category pages the gender is in the path (`/women/...`, `/men/...`).
  const urlGender: Gender = (() => {
    if (pathname.startsWith('/men')) return 'men';
    if (pathname.startsWith('/women')) return 'women';
    return queryGender ?? 'women';
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
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  // Navigating to a gendered route resets both switches.
  const [prevUrlGender, setPrevUrlGender] = useState<Gender>('women');
  if (urlGender !== prevUrlGender) {
    setPrevUrlGender(urlGender);
    setActiveGender(urlGender);
    setMobileGender(urlGender);
  }

  // Any completed navigation takes every open menu down with it.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setActiveDropdown(null);
    setMobileOpen(false);
    setMobileExpandedCat(null);
    setSearchOpen(false);
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

  // Mega menu is sourced exclusively from the OE `header` menu — no static fallback.
  const cmsHeaderMenu = useHeaderMenu();
  const mega = adaptHeaderMenuToMega(cmsHeaderMenu);
  const currentDropdownData = activeDropdown && mega ? mega[activeGender][activeDropdown] : null;

  const getNavHref = useCallback((gender: Gender, subcat: string, item?: string): string => {
    let base: string;
    switch (subcat) {
      case 'clothing':
        base = gender === 'women' ? '/women/clothing' : '/men/clothing';
        break;
      case 'bags':
        base = gender === 'men' ? '/men/bags' : '/women/bags';
        break;
      case 'shoes':
        base = gender === 'women' ? '/women/shoes' : '/men/shoes';
        break;
      case 'accessories':
        base = gender === 'women' ? '/women/accessories' : '/men/accessories';
        break;
      default:
        return '#';
    }
    // Menu items carry the OE `pageUrl` of the underlying category.
    if (item) return `${base}?category=${encodeURIComponent(item)}`;
    return base;
  }, []);

  return (
    <>
      {/* Outside `<header>`, not inside it: a boundary that bailed to
          client-side rendering is re-rendered on the client, and with it
          nested in the header React briefly held a second, freshly built
          `<header>` in the DOM before dropping the server one. Rendering
          `null` either way, the boundary costs nothing where it sits now. */}
      <Suspense fallback={null}>
        <GenderQuerySync onChange={setQueryGender} />
      </Suspense>

      <header
        data-testid="site-header"
        className="sticky top-0 z-50 bg-white"
        style={
          {
            '--women': WOMEN_COLOR,
            '--men': MEN_COLOR,
            '--accent': accentColor,
          } as React.CSSProperties
        }
      >
        <HeaderTopBar />

        {/* ── MAIN HEADER ── */}
        <div className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-384 px-8 lg:px-12">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileOpen(true)}
                  className="flex size-10 items-center justify-center transition-opacity hover:opacity-70 lg:hidden"
                  aria-label={aOpenMenu}
                >
                  <Menu size={22} />
                </button>
                <Link href="/" className="shrink-0" data-testid="header-logo">
                  <Image src={logoImage} alt={lLogoAlt} width={146} height={32} className="object-contain" priority />
                </Link>
              </div>

              <nav aria-label={aMainNav} className="mx-8 hidden flex-1 items-center justify-center lg:flex">
                <div className="flex items-center gap-6">
                  {(['women', 'men'] as Gender[]).map((g) => (
                    <button
                      key={g}
                      data-testid={`gender-tab-${g}`}
                      onClick={() => {
                        setActiveGender(g);
                        // Stay on /new or /sale when the shopper swaps gender — just re-scope the current page instead of yanking them into `/women/clothing`.
                        if (pathname === '/new' || pathname === '/sale') {
                          router.push(`${pathname}?gender=${g}`);
                        } else {
                          router.push(GENDER_NAV_HREFS[g]);
                        }
                      }}
                      className={`relative flex h-10 items-center text-sm font-medium tracking-widest uppercase transition-all duration-150 ease-in-out ${
                        urlGender === g ? (g === 'women' ? 'text-(--women)' : 'text-(--men)') : 'text-black'
                      }`}
                    >
                      {g.toUpperCase()}
                      {urlGender === g && (
                        <span
                          className={`absolute inset-x-0 bottom-0 h-0.5 transition-all duration-150 ${
                            urlGender === 'women' ? 'bg-(--women)' : 'bg-(--men)'
                          }`}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </nav>

              <div className="flex items-center">
                <div className="relative hidden w-64 lg:flex">
                  <HeaderSearch placeholder={lSearch} ariaLabel={aSearchDesk} variant="desktop" />
                </div>
                <button
                  onClick={() => setSearchOpen(!searchOpen)}
                  className="flex size-10 items-center justify-center transition-opacity hover:opacity-70 md:hidden"
                  aria-label={aToggleSearch}
                >
                  <Search size={20} />
                </button>
                <button
                  className="hidden min-h-10 min-w-10 items-center justify-center transition-opacity hover:opacity-70 md:flex"
                  onClick={() => (isLoggedIn ? router.push(ACCOUNT_HREF) : openLoginModal())}
                  aria-label={aAccount}
                  data-testid="header-account"
                >
                  <User size={20} />
                </button>
                <button
                  className="relative flex min-h-10 min-w-10 items-center justify-center transition-opacity hover:opacity-70"
                  onClick={() => router.push(WISHLIST_HREF)}
                  aria-label={aWishlist}
                >
                  <Heart size={20} />
                  {mounted && wishlistCount > 0 && (
                    <span
                      data-testid="header-wishlist-count"
                      className="absolute -top-1 -right-1 flex size-4 items-center justify-center bg-(--women) text-[10px] text-white"
                    >
                      {wishlistCount}
                    </span>
                  )}
                </button>
                <button
                  className="relative flex min-h-10 min-w-10 items-center justify-center transition-opacity hover:opacity-70"
                  onClick={openMiniCart}
                  aria-label={aBag}
                >
                  <ShoppingBag size={20} />
                  {mounted && totalItems > 0 && (
                    <span
                      // No class here contains "badge", so the specs' `[class*="badge"]` locator never matched the counter.
                      data-testid="header-cart-count"
                      className="absolute -top-1 -right-1 flex size-4 items-center justify-center bg-accent text-[10px] text-white"
                    >
                      {totalItems}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {searchOpen && (
              <div className="pb-4 md:hidden">
                <HeaderSearch placeholder={lSearchMobile} ariaLabel={aSearchMob} autoFocus variant="mobile" />
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
        <ResetPasswordModal />
        <QuickViewModal />
      </header>
    </>
  );
}
