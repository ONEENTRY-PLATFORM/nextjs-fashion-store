'use client'
import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { fetchUserData } from '../store/userSlice';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import {
  User, ShoppingBag, Star, Wrench, Clock, Heart, Bell, MessageSquare,
  Mail, ChevronRight, LogOut, ChevronDown,
} from 'lucide-react';

import { MyDataSection }              from './account/MyDataSection';
import { MyOrdersSection }            from './account/MyOrdersSection';
import { BonusesSection }             from './account/BonusesSection';
import { WishlistSection }            from './account/WishlistSection';
import { ServiceMaintenanceSection }  from './account/ServiceMaintenanceSection';
import { HistorySection }             from './account/HistorySection';
import { WaitingListSection }         from './account/WaitingListSection';
import { FeedbackSection }            from './account/FeedbackSection';
import { SubscriptionsSection }       from './account/SubscriptionsSection';
import {
  MyDataSkeleton,
  MyOrdersSkeleton,
  BonusesSkeleton,
  ServiceSkeleton,
  HistorySkeleton,
  WishlistSkeleton,
  WaitingListSkeleton,
  FeedbackSkeleton,
  SubscriptionsSkeleton,
} from './account/shared';
import { ACCOUNT_PAGE_LABELS as APL, ACCOUNT_SECTION_TITLES as AST } from '../data/accountLabels';
import { useT } from '../../lib/oneentry/labels/AccountLabelsContext';

type Section =
  | 'my-data' | 'my-orders' | 'my-bonuses' | 'service'
  | 'history' | 'wishlist' | 'waiting-list'
  | 'feedback' | 'subscriptions';

