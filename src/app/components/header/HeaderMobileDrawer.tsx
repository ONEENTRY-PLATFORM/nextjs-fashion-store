'use client';
import { ChevronDown, MapPin, Phone, User, X } from 'lucide-react';
import Image from 'next/image';

import { type Gender, SUB_CATEGORIES } from '@/app/data/categories';
import { GENDER_NAV_HREFS, LOGO_ALT, MOBILE_FOOTER_LINKS, SUPPORT_PHONE } from '@/app/data/headerConfig';
import logoImage from '@/assets/kekimoro-logo-black.png';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { useT } from '@/lib/oneentry/labels/DictContext';
import { adaptHeaderMenuToMega } from '@/lib/oneentry/menus/adapt-header';
import { useHeaderMenu } from '@/lib/oneentry/menus/HeaderMenuContext';

interface HeaderMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mobileGender: Gender;
  onMobileGenderChange: (g: Gender) => void;
  mobileExpandedCat: string | null;
  setMobileExpandedCat: (cat: string | null) => void;
  accentColor: string;
  urlSubCat: string | null;
  getNavHref: (gender: Gender, subcat: string, item?: string) => string;
}

export function HeaderMobileDrawer({
  isOpen,
  onClose,
  mobileGender,
  onMobileGenderChange,
  mobileExpandedCat,
  setMobileExpandedCat,
  accentColor,
  urlSubCat,
  getNavHref,
}: HeaderMobileDrawerProps) {
  // Header copy from the OE `header` set; constants are the offline fallback.
  const lLogoAlt = useT('header_logo_alt', LOGO_ALT);
  const lPhone = useT('header_support_phone', SUPPORT_PHONE);
  const aCloseMenu = useT('header_aria_close_menu', 'Close menu');

  const router = useRouter();
  const cmsHeaderMenu = useHeaderMenu();
  const mega = adaptHeaderMenuToMega(cmsHeaderMenu);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 lg:hidden" style={{ '--accent': accentColor } as React.CSSProperties}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 flex w-80 flex-col overflow-y-auto bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <Image src={logoImage} alt={lLogoAlt} width={128} height={28} className="object-contain" priority />
          <button onClick={onClose} className="p-1" aria-label={aCloseMenu}>
            <X size={22} />
          </button>
        </div>

        {/* Gender Switch */}
        <div className="flex border-b border-gray-200">
          {(['women', 'men'] as Gender[]).map((g) => (
            <button
              key={g}
              onClick={() => {
                onMobileGenderChange(g);
                router.push(GENDER_NAV_HREFS[g]);
                onClose();
              }}
              className={`flex-1 py-3 text-sm font-medium tracking-widest uppercase transition-colors ${
                mobileGender === g ? 'bg-accent text-white' : 'bg-white text-black'
              }`}
            >
              {g.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Categories */}
        <div className="flex-1 overflow-y-auto">
          {SUB_CATEGORIES.map((cat) => {
            const key = cat.toLowerCase();
            const hasDropdown = ['shoes', 'clothing', 'bags', 'accessories'].includes(key);
            const sections =
              hasDropdown && mega ? mega[mobileGender][key as 'shoes' | 'clothing' | 'bags' | 'accessories'] : null;
            return (
              <div key={cat} className="border-b border-gray-100">
                <button
                  onClick={() =>
                    hasDropdown ? setMobileExpandedCat(mobileExpandedCat === key ? null : key) : undefined
                  }
                  className={`flex w-full items-center justify-between border-l-[3px] p-4 text-sm tracking-wider uppercase ${
                    urlSubCat === key ? 'border-accent font-bold text-accent' : 'border-transparent font-medium'
                  }`}
                >
                  {cat}
                  {hasDropdown && (
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${
                        mobileExpandedCat === key ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  )}
                </button>
                {mobileExpandedCat === key && sections && (
                  <div className="pb-4">
                    {sections.map((section, idx) => (
                      <div key={`${section.title}-${idx}`} className="mb-4 px-4">
                        <p className="mb-2 text-xs tracking-widest text-accent uppercase">{section.title}</p>
                        <ul className="space-y-1">
                          {section.items.map((item) => (
                            <li key={item.pageUrl || item.label}>
                              <Link
                                href={getNavHref(mobileGender, key, item.pageUrl || item.label)}
                                onClick={onClose}
                                className="block py-1 text-sm text-gray-600 transition-colors hover:text-black"
                              >
                                {item.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="space-y-4 border-t border-gray-200 p-4">
          {MOBILE_FOOTER_LINKS.map((link) => (
            <MobileFooterLinkRow key={link.href} link={link} onClose={onClose} />
          ))}
          <a href={`tel:${lPhone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-sm">
            <Phone size={16} /> {lPhone}
          </a>
        </div>
      </div>
    </div>
  );
}

/** One drawer footer link. */
function MobileFooterLinkRow({ link, onClose }: { link: (typeof MOBILE_FOOTER_LINKS)[number]; onClose: () => void }) {
  const label = useT(link.labelKey, link.fallbackLabel);
  return (
    <Link href={link.href} onClick={onClose} className="flex items-center gap-2 text-sm">
      {link.iconType === 'user' ? <User size={16} /> : <MapPin size={16} />}
      {label}
    </Link>
  );
}
