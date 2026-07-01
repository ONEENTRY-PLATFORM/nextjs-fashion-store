'use client'
import { FOOTER_LINKS, PAYMENT_METHOD_NAMES, SOCIAL_LINKS, SUPPORT_ITEMS, BOTTOM_LINKS, COMPANY_INFO, type FooterLink } from '../data/footerConfig';
import { FOOTER_ARIA, FOOTER_LABELS as FL, FOOTER_DYNAMIC_ARIA } from '../data/commonLabels';
import { LOGO_ALT } from '../data/headerConfig';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import logoImage from '../../assets/kekimoro-logo-white.png';
import { NewsletterForm } from './NewsletterForm';
import { useFooterMenu } from '../../lib/oneentry/menus/FooterMenuContext';
import {
  QuestionMarkCircleIcon,
  DevicePhoneMobileIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
const PAYMENT_ICON_SRC: Record<string, string> = {
  Visa: '/icons/payment/visa.svg',
  Mastercard: '/icons/payment/mastercard.svg',
  Amex: '/icons/payment/amex.svg',
  'Apple Pay': '/icons/payment/apple-pay.svg',
  'Google Pay': '/icons/payment/google-pay.svg',
  PayPal: '/icons/payment/paypal.svg',
  Klarna: '/icons/payment/klarna.svg',
  Maestro: '/icons/payment/maestro.svg',
};

const SOCIAL_ICON_SRC: Record<string, string> = {
  TikTok: '/icons/social/tiktok.svg',
  Facebook: '/icons/social/facebook.svg',
  Instagram: '/icons/social/instagram.svg',
  YouTube: '/icons/social/youtube.svg',
  Pinterest: '/icons/social/pinterest.svg',
};


export function Footer() {
  const cmsFooterMenu = useFooterMenu();
  const bottomLinks: { key: string; label: string; href: string }[] = cmsFooterMenu.length > 0
    ? cmsFooterMenu
        .map((p) => ({
          key: String(p.id),
          label: p.menuTitle || p.title,
          href: `/info/${p.pageUrl}`,
        }))
        .filter((it) => it.label.length > 0)
    : BOTTOM_LINKS.map((l) => ({ key: l.href, label: l.label, href: l.href }));
  return (
    <footer className="bg-black text-white">
      {/* Support Bar */}
      <div className="border-b border-white/10">
        <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {(() => {
            const SUPPORT_ICONS = [
              <QuestionMarkCircleIcon className="w-6 h-6" />,
              <DevicePhoneMobileIcon className="w-6 h-6" />,
              <ChatBubbleLeftRightIcon className="w-6 h-6" />,
              <EnvelopeIcon className="w-6 h-6" />,
            ];
            return SUPPORT_ITEMS.map((item, i) => (
              <div key={item.title} className="text-center">
                <div className="flex justify-center mb-2 text-white">{SUPPORT_ICONS[i]}</div>
                <p className="text-xs tracking-widest uppercase font-medium mb-1">{item.title}</p>
                <p className="text-xs text-white/50">{item.desc}</p>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 lg:col-span-2">
            <Image src={logoImage} alt={LOGO_ALT} width={183} height={40} className="object-contain mb-4" />
            <p className="text-xs text-white/50 mb-4 max-w-xs leading-relaxed">
              {COMPANY_INFO.description}
            </p>
            <p className="text-xs text-white/40 mb-2">{FL.customerSupport}</p>
            <a href={`tel:${COMPANY_INFO.phone.replace(/\s/g, '')}`} className="text-sm font-medium hover:text-white/70 transition-colors">
              {COMPANY_INFO.phone}
            </a>
            <p className="text-xs text-white/30 mt-4">
              {COMPANY_INFO.copyright}
            </p>
          </div>

          {/* Link Columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <nav key={title} aria-label={title}>
              <h4 className="text-xs tracking-widest uppercase font-medium mb-4 text-white/80">
                {title}
              </h4>
              <ul className="space-y-2">
                {links.map((link: FooterLink) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-xs text-white/50 hover:text-white transition-colors block">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/* Newsletter */}
      <div className="border-t border-white/10">
        <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-6">
          <p className="text-xs tracking-widest uppercase text-white/40 mb-4 text-center">Subscribe to new drops</p>
          <NewsletterForm />
        </div>
      </div>

      {/* Payment Methods */}
      <div className="border-t border-white/10">
        <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-6">
          <p className="text-xs tracking-widest uppercase text-white/40 mb-4 text-center">{FL.acceptedPaymentMethods}</p>
          <div className="flex flex-wrap justify-center gap-3">
            {PAYMENT_METHOD_NAMES.map((name) => {
              const src = PAYMENT_ICON_SRC[name];
              return (
                <div key={name} className="bg-white/5 hover:bg-white/10 transition-colors px-2 py-1 flex items-center justify-center min-w-16">
                  {src ? (
                    <Image src={src} alt={name} width={60} height={40} className="h-6 w-auto" unoptimized />
                  ) : (
                    <span className="text-xs font-bold">{name}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Social Media */}
      <div className="border-t border-white/10">
        <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-6">
          <p className="text-xs tracking-widest uppercase text-white/40 mb-4 text-center">{FL.followUs}</p>
          <div className="flex flex-wrap justify-center gap-4">
            {SOCIAL_LINKS.map(({ name, href }) => {
              const src = SOCIAL_ICON_SRC[name];
              return (
                <a
                  key={name}
                  href={href}
                  aria-label={FOOTER_DYNAMIC_ARIA.followOn(name)}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white active:bg-gray-200 transition-all duration-200 group"
                >
                  {src ? (
                    <Image src={src} alt={name} width={20} height={20} className="w-5 h-5 group-hover:invert" unoptimized />
                  ) : null}
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <nav aria-label={FOOTER_ARIA.legalLinks} className="max-w-screen-xl mx-auto px-4 lg:px-8 py-4 flex flex-wrap items-center justify-center gap-4">
          {bottomLinks.map((link, i, arr) => (
            <span key={link.key} className="flex items-center gap-4">
              <Link href={link.href} className="text-xs text-white/40 hover:text-white/70 transition-colors">{link.label}</Link>
              {i < arr.length - 1 && <span className="text-white/20 text-xs">|</span>}
            </span>
          ))}
        </nav>
      </div>
    </footer>
  );
}