export function AccountPage() {
  const { user, authReady, logout, openLoginModal } = useAuth();
  const signOut         = useT('user_account',           'sign_out',                  APL.signOut);
  const welcomeBack     = useT('user_account',           'welcome_back',              APL.welcomeBack);
  const signInPrompt    = useT('user_account',           'sign_in_required',          APL.signInPrompt);
  const signInCta       = useT('user_account',           'sign_in_required_cta',      APL.signInCta);
  const titleMyOrders   = useT('my_orders',              'my_orders_title',           AST.myOrders);
  const titleBonuses    = useT('my_bonuses',             'my_bonuses_title',          AST.bonuses);
  const titleService    = useT('service_maintenance',    'service_maintenance_title', AST.service);
  const titleHistory    = useT('purchase_history',       'purchase_history_title',    AST.history);
  const titleWishlist   = useT('user_account_wishlist',  'user_account_wishlist_title', AST.wishlist);
  const titleWaitingLst = useT('waiting_list',           'waiting_list_title',        AST.waitingList);
  const titleFeedback   = useT('user_account_feedback',  'user_account_feedback_title', AST.feedback);

  const NAV_ITEMS: { key: Section; label: string; icon: React.ReactNode }[] = [
    { key: 'my-data',       label: AST.myData,        icon: <User size={16} /> },
    { key: 'my-orders',     label: titleMyOrders,     icon: <ShoppingBag size={16} /> },
    { key: 'my-bonuses',    label: titleBonuses,      icon: <Star size={16} /> },
    { key: 'service',       label: titleService,      icon: <Wrench size={16} /> },
    { key: 'history',       label: titleHistory,      icon: <Clock size={16} /> },
    { key: 'wishlist',      label: titleWishlist,     icon: <Heart size={16} /> },
    { key: 'waiting-list',  label: titleWaitingLst,   icon: <Bell size={16} /> },
    { key: 'feedback',      label: titleFeedback,     icon: <MessageSquare size={16} /> },
    { key: 'subscriptions', label: AST.subscriptions, icon: <Mail size={16} /> },
  ];
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [activeSection, setActiveSection] = useState<Section>('my-data');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sectionLoading, setSectionLoading] = useState(false);

  // Track the URL `?tab=` query so in-page navigations (e.g. clicking
  // "Full History" from an expanded order row) switch sections. Previously
  // an on-mount-only effect meant `router.push('/account?tab=history')`
  // updated the URL bar but the section stayed on `my-orders`.
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab') ?? null;
  useEffect(() => {
    if (tabParam && NAV_ITEMS.some(n => n.key === tabParam)) {
      setActiveSection(tabParam as Section);
    }
    // NAV_ITEMS is derived from labels that recompute on each render — the
    // effect key is the URL param, not the array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);

  const handleSectionChange = (key: Section) => {
    setActiveSection(key);
    setMobileNavOpen(false);
    router.replace(`/account?tab=${key}`, { scroll: false });
  };

  // Fetch user data when logged in
  useEffect(() => {
    if (user) dispatch(fetchUserData());
  }, [user, dispatch]);

  useEffect(() => {
    setSectionLoading(true);
    const t = setTimeout(() => setSectionLoading(false), 600);
    return () => clearTimeout(t);
  }, [activeSection]);

  // Auth bootstrap in progress — render the full account layout with a
  // sidebar-nav shell and a section skeleton so a reload doesn't flash the
  // sign-in prompt for anyone with a valid cookie session.
  if (!authReady) {
    const skeleton = (() => {
      switch (activeSection) {
        case 'my-data':       return <MyDataSkeleton />;
        case 'my-orders':     return <MyOrdersSkeleton />;
        case 'my-bonuses':    return <BonusesSkeleton />;
        case 'service':       return <ServiceSkeleton />;
        case 'history':       return <HistorySkeleton />;
        case 'wishlist':      return <WishlistSkeleton />;
        case 'waiting-list':  return <WaitingListSkeleton />;
        case 'feedback':      return <FeedbackSkeleton />;
        case 'subscriptions': return <SubscriptionsSkeleton />;
        default:              return <MyDataSkeleton />;
      }
    })();
    return (
      <div className="min-h-screen bg-white font-[Inter,sans-serif]">
        <Header />
        <main id="main-content" className="max-w-screen-xl mx-auto px-4 lg:px-8 py-8 pb-20">
          <div className="flex items-center justify-between mb-8 border-b border-[#e5e7eb] pb-5">
            <div>
              <p className="text-xs text-gray-400 tracking-widest uppercase mb-0.5">{welcomeBack}</p>
              <div className="h-7 w-40 bg-gray-100 animate-pulse rounded-none" />
            </div>
          </div>
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="lg:w-60 flex-shrink-0 hidden lg:block">
              <nav className="sticky top-24">
                {NAV_ITEMS.map((item, idx) => (
                  <div
                    key={item.key}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm border-l-[3px] border-l-transparent ${
                      idx < NAV_ITEMS.length - 1 ? 'border-b border-b-[#f0f0f0]' : ''
                    }`}
                  >
                    <span className="text-gray-400">{item.icon}</span>
                    <span className="text-[#555]">{item.label}</span>
                  </div>
                ))}
              </nav>
            </aside>
            <div className="flex-1 min-w-0">{skeleton}</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Auth resolved, no user — show the sign-in prompt.
  if (!user) {
    return (
      <div className="min-h-screen bg-white font-[Inter,sans-serif]">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <User size={56} strokeWidth={1} className="text-gray-300" />
          <p className="text-sm text-gray-400">{signInPrompt}</p>
          <button
            onClick={openLoginModal}
            className="px-10 py-4 text-white text-xs tracking-[0.2em] uppercase focus-visible:outline-none bg-black rounded-none font-bold"
          >
            {signInCta}
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const activeLabel = NAV_ITEMS.find(n => n.key === activeSection)?.label ?? '';

  const renderSection = () => {
    if (sectionLoading) {
      switch (activeSection) {
        case 'my-data':       return <MyDataSkeleton />;
        case 'my-orders':     return <MyOrdersSkeleton />;
        case 'my-bonuses':    return <BonusesSkeleton />;
        case 'service':       return <ServiceSkeleton />;
        case 'history':       return <HistorySkeleton />;
        case 'wishlist':      return <WishlistSkeleton />;
        case 'waiting-list':  return <WaitingListSkeleton />;
        case 'feedback':      return <FeedbackSkeleton />;
        case 'subscriptions': return <SubscriptionsSkeleton />;
      }
    }
    switch (activeSection) {
      case 'my-data':       return <MyDataSection />;
      case 'my-orders':     return <MyOrdersSection />;
      case 'my-bonuses':    return <BonusesSection />;
      case 'wishlist':      return <WishlistSection />;
      case 'subscriptions': return <SubscriptionsSection />;
      case 'history':       return <HistorySection />;
      case 'service':       return <ServiceMaintenanceSection />;
      case 'waiting-list':  return <WaitingListSection />;
      case 'feedback':      return <FeedbackSection />;
      default:              return null;
    }
  };

  return (
    <div className="min-h-screen bg-white font-[Inter,sans-serif]">
      <Header />

      <main id="main-content" className="max-w-screen-xl mx-auto px-4 lg:px-8 py-8 pb-20">
        {/* Page heading */}
        <div className="flex items-center justify-between mb-8 border-b border-[#e5e7eb] pb-5">
          <div>
            <p className="text-xs text-gray-400 tracking-widest uppercase mb-0.5">{welcomeBack}</p>
            <h1 className="text-2xl tracking-[0.12em] uppercase font-bold">{user.firstName}</h1>
          </div>
          <button
            onClick={() => { logout(); router.push('/'); }}
            className="flex items-center gap-2 text-xs tracking-wide uppercase focus-visible:outline-none hover:opacity-70 transition-opacity font-semibold"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">{signOut}</span>
          </button>
        </div>

        {/* Mobile nav toggle */}
        <button
          onClick={() => setMobileNavOpen(o => !o)}
          className="lg:hidden w-full flex items-center justify-between px-4 py-3 mb-4 focus-visible:outline-none border border-[#e5e7eb] rounded-none"
        >
          <span className="text-sm tracking-wide font-semibold">{activeLabel}</span>
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${mobileNavOpen ? 'rotate-180' : 'rotate-0'}`}
          />
        </button>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Sidebar ── */}
          <aside className={`lg:w-60 flex-shrink-0 ${mobileNavOpen ? 'block' : 'hidden lg:block'}`}>
            <nav className="sticky top-24">
              {NAV_ITEMS.map((item, idx) => {
                const active = activeSection === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleSectionChange(item.key)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left text-sm transition-all focus-visible:outline-none border-l-[3px] ${
                      active
                        ? 'border-l-black bg-[#f9f9f9] text-black font-bold'
                        : 'border-l-transparent bg-white text-[#555] font-normal'
                    } ${idx < NAV_ITEMS.length - 1 ? 'border-b border-b-[#f0f0f0]' : ''}`}
                  >
                    <span className={`transition-colors duration-150 ${active ? 'text-black' : 'text-gray-400'}`}>
                      {item.icon}
                    </span>
                    {item.label}
                    {active && <ChevronRight size={12} className="ml-auto" />}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* ── Main Panel ── */}
          <div className="flex-1 min-w-0">
            {renderSection()}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
