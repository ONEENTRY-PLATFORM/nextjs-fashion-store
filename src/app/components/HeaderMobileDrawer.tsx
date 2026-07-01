'use client'
import { ChevronDown, X, User, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import logoImage from '../../assets/kekimoro-logo-black.png';
import { SUB_CATEGORIES, MEGA_DATA, type Gender } from '../data/categories';
import {
  LOGO_ALT, SUPPORT_PHONE, GENDER_NAV_HREFS,
  MOBILE_FOOTER_LINKS, HEADER_ARIA_LABELS,
} from '../data/headerConfig';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] lg:hidden"
      style={{ '--accent': accentColor } as React.CSSProperties}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-80 bg-white flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <Image src={logoImage} alt={LOGO_ALT} width={128} height={28} className="object-contain" priority />
          <button onClick={onClose} className="p-1" aria-label={HEADER_ARIA_LABELS.closeMenu}>
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
              className={`flex-1 py-3 text-sm tracking-widest uppercase font-medium transition-colors ${
                mobileGender === g ? 'bg-[var(--accent)] text-white' : 'bg-white text-black'
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
            const sections = hasDropdown ? MEGA_DATA[mobileGender][key] : null;
            return (
              <div key={cat} className="border-b border-gray-100">
                <button
                  onClick={() => hasDropdown
                    ? setMobileExpandedCat(mobileExpandedCat === key ? null : key)
                    : undefined
                  }
                  className={`w-full flex items-center justify-between px-4 py-4 text-sm tracking-wider uppercase border-l-[3px] ${
                    urlSubCat === key
                      ? 'text-[var(--accent)] font-bold border-[var(--accent)]'
                      : 'font-medium border-transparent'
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
                    {sections.map((section) => (
                      <div key={section.title} className="px-4 mb-4">
                        <p className="text-xs tracking-widest uppercase mb-2 text-[var(--accent)]">
                          {section.title}
                        </p>
                        <ul className="space-y-1">
                          {section.items.map((item) => (
                            <li key={item}>
                              <Link
                                href={getNavHref(mobileGender, key, item)}
                                onClick={onClose}
                                className="text-sm text-gray-600 block py-1 hover:text-black transition-colors"
                              >
                                {item}
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
        <div className="p-4 border-t border-gray-200 space-y-4">
          {MOBILE_FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} onClick={onClose} className="flex items-center gap-2 text-sm">
              {link.iconType === 'user' ? <User size={16} /> : <MapPin size={16} />}
              {link.label}
            </Link>
          ))}
          <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`} className="flex items-center gap-2 text-sm">
            <Phone size={16} /> {SUPPORT_PHONE}
          </a>
        </div>
      </div>
    </div>
  );
}